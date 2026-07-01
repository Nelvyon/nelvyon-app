import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type CrmCopilotSuggestion = {
  summary: string;
  nextBestAction: string;
  emailDraft: string;
  score: number;
};

export class SaasCrmCopilotService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async suggestForContact(tenantId: string, contactId: string): Promise<CrmCopilotSuggestion> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT c.first_name, c.last_name, c.email, c.status, c.pipeline_stage, c.lead_score,
              (SELECT COUNT(*) FROM saas_deals d WHERE d.contact_id=c.id AND d.tenant_id=c.tenant_id) AS deal_count
       FROM saas_contacts c WHERE c.id=$1 AND c.tenant_id=$2`,
      [contactId, tenantId],
    );
    const c = rows[0];
    if (!c) throw new Error("Contact not found");

    const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || String(c.email);
    const stage = String(c.pipeline_stage ?? c.status ?? "new");
    const score = Number(c.lead_score ?? 0);
    const dealCount = Number(c.deal_count ?? 0);

    let nextBestAction = "Enviar email de seguimiento personalizado";
    if (score >= 70 && dealCount === 0) nextBestAction = "Crear oportunidad en pipeline y agendar demo";
    else if (stage === "qualified") nextBestAction = "Enviar propuesta comercial";
    else if (score < 30) nextBestAction = "Nutrir con secuencia educativa 7 días";

    const summary = `${name} está en etapa «${stage}» con lead score ${score}. ${dealCount} oportunidad(es) activa(s).`;
    const emailDraft = `Hola ${String(c.first_name ?? "equipo")},\n\nGracias por tu interés en nuestros servicios. Quería hacer seguimiento y ver cómo podemos ayudarte a avanzar.\n\n¿Tienes 15 minutos esta semana?\n\nSaludos`;

    return { summary, nextBestAction, emailDraft, score };
  }
}

let _svc: SaasCrmCopilotService | undefined;
export function getSaasCrmCopilotService(): SaasCrmCopilotService {
  if (!_svc) _svc = new SaasCrmCopilotService();
  return _svc;
}
