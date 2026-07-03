/**
 * S58 — Tenant autonomy mode: draft / propose / execute
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type AutonomyMode = "draft" | "propose" | "execute";

export type AutonomyGate = {
  mode: AutonomyMode;
  allowed: boolean;
  reason?: string;
};

export class SaasAutonomyService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async getMode(tenantId: string): Promise<AutonomyMode> {
    const rows = await this.db.query<{ autonomy_mode: string }>(
      `SELECT autonomy_mode FROM saas_tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    const m = rows[0]?.autonomy_mode;
    if (m === "draft" || m === "propose" || m === "execute") return m;
    return "propose";
  }

  async setMode(tenantId: string, mode: AutonomyMode): Promise<AutonomyMode> {
    await this.db.query(
      `UPDATE saas_tenants SET autonomy_mode = $2, updated_at = NOW() WHERE id = $1`,
      [tenantId, mode],
    );
    return mode;
  }

  /** Gate outbound actions (send email, publish, launch pack). */
  gateOutbound(mode: AutonomyMode, action: "send" | "publish" | "launch"): AutonomyGate {
    if (mode === "execute") return { mode, allowed: true };
    if (mode === "propose") {
      return {
        mode,
        allowed: false,
        reason: `Modo propuesta: confirma manualmente antes de ${action === "send" ? "enviar" : action === "publish" ? "publicar" : "lanzar"}.`,
      };
    }
    return {
      mode,
      allowed: false,
      reason: "Modo borrador: solo generación IA, sin acciones externas.",
    };
  }

  /** Gate auto-reply / agent execute. */
  gateAgentAuto(mode: AutonomyMode): AutonomyGate {
    if (mode === "execute") return { mode, allowed: true };
    if (mode === "propose") {
      return { mode, allowed: false, reason: "Modo propuesta: revisa sugerencias antes de enviar." };
    }
    return { mode, allowed: false, reason: "Modo borrador: agente solo genera borradores." };
  }
}

let _svc: SaasAutonomyService | undefined;
export function getSaasAutonomyService(): SaasAutonomyService {
  _svc ??= new SaasAutonomyService();
  return _svc;
}
export function resetSaasAutonomyServiceForTests(): void {
  _svc = undefined;
}
