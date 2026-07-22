import { DbClient } from "../db/DbClient";
import {
  executeTask,
  getRouterHealth,
  routeTask,
  type RouterDecision,
  type RouterHealth,
  type RouterTaskInput,
  type RouterTaskResult,
} from "../local-ai/router";
import { PrivateAiOrchestrator } from "../private-ai/orchestrator/PrivateAiOrchestrator";
import { PrivateAiApprovalService } from "../private-ai/approvals/PrivateAiApprovalService";
import { PrivateAiAuditService } from "../private-ai/audit/PrivateAiAuditService";
import { NelvyonRagStore } from "../private-ai/rag/NelvyonRagStore";
import { listPrivateAgents, PILOT_AGENT_ID } from "../private-ai/nelvyonAgentRegistry";
import type { PrivateAiSettings } from "../private-ai/types";
import type { SaasPostgresPort } from "./SaasOnboardingService";

/** Inference task body without tenant (injected from SaaS context). */
export type PrivateAiInferenceTaskInput = Omit<RouterTaskInput, "tenantId">;

export type PrivateAiExecuteInferenceInput = PrivateAiInferenceTaskInput & {
  tenantId: string;
  userId?: string;
};

export class SaasPrivateAiService {
  private readonly audit: PrivateAiAuditService;
  private readonly approvals: PrivateAiApprovalService;
  private readonly rag: NelvyonRagStore;

  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {
    this.approvals = new PrivateAiApprovalService(db);
    this.audit = new PrivateAiAuditService(db);
    this.rag = new NelvyonRagStore(db);
    this.orchestrator = new PrivateAiOrchestrator(db, {
      audit: this.audit,
      approvals: this.approvals,
      rag: this.rag,
    });
  }

  private readonly orchestrator: PrivateAiOrchestrator;

  listAgents() {
    return this.orchestrator.listAgents();
  }

  async getPlatformStatus(tenantId: string) {
    const settings = await this.getSettings(tenantId);
    return this.orchestrator.platformStatus(settings);
  }

  async getSettings(tenantId: string): Promise<PrivateAiSettings> {
    await this.db.query(
      `INSERT INTO saas_private_ai_settings (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId],
    );
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT tenant_id, ai_mode, private_ai_only, ollama_base_url, ollama_model,
              openai_model, anthropic_model, default_agent_id
       FROM saas_private_ai_settings WHERE tenant_id = $1`,
      [tenantId],
    );
    const r = rows[0];
    let aiMode = (r?.ai_mode as PrivateAiSettings["aiMode"]) ?? "unconfigured";
    if (aiMode === "mock") aiMode = "stub";
    return {
      tenantId,
      aiMode,
      privateAiOnly: Boolean(r?.private_ai_only),
      ollamaBaseUrl: r?.ollama_base_url != null ? String(r.ollama_base_url) : null,
      ollamaModel: r?.ollama_model != null ? String(r.ollama_model) : null,
      openaiModel: r?.openai_model != null ? String(r.openai_model) : null,
      anthropicModel: r?.anthropic_model != null ? String(r.anthropic_model) : null,
      defaultAgentId: r?.default_agent_id != null ? String(r.default_agent_id) : null,
    };
  }

  async updateSettings(
    tenantId: string,
    patch: Partial<Omit<PrivateAiSettings, "tenantId">>,
  ): Promise<PrivateAiSettings> {
    const current = await this.getSettings(tenantId);
    const next = { ...current, ...patch, tenantId };
    await this.db.query(
      `UPDATE saas_private_ai_settings SET
         ai_mode = $2, private_ai_only = $3, ollama_base_url = $4, ollama_model = $5,
         openai_model = $6, anthropic_model = $7, default_agent_id = $8, updated_at = NOW()
       WHERE tenant_id = $1`,
      [
        tenantId,
        next.aiMode,
        next.privateAiOnly,
        next.ollamaBaseUrl,
        next.ollamaModel,
        next.openaiModel,
        next.anthropicModel,
        next.defaultAgentId,
      ],
    );
    return next;
  }

  async listApprovals(tenantId: string, status = "pending") {
    return this.approvals.list(tenantId, status);
  }

  async listAudit(tenantId: string, limit = 25) {
    return this.audit.listRecent(tenantId, limit);
  }

  async reviewApproval(
    tenantId: string,
    approvalId: string,
    reviewerId: string,
    decision: "approved" | "rejected",
    note?: string,
  ): Promise<boolean> {
    return this.approvals.review(tenantId, approvalId, reviewerId, decision, note);
  }

  async runAgent(input: Parameters<PrivateAiOrchestrator["runAgent"]>[0]) {
    const settings = await this.getSettings(input.tenantId);
    return this.orchestrator.runAgent(input, settings);
  }

  /** Certified Model Router — deterministic route decision (no egress). */
  routeInference(tenantId: string, taskInput: PrivateAiInferenceTaskInput): RouterDecision {
    return routeTask({ tenantId, ...taskInput });
  }

  /** Certified Model Router — execute locally; audit on completion. */
  async executeInference(input: PrivateAiExecuteInferenceInput): Promise<RouterTaskResult> {
    const { tenantId, userId, ...taskInput } = input;
    const result = await executeTask({ tenantId, ...taskInput });
    try {
      await this.audit.log({
        tenantId,
        userId,
        agentId: taskInput.agentId ?? "router_inference",
        action: "router_execute",
        provider: "local_router",
        model: result.meta?.finalModel ?? "unknown",
        prompt: taskInput.query,
        userInput: taskInput.query,
        output: result.content ?? "",
        metadata: {
          status: result.status,
          blocked: result.blocked,
          taskId: result.taskId,
          requiresApproval: result.requiresApproval,
          fallbackUsed: result.meta?.fallbackUsed ?? false,
        },
      });
    } catch {
      // Audit must not fail the inference path; fail-open for observability only.
    }
    return result;
  }

  async getRouterHealthStatus(): Promise<RouterHealth> {
    return getRouterHealth();
  }
}

let _svc: SaasPrivateAiService | undefined;
export function getSaasPrivateAiService(): SaasPrivateAiService {
  _svc ??= new SaasPrivateAiService();
  return _svc;
}
export function resetSaasPrivateAiServiceForTests(): void {
  _svc = undefined;
}

export { listPrivateAgents, PILOT_AGENT_ID };
