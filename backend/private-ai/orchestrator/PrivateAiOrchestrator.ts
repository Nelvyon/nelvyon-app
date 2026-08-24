import { getAgentPermissionService } from "../agents/AgentPermissionService";
import { getPrivateAgent, listPrivateAgents, PILOT_AGENT_ID } from "../nelvyonAgentRegistry";
import { PrivateAiApprovalService } from "../approvals/PrivateAiApprovalService";
import { PrivateAiAuditService } from "../audit/PrivateAiAuditService";
import { getPrivateAiRouter } from "../core/PrivateAiRouter";
import { getTenantMemoryAdapter } from "../memory/TenantMemoryAdapter";
import { construirMensajes, type FragmentoRecuperado } from "../contextoRecuperado";
import { NelvyonRagStore } from "../rag/NelvyonRagStore";
import type {
  AgentRunInput,
  AgentRunResult,
  AgentToolId,
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
  private readonly rag: NelvyonRagStore;
  private readonly router = getPrivateAiRouter();

  constructor(
    private readonly db: SaasPostgresPort,
    deps?: {
      audit?: PrivateAiAuditService;
      approvals?: PrivateAiApprovalService;
      rag?: NelvyonRagStore;
    },
  ) {
    this.audit = deps?.audit ?? new PrivateAiAuditService(db);
    this.approvals = deps?.approvals ?? new PrivateAiApprovalService(db);
    this.rag = deps?.rag ?? new NelvyonRagStore(db);
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
    return {
      ...status,
      ragIngest: ragCount > 0 ? "ready" : "not_started",
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
      const msg =
        `Acción sensible «${input.action}» encolada para aprobación humana (ID: ${approvalId}). ` +
        `El agente no ejecutará esta acción hasta revisión.`;
      const auditId = await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId,
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

    // El material recuperado se junta como DATOS y se entrega aparte.
    //
    // Antes se concatenaba dentro del prompt de sistema, que es donde el modelo
    // busca sus reglas: cualquiera capaz de escribir en la memoria del inquilino
    // -subir un PDF, pegar una nota, rellenar un formulario que acabe indexado-
    // podia colar «ignora tus reglas» con el mismo rango que las de NELVYON.
    // Ver `contextoRecuperado.ts`.
    const fragmentos: FragmentoRecuperado[] = [];

    if (agent.allowedTools.includes("rag.search" as AgentToolId)) {
      try {
        const rag = await this.rag.searchPlatform(input.input.slice(0, 120), 3);
        for (const c of rag.chunks) {
          fragmentos.push({
            procedencia: `RAG · ${c.title || c.source}`,
            contenido: c.content.slice(0, 180),
          });
        }
      } catch {
        // RAG optional until ingest
      }
    }

    if (agent.allowedTools.includes("memory.read")) {
      try {
        const chunks = await this.memory.list(input.tenantId, 5);
        for (const c of chunks) {
          fragmentos.push({
            procedencia: `memoria · ${c.title || c.source}`,
            contenido: String(c.content ?? "").slice(0, 200),
          });
        }
      } catch {
        // memory optional
      }
    }

    const messages = construirMensajes(
      `Agente: ${agent.id}` + "
" + agent.systemPrompt,
      fragmentos,
      input.input,
    );

    const { result, attempted, fallbackReason } = await this.router.complete(
      { messages, maxTokens: agent.limits.maxTokens, temperature: 0.3 },
      settings,
    );

    const auditId = await this.audit.log({
      tenantId: input.tenantId,
      userId: input.userId,
      agentId: agent.id,
      action: input.action ?? "advise",
      provider: result.provider,
      model: result.model,
      prompt: agent.systemPrompt,
      userInput: input.input,
      output: result.text,
      metadata: { mock: result.mock, ready: result.ready, attempted, fallbackReason, autonomyMode },
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
  }
}
