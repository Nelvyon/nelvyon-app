import type { DbClient } from "../../db/DbClient";
import { DbClient as DbClientClass } from "../../db/DbClient";
import type { ILlmClient } from "../LlmClient";
import { LlmClient } from "../LlmClient";
import { logger } from "../cron/logger";

export interface UpsellSuggestion {
  clientId: string;
  tenantId: string;
  suggestedServiceId: string;
  reason: string;
  score: number;
}

export type OsUpsellEngineDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

export class OsUpsellEngine {
  constructor(private readonly deps: OsUpsellEngineDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  /**
   * ¿Es momento de proponerle algo más a este cliente?
   *
   * ── LA REGLA ──────────────────────────────────────────────────────────────
   *
   * No se le vende nada a quien tiene un problema abierto con lo que YA ha
   * comprado. No es delicadeza: proponerle un servicio adicional a alguien que
   * lleva tres semanas sin recibir un entregable es la forma más rápida de
   * perderlo, y encima le confirma que nadie está mirando su cuenta.
   *
   * `SenalesDeCliente` ya distingue las tres gravedades que hacen falta. Una
   * señal `bloqueante` significa literalmente «el cliente está pagando y no
   * recibe nada». Ahí no se vende.
   *
   * ── FALLA CERRADO ─────────────────────────────────────────────────────────
   *
   * Si las señales no se pueden leer, se calla. La asimetría es clara:
   * proponerle una venta a un cliente cuya situación no hemos podido comprobar
   * puede costar la relación; no proponérsela cuesta una oportunidad retrasada.
   *
   * ── Y AHORRA LA LLAMADA AL MODELO ─────────────────────────────────────────
   *
   * Se comprueba ANTES de componer el prompt. Preguntarle a un modelo qué
   * venderle a un cliente al que no se le va a vender nada cuesta dinero y no
   * sirve para nada.
   */
  private async porQueNoTocaVender(clientId: string): Promise<string | null> {
    try {
      const { workspaceDelCliente } = await import("../../os-core/workspaceDelCliente");
      const workspaceId = await workspaceDelCliente(clientId, this.db);
      if (workspaceId === null) {
        return "el cliente no consta en os_clients: no se puede comprobar cómo le va";
      }

      // Las tres piezas que `SenalesDeCliente` necesita comparten la misma
      // conexion. Se componen aqui en vez de inyectarse para no obligar a todo
      // llamante del motor de venta cruzada a saber de que se compone la salud
      // de un cliente — que es justo lo que este modulo no deberia decidir.
      const { SenalesDeCliente } = await import("../../exito/SenalesDeCliente");
      const { CerebroDeNegocioService } = await import("../../cerebro/CerebroDeNegocioService");
      const { CicloDelClienteService } = await import("../../portal/CicloDelClienteService");
      const cerebro = new CerebroDeNegocioService(this.db as never);
      const ciclo = new CicloDelClienteService(this.db as never, cerebro);
      const senales = await new SenalesDeCliente(this.db as never, cerebro, ciclo).deCliente(
        workspaceId,
        clientId,
      );

      const bloqueantes = senales.filter((s) => s.gravedad === "bloqueante");
      if (bloqueantes.length > 0) {
        return `tiene ${bloqueantes.length} problema(s) abierto(s) con lo que ya paga: `
          + bloqueantes.map((s) => s.tipo).join(", ");
      }
      return null;
    } catch {
      return "no se han podido leer las señales del cliente";
    }
  }

  async analyzeClient(clientId: string, tenantId: string): Promise<UpsellSuggestion | null> {
    // ANTES DE NADA: ¿le va bien lo que ya tiene?
    const noToca = await this.porQueNoTocaVender(clientId);
    if (noToca) {
      logger.info(`[UPSELL] no se propone nada a ${clientId}: ${noToca}`);
      return null;
    }

    const contracted = await this.db.query<{ service_id: string }>(
      `SELECT service_id FROM os_service_contracts WHERE client_id = $1 AND tenant_id = $2::uuid AND status = 'active'`,
      [clientId, tenantId],
    );

    const contractedIds = contracted.map((r) => r.service_id);

    const allServices = await this.db.query<{ service_id: string; name: string; description: string }>(
      `SELECT service_id, name, description FROM os_service_catalog WHERE active = true`,
    );

    const available = allServices.filter((s) => !contractedIds.includes(s.service_id));

    if (available.length === 0) return null;

    const history = await this.db.query<{ service_id: string; result_summary: string }>(
      `SELECT service_id, result_summary FROM os_job_results WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [clientId],
    );

    const prompt = `Eres el OS de NELVYON. Analiza este cliente y recomienda el mejor servicio adicional.

Servicios contratados: ${contractedIds.join(", ") || "ninguno"}
Historial de resultados: ${JSON.stringify(history.slice(0, 5))}
Servicios disponibles: ${available.map((s) => `${s.service_id}: ${s.description}`).join("\n")}

Responde en JSON: { "serviceId": "...", "reason": "...", "score": 0-100 }
Solo JSON, sin texto extra.`;

    const response = await this.llm.complete(prompt);

    try {
      const raw = extractJsonPayload(response);
      const parsed = JSON.parse(raw) as { serviceId?: string; reason?: string; score?: number };

      const serviceId = typeof parsed.serviceId === "string" ? parsed.serviceId.trim() : "";
      const reason = typeof parsed.reason === "string" ? parsed.reason : "";
      let score = typeof parsed.score === "number" && !Number.isNaN(parsed.score) ? Math.round(parsed.score) : 0;
      score = Math.min(100, Math.max(0, score));

      if (!serviceId || !available.some((s) => s.service_id === serviceId)) {
        logger.error("[UPSELL] serviceId LLM no está en catálogo disponible");
        return null;
      }

      await this.db.query(
        `INSERT INTO os_upsell_suggestions (client_id, tenant_id, suggested_service_id, reason, score, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         ON CONFLICT (client_id, suggested_service_id) DO UPDATE SET score = EXCLUDED.score, reason = EXCLUDED.reason, updated_at = NOW()`,
        [clientId, tenantId, serviceId, reason, score],
      );

      return {
        clientId,
        tenantId,
        suggestedServiceId: serviceId,
        reason,
        score,
      };
    } catch {
      logger.error("[UPSELL] Error parseando respuesta LLM");
      return null;
    }
  }

  async getPendingSuggestions(tenantId: string): Promise<UpsellSuggestion[]> {
    const rows = await this.db.query<UpsellSuggestion>(
      `SELECT client_id as "clientId", tenant_id as "tenantId", suggested_service_id as "suggestedServiceId", reason, score
       FROM os_upsell_suggestions WHERE tenant_id = $1 AND status = 'pending' ORDER BY score DESC`,
      [tenantId],
    );
    return rows;
  }
}

export const osUpsellEngine = new OsUpsellEngine();
