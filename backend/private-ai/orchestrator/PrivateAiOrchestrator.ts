import { getAgentPermissionService } from "../agents/AgentPermissionService";
import { getPrivateAgent, listPrivateAgents, PILOT_AGENT_ID } from "../nelvyonAgentRegistry";
import { PrivateAiApprovalService } from "../approvals/PrivateAiApprovalService";
import { PrivateAiAuditService } from "../audit/PrivateAiAuditService";
import { getPrivateAiRouter } from "../core/PrivateAiRouter";
import { getTenantMemoryAdapter } from "../memory/TenantMemoryAdapter";
import { getUnifiedRagStore } from "../rag/UnifiedRagStore";
import type { IRagStore } from "../rag/IRagStore";
import {
  buildAgentContext,
  maybeWriteAgentMemory,
} from "../context/AgentContextEngine";
import { invokeAgentToolViaMcp } from "../tools/invokeAgentTool";
import { getPromptRegistry } from "../../prompt-registry";
import { incPrivateAiMetric } from "../observability/PrivateAiMetrics";
import type {
  AgentRunInput,
  AgentRunResult,
  PrivateAiSettings,
  PrivateAiPlatformStatus,
  SensitiveActionType,
} from "../types";
import { SaasAutonomyService } from "../../saas/SaasAutonomyService";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";

export class PrivateAiOrchestrator {
  private readonly permissions = getAgentPermissionService();
  private readonly audit: PrivateAiAuditService;
  private readonly approvals: PrivateAiApprovalService;
  private readonly memory = getTenantMemoryAdapter();
  private readonly rag: IRagStore;
  private readonly router = getPrivateAiRouter();

  constructor(
    private readonly db: SaasPostgresPort,
    deps?: {
      audit?: PrivateAiAuditService;
      approvals?: PrivateAiApprovalService;
      rag?: IRagStore;
    },
  ) {
    this.audit = deps?.audit ?? new PrivateAiAuditService(db);
    this.approvals = deps?.approvals ?? new PrivateAiApprovalService(db);
    this.rag = deps?.rag ?? getUnifiedRagStore(db);
  }

  listAgents() {
    return listPrivateAgents().map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      objective: a.objective,
      allowedTools: a.allowedTools,
      limits: a.limits,
      approvalRequiredActions: a.approvalRequiredActions,
      forbiddenActions: a.forbiddenActions,
      pilot: a.id === PILOT_AGENT_ID,
    }));
  }

  async platformStatus(settings: PrivateAiSettings): Promise<PrivateAiPlatformStatus> {
    const status = await this.router.platformStatus(settings);
    const ragCount = await this.rag.countPlatform().catch(() => 0);
    const { getOpenClawBridge } = await import("../adapters/OpenClawBridge");
    const { isSharedMemoryEnabled, getSharedMemoryConfig } = await import("../../shared-memory");
    const memCfg = getSharedMemoryConfig();
    return {
      ...status,
      ragIngest: ragCount > 0 ? "ready" : "not_started",
      openClawBridge: getOpenClawBridge().status(),
      sharedMemoryEnabled: isSharedMemoryEnabled(),
      sharedMemoryContractVersion: memCfg.contractVersion,
    };
  }

  async runAgent(input: AgentRunInput, settings: PrivateAiSettings): Promise<AgentRunResult> {
    const agent = getPrivateAgent(input.agentId);
    if (!agent) throw new Error(`Unknown private AI agent: ${input.agentId}`);

    if (input.toolId) {
      const toolCheck = this.permissions.checkTool(agent, input.toolId);
      if (!toolCheck.allowed) throw new Error(toolCheck.reason ?? "Tool denied");
    }

    const actionCheck = this.permissions.checkAction(agent, input.action);
    if (actionCheck.blocked) throw new Error(actionCheck.reason ?? "Action blocked");

    const autonomy = new SaasAutonomyService(this.db);
    const autonomyMode = await autonomy.getMode(input.tenantId);

    if (actionCheck.needsApproval && input.action) {
      const approvalId = await this.approvals.queue({
        tenantId: input.tenantId,
        agentId: agent.id,
        actionType: input.action as SensitiveActionType,
        payload: { input: input.input, toolId: input.toolId },
        requestedBy: input.userId,
      });
      incPrivateAiMetric("approvalsQueued");
      const msg =
        `Acción sensible «${input.action}» encolada para aprobación humana (ID: ${approvalId}). ` +
        `El agente no ejecutará esta acción hasta revisión.`;
      const auditId = await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId ?? "system",
        agentId: agent.id,
        action: input.action,
        provider: "approval_queue",
        model: "n/a",
        prompt: agent.systemPrompt,
        userInput: input.input,
        output: msg,
        metadata: { approvalId, queued: true },
      });
      return {
        agentId: agent.id,
        output: msg,
        provider: "approval_queue",
        model: "n/a",
        mock: false,
        configured: true,
        ready: false,
        auditId,
        approvalRequired: true,
        approvalId,
      };
    }

    const autoGate = autonomy.gateAgentAuto(autonomyMode);
    if (!agent.limits.canAutoExecute && input.action && input.action !== "advise") {
      if (!autoGate.allowed) throw new Error(autoGate.reason ?? "Autonomy gate blocked agent action");
    }

    // Optional OpenClaw delegation when authorized + URL (fail-closed to Nelvyon path)
    const openClawDelegate =
      (process.env.NELVYON_OPENCLAW_DELEGATE ?? "0") === "1" ||
      (process.env.NELVYON_OPENCLAW_DELEGATE ?? "").toLowerCase() === "true";
    if (openClawDelegate) {
      try {
        const { getOpenClawBridge } = await import("../adapters/OpenClawBridge");
        const bridge = getOpenClawBridge();
        if (bridge.status() !== "disabled") {
          const oc = await bridge.dispatch({
            agentId: agent.id,
            input: input.input,
            tenantId: input.tenantId,
            tools: agent.allowedTools as string[],
          });
          if (oc.ok && oc.output) {
            const auditId = await this.audit.log({
              tenantId: input.tenantId,
              userId: input.userId ?? "system",
              agentId: agent.id,
              action: input.action ?? "advise",
              provider: "openclaw_bridge",
              model: "openclaw",
              prompt: agent.systemPrompt,
              userInput: input.input,
              output: oc.output,
              metadata: { openClaw: true, status: oc.status },
            });
            incPrivateAiMetric("agentRuns");
            return {
              agentId: agent.id,
              output: oc.output,
              provider: "openclaw_bridge",
              model: "openclaw",
              mock: false,
              configured: true,
              ready: true,
              auditId,
            };
          }
        }
      } catch {
        /* fall through to Nelvyon Private AI */
      }
    }

    let toolContext = "";
    if (input.toolId) {
      const toolRes = await invokeAgentToolViaMcp({
        toolId: input.toolId,
        args: { query: input.input, content: input.input, limit: 5 },
        tenantId: input.tenantId,
        userId: input.userId ?? "system",
        agentId: agent.id,
        roles: ["member"],
      });
      if (toolRes.toolName) incPrivateAiMetric("mcpToolCalls");
      if (toolRes.ok && toolRes.result != null) {
        toolContext =
          `\n\nResultado herramienta MCP (${toolRes.toolName}):\n` +
          JSON.stringify(toolRes.result).slice(0, 4000);
      } else if (toolRes.error && toolRes.error !== "mcp_tools_disabled" && toolRes.error !== "tool_not_mapped_to_mcp") {
        toolContext = `\n\nHerramienta ${input.toolId}: ${toolRes.error}`;
      }
    }

    const ctx = await buildAgentContext({
      tenantId: input.tenantId,
      userId: input.userId ?? "system",
      agentId: agent.id,
      query: input.input,
      roles: ["member"],
      allowedTools: agent.allowedTools,
      rag: this.rag,
      memory: this.memory,
      domainHint: undefined, // resolved via agentKnowledgeDomains in buildAgentContext
    });
    if (ctx.meta.sharedMemoryEntries > 0) incPrivateAiMetric("sharedMemoryReads");
    if (ctx.meta.ragChunks > 0) incPrivateAiMetric("ragHits");

    const promptRec = getPromptRegistry().getActive(agent.id, "system");
    const systemBase = promptRec?.body ?? agent.systemPrompt;

    const messages = [
      {
        role: "system" as const,
        content: `Agente: ${agent.id}\n${systemBase}${ctx.systemSuffix}${toolContext}`,
      },
      { role: "user" as const, content: input.input.trim() },
    ];

    try {
      const { result, attempted, fallbackReason } = await this.router.complete(
        {
          messages,
          maxTokens: agent.limits.maxTokens,
          temperature: 0.3,
          routerContext: {
            tenantId: input.tenantId,
            agentId: agent.id,
          },
        },
        settings,
      );

      const memWrite = await maybeWriteAgentMemory({
        tenantId: input.tenantId,
        userId: input.userId ?? "system",
        agentId: agent.id,
        roles: ["owner"],
        allowedTools: agent.allowedTools,
        query: input.input,
        output: result.text,
      });
      if (memWrite.written) incPrivateAiMetric("sharedMemoryWrites");

      incPrivateAiMetric("agentRuns");

      const auditId = await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId ?? "system",
        agentId: agent.id,
        action: input.action ?? "advise",
        provider: result.provider,
        model: result.model,
        prompt: systemBase,
        userInput: input.input,
        output: result.text,
        metadata: {
          mock: result.mock,
          ready: result.ready,
          attempted,
          fallbackReason,
          autonomyMode,
          context: ctx.meta,
          memoryWriteId: memWrite.entryId,
          toolId: input.toolId,
          promptVersion: promptRec?.version,
        },
      });

      return {
        agentId: agent.id,
        output: result.text,
        provider: result.provider,
        model: result.model,
        mock: result.mock,
        configured: result.configured,
        ready: result.ready,
        auditId,
      };
    } catch (e) {
      incPrivateAiMetric("agentErrors");
      throw e;
    }
  }
}
