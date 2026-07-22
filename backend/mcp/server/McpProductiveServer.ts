/**
 * MCP Productive Server — policy → resilience → execute → audit.
 */

import { randomUUID } from "node:crypto";
import {
  getMcpCircuitFailureThreshold,
  getMcpCircuitResetMs,
  getMcpDefaultTimeoutMs,
  getMcpMaxRetries,
  getMcpRateLimitPerMinute,
  getMcpApprovalTtlHours,
  isMcpProductiveEnabled,
  getMcpConfig,
} from "../config";
import { McpAuditService } from "../audit/McpAuditService";
import { McpApprovalBridge } from "../approvals/McpApprovalBridge";
import { evaluatePolicy, validateOutput } from "../policy/PolicyEngine";
import { getToolRegistry, resetToolRegistryForTests, type ToolRegistry } from "../registry/ToolRegistry";
import { getTenantCircuit, resetAllCircuitsForTests } from "../resilience/CircuitBreaker";
import {
  getIdempotentResult,
  putIdempotentResult,
  resetIdempotencyForTests,
} from "../resilience/IdempotencyStore";
import { checkRateLimit, resetRateLimitsForTests } from "../resilience/RateLimiter";
import { productiveTools } from "../tools/productiveTools";
import type {
  McpCallContext,
  McpHealthStatus,
  McpInvokeRequest,
  McpInvokeResult,
  McpToolDef,
} from "../types";
import { MCP_PROTOCOL_VERSION, MCP_SERVER_VERSION } from "../types";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";

function withTimeout<T>(p: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("cancelled"));
      return;
    }
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("cancelled"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => {
        clearTimeout(t);
        signal?.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        signal?.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

export class McpProductiveServer {
  private readonly registry: ToolRegistry;
  private readonly audit: McpAuditService;
  private readonly approvals: McpApprovalBridge;
  private bootstrapped = false;

  constructor(private readonly db?: SaasPostgresPort) {
    this.registry = getToolRegistry();
    this.audit = new McpAuditService(db);
    this.approvals = new McpApprovalBridge(db);
  }

  bootstrap(): void {
    if (this.bootstrapped && this.registry.count() > 0) return;
    if (this.registry.count() === 0) {
      for (const t of productiveTools) this.registry.register(t);
    }
    this.bootstrapped = true;
  }

  listTools(): McpToolDef[] {
    this.bootstrap();
    return this.registry.list();
  }

  health(): McpHealthStatus {
    this.bootstrap();
    const enabled = isMcpProductiveEnabled();
    return {
      ok: enabled,
      enabled,
      version: MCP_SERVER_VERSION,
      protocolVersion: MCP_PROTOCOL_VERSION,
      toolCount: this.registry.count(),
      circuitOpen: false,
      pendingApprovalsHint: "GET /api/saas/private-ai/approvals",
      message: enabled
        ? "MCP Productivo ready"
        : "MCP disabled — set NELVYON_MCP_PRODUCTIVE_ENABLED=1",
    };
  }

  config() {
    return getMcpConfig();
  }

  async invoke(req: McpInvokeRequest, signal?: AbortSignal): Promise<McpInvokeResult> {
    this.bootstrap();
    const start = Date.now();
    const toolCallId = randomUUID();
    const cfg = getMcpConfig();

    const base = (
      partial: Partial<McpInvokeResult> & Pick<McpInvokeResult, "decision" | "ok" | "risk" | "toolName">,
    ): McpInvokeResult => ({
      toolCallId,
      toolName: partial.toolName,
      decision: partial.decision,
      ok: partial.ok,
      result: partial.result,
      error: partial.error,
      errorCode: partial.errorCode,
      risk: partial.risk,
      durationMs: Date.now() - start,
      approvalId: partial.approvalId,
      approvalRequired: partial.approvalRequired ?? false,
      retries: partial.retries ?? 0,
      circuitOpen: partial.circuitOpen ?? false,
      rateLimited: partial.rateLimited ?? false,
      idempotentReplay: partial.idempotentReplay ?? false,
      auditId: partial.auditId,
      sanitizedArgs: partial.sanitizedArgs ?? {},
    });

    if (!cfg.enabled) {
      return base({
        toolName: req.toolName,
        decision: "denied",
        ok: false,
        risk: "high",
        error: "mcp_disabled",
        errorCode: "feature_flag_off",
        sanitizedArgs: {},
      });
    }

    if (req.ctx.idempotencyKey) {
      const replay = getIdempotentResult(req.ctx.tenantId, req.ctx.idempotencyKey);
      if (replay) return { ...replay, toolCallId, durationMs: Date.now() - start };
    }

    const rate = checkRateLimit(req.ctx.tenantId, cfg.rateLimitPerMin);
    if (!rate.allowed) {
      return base({
        toolName: req.toolName,
        decision: "denied",
        ok: false,
        risk: "medium",
        error: "rate_limited",
        errorCode: "rate_limited",
        rateLimited: true,
        sanitizedArgs: {},
      });
    }

    const circuit = getTenantCircuit(
      req.ctx.tenantId,
      getMcpCircuitFailureThreshold(),
      getMcpCircuitResetMs(),
    );
    if (circuit.isOpen()) {
      return base({
        toolName: req.toolName,
        decision: "denied",
        ok: false,
        risk: "high",
        error: "circuit_open",
        errorCode: "circuit_open",
        circuitOpen: true,
        sanitizedArgs: {},
      });
    }

    const tool = this.registry.get(req.toolName);
    if (!tool) {
      return base({
        toolName: req.toolName,
        decision: "denied",
        ok: false,
        risk: "medium",
        error: "unknown_tool",
        errorCode: "unknown_tool",
        sanitizedArgs: {},
      });
    }

    const policy = evaluatePolicy(tool, req.args ?? {}, req.ctx);
    if (policy.decision === "denied") {
      const result = base({
        toolName: req.toolName,
        decision: "denied",
        ok: false,
        risk: policy.risk,
        error: policy.reason,
        errorCode: policy.blockedCategory ?? policy.reason,
        sanitizedArgs: policy.sanitizedArgs,
      });
      await this.persistAudit(result, req.ctx);
      return result;
    }

    if (policy.decision === "approval_required") {
      const actionId = randomUUID();
      const expiresAt = new Date(
        Date.now() + getMcpApprovalTtlHours() * 3600_000,
      ).toISOString();
      let approvalId = "";
      try {
        approvalId = await this.approvals.queue({
          actionId,
          tenantId: req.ctx.tenantId,
          userId: req.ctx.userId,
          agentId: req.ctx.agentId,
          toolName: req.toolName,
          args: policy.sanitizedArgs,
          reason: policy.reason,
          risk: policy.risk,
          expiresAt,
          requestId: req.ctx.requestId,
          traceId: req.ctx.traceId,
        });
      } catch {
        approvalId = actionId;
      }
      const result = base({
        toolName: req.toolName,
        decision: "approval_required",
        ok: false,
        risk: policy.risk,
        error: policy.reason,
        errorCode: "approval_required",
        approvalId,
        approvalRequired: true,
        sanitizedArgs: policy.sanitizedArgs,
      });
      await this.persistAudit(result, req.ctx);
      if (req.ctx.idempotencyKey) putIdempotentResult(req.ctx.tenantId, req.ctx.idempotencyKey, result);
      return result;
    }

    if (req.dryRun) {
      return base({
        toolName: req.toolName,
        decision: "allowed",
        ok: true,
        risk: policy.risk,
        result: { dryRun: true },
        sanitizedArgs: policy.sanitizedArgs,
      });
    }

    const timeoutMs = req.timeoutMs ?? getMcpDefaultTimeoutMs();
    const maxRetries = getMcpMaxRetries();
    let retries = 0;
    let lastError: string | undefined;

    while (retries <= maxRetries) {
      try {
        if (signal?.aborted) throw new Error("cancelled");
        const raw = await withTimeout(tool.handler(req.args ?? {}, req.ctx), timeoutMs, signal);
        const outCheck = validateOutput(raw);
        if (!outCheck.ok) {
          circuit.recordFailure();
          const result = base({
            toolName: req.toolName,
            decision: "denied",
            ok: false,
            risk: "critical",
            error: outCheck.reason,
            errorCode: "output_secret_leak",
            retries,
            sanitizedArgs: policy.sanitizedArgs,
          });
          await this.persistAudit(result, req.ctx);
          return result;
        }
        circuit.recordSuccess();
        const result = base({
          toolName: req.toolName,
          decision: "allowed",
          ok: true,
          risk: policy.risk,
          result: raw,
          retries,
          sanitizedArgs: policy.sanitizedArgs,
        });
        await this.persistAudit(result, req.ctx);
        if (req.ctx.idempotencyKey) putIdempotentResult(req.ctx.tenantId, req.ctx.idempotencyKey, result);
        return result;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (lastError === "cancelled" || lastError === "timeout") break;
        retries += 1;
        if (retries > maxRetries) break;
      }
    }

    circuit.recordFailure();
    const result = base({
      toolName: req.toolName,
      decision: "denied",
      ok: false,
      risk: policy.risk,
      error: lastError ?? "execution_failed",
      errorCode: lastError === "timeout" ? "timeout" : lastError === "cancelled" ? "cancelled" : "execution_failed",
      retries: Math.max(0, retries - 1),
      sanitizedArgs: policy.sanitizedArgs,
    });
    await this.persistAudit(result, req.ctx);
    return result;
  }

  private async persistAudit(result: McpInvokeResult, ctx: McpCallContext): Promise<void> {
    const record = this.audit.buildRecord(result, ctx);
    const id = await this.audit.persist(record);
    result.auditId = id;
  }
}

let _server: McpProductiveServer | undefined;
export function getMcpProductiveServer(db?: SaasPostgresPort): McpProductiveServer {
  // Prefer explicit db; for tests/offline use in-memory approvals (no DbClient).
  _server ??= new McpProductiveServer(db);
  _server.bootstrap();
  return _server;
}
export function resetMcpProductiveServerForTests(): void {
  _server = undefined;
  resetToolRegistryForTests();
  resetAllCircuitsForTests();
  resetRateLimitsForTests();
  resetIdempotencyForTests();
}
