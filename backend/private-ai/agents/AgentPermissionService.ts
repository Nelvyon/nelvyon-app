import type { AgentPermissionCheck, AgentToolId, NelvyonPrivateAgentDef, SensitiveActionType } from "../types";
import {
  agentAllowsTool,
  getPrivateAgent,
} from "../nelvyonAgentRegistry";
import { isSensitiveAction, requiresApproval } from "../sensitiveActions";

export type TenantAgentOverride = {
  agentId: string;
  enabled: boolean;
  extraAllowedTools: AgentToolId[];
  deniedTools: AgentToolId[];
};

export class AgentPermissionService {
  checkTool(agent: NelvyonPrivateAgentDef, toolId: AgentToolId, override?: TenantAgentOverride): AgentPermissionCheck {
    if (override && !override.enabled) {
      return { allowed: false, reason: `Agente ${agent.id} deshabilitado para este tenant.` };
    }
    if (override?.deniedTools.includes(toolId)) {
      return { allowed: false, reason: `Tool ${toolId} denegada por override tenant.` };
    }
    if (agentAllowsTool(agent, toolId) || override?.extraAllowedTools.includes(toolId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: `Agente ${agent.id} no tiene permiso para ${toolId}.` };
  }

  checkAction(
    agent: NelvyonPrivateAgentDef,
    action?: string,
  ): { blocked: boolean; needsApproval: boolean; reason?: string } {
    if (!action || action === "advise") {
      return { blocked: false, needsApproval: false };
    }
    if (agent.forbiddenActions.includes(action as SensitiveActionType) && action === "cross_tenant_access") {
      return { blocked: true, needsApproval: false, reason: "Acción prohibida: cross-tenant." };
    }
    if (requiresApproval(action, agent.approvalRequiredActions)) {
      return { blocked: false, needsApproval: true };
    }
    if (isSensitiveAction(action) && agent.forbiddenActions.includes(action)) {
      return { blocked: true, needsApproval: false, reason: `Acción prohibida: ${action}` };
    }
    return { blocked: false, needsApproval: false };
  }
}

let _svc: AgentPermissionService | undefined;
export function getAgentPermissionService(): AgentPermissionService {
  _svc ??= new AgentPermissionService();
  return _svc;
}
