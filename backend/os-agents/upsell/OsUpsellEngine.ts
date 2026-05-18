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

  async analyzeClient(clientId: string, tenantId: string): Promise<UpsellSuggestion | null> {
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
