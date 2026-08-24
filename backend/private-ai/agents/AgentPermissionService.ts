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
    // LO PROHIBIDO SE COMPRUEBA PRIMERO. No es un detalle de orden.
    //
    // Antes la rama de aprobación iba delante, y `requiresApproval` devuelve
    // `true` para CUALQUIER acción sensible (por el `|| GLOBAL_SENSITIVE_ACTIONS`
    // que lleva dentro). El resultado: una acción que estaba en
    // `forbiddenActions` no se bloqueaba — se degradaba a «pendiente de
    // aprobación», y bastaba que una persona pulsara aprobar para que un agente
    // hiciera exactamente lo que su definición dice que no puede hacer.
    //
    // La comprobación de prohibidas que venía después era inalcanzable para
    // todo salvo `cross_tenant_access`, que tenía su propio caso especial. Es
    // decir: `forbiddenActions` estaba muerto para 8 de los 9 tipos de acción.
    //
    // Prohibido gana sobre aprobable: una acción que nunca debe hacerse no deja
    // de serlo porque alguien haga clic.
    if (isSensitiveAction(action) && agent.forbiddenActions.includes(action)) {
      const detalle = action === "cross_tenant_access" ? "cross-tenant" : action;
      return { blocked: true, needsApproval: false, reason: `Acción prohibida: ${detalle}` };
    }
    if (requiresApproval(action, agent.approvalRequiredActions)) {
      return { blocked: false, needsApproval: true };
    }
    return { blocked: false, needsApproval: false };
  }
}

let _svc: AgentPermissionService | undefined;
export function getAgentPermissionService(): AgentPermissionService {
  _svc ??= new AgentPermissionService();
  return _svc;
}
