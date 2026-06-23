import { DbClient } from "../../../../../backend/db/DbClient";

import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { dbGetCampaign, platformDbFallbackEnabled } from "@/lib/platformDbFallback";

function db() {
  return DbClient.getInstance();
}

export type SaasB2bCeoMetricKey =
  | "mqls"
  | "trial_demo_leads"
  | "demos_booked"
  | "pipeline_opportunities"
  | "nurture_sequence_status";

export type SaasB2bCeoMetric = {
  key: SaasB2bCeoMetricKey;
  label: string;
  value: string;
  hint: string;
  limitation?: string;
  source: string;
  available: boolean;
};

export type SaasB2bCeoMetricsPayload = {
  metrics: SaasB2bCeoMetric[];
  fetched_at: string;
  period_days: number;
  degraded: boolean;
  data_sources: string[];
};

export type SaasB2bCeoRawInputs = {
  mqls: number | null;
  trialDemoLeads: number | null;
  demosBooked: number | null;
  pipelineCount: number | null;
  pipelineValueEur: number | null;
  nurtureStatus: string | null;
  nurtureTouches: number | null;
  nurtureCampaignName: string | null;
};

const MQL_STATUSES = ["mql"];
const TRIAL_DEMO_STATUSES = ["lead", "prospect", "trial", "demo", "demo_request"];

export function buildSaasB2bCeoMetrics(
  raw: SaasB2bCeoRawInputs,
  periodDays = 30,
): SaasB2bCeoMetricsPayload {
  const metrics: SaasB2bCeoMetric[] = [];
  const sources = new Set<string>();

  if (raw.mqls != null) {
    sources.add("crm_contacts");
    metrics.push({
      key: "mqls",
      label: "MQLs",
      value: String(raw.mqls),
      hint: `Contactos con status MQL en CRM (${periodDays} días, acumulado)`,
      limitation: "Solo contactos marcados MQL en Nelvyon CRM; sin scoring externo (HubSpot, etc.).",
      source: "crm_contacts",
      available: true,
    });
  } else {
    metrics.push({
      key: "mqls",
      label: "MQLs",
      value: "—",
      hint: "Sin MQLs registrados en CRM",
      limitation: "Marca leads como MQL o conecta formularios demo/trial.",
      source: "unavailable",
      available: false,
    });
  }

  if (raw.trialDemoLeads != null) {
    sources.add("crm_contacts");
    metrics.push({
      key: "trial_demo_leads",
      label: "Leads trial/demo",
      value: String(raw.trialDemoLeads),
      hint: "Contactos lead/prospect/trial o fuente demo",
      limitation:
        "Aproximado: status lead/trial/demo en CRM; no distingue PLG trial vs demo request sin tags.",
      source: "crm_contacts",
      available: true,
    });
  } else {
    metrics.push({
      key: "trial_demo_leads",
      label: "Leads trial/demo",
      value: "—",
      hint: "Sin leads trial/demo en CRM",
      limitation: "Activa landing PLG, bot de demo o importa contactos.",
      source: "unavailable",
      available: false,
    });
  }

  if (raw.demosBooked != null) {
    sources.add("bookings");
    metrics.push({
      key: "demos_booked",
      label: "Demos agendadas",
      value: String(raw.demosBooked),
      hint: "Citas/demo en módulo Reservas (excl. canceladas)",
      limitation: "Solo demos creadas en Reservas Nelvyon; no incluye Calendly/Cal.com externos.",
      source: "bookings",
      available: raw.demosBooked > 0,
    });
  } else {
    metrics.push({
      key: "demos_booked",
      label: "Demos agendadas",
      value: "0",
      hint: "Sin demos en Reservas",
      limitation: "Conecta el bot de demo o activa reservas online.",
      source: "bookings",
      available: false,
    });
  }

  if (raw.pipelineCount != null) {
    sources.add("deals");
    const valueHint =
      raw.pipelineValueEur != null && raw.pipelineValueEur > 0
        ? ` · €${raw.pipelineValueEur.toLocaleString("es-ES")} pipeline`
        : "";
    metrics.push({
      key: "pipeline_opportunities",
      label: "Pipeline",
      value: String(raw.pipelineCount),
      hint: `Oportunidades abiertas en CRM${valueHint}`,
      limitation:
        "Cuenta deals en etapas no cerradas; valor pipeline es suma declarada, no forecast ponderado.",
      source: "deals",
      available: raw.pipelineCount > 0,
    });
  } else {
    metrics.push({
      key: "pipeline_opportunities",
      label: "Pipeline",
      value: "—",
      hint: "Sin oportunidades en CRM",
      limitation: "Crea deals desde demo calificada o importa pipeline.",
      source: "unavailable",
      available: false,
    });
  }

  const nurtureLabel = formatNurtureStatus(raw.nurtureStatus, raw.nurtureTouches);
  if (raw.nurtureStatus) {
    sources.add("nelvyon_campaigns");
    metrics.push({
      key: "nurture_sequence_status",
      label: "Secuencia nurture",
      value: nurtureLabel,
      hint: raw.nurtureCampaignName ?? "Campaña nurture B2B del pack",
      limitation:
        "Estado campaña nurturing en Nelvyon; no incluye aperturas/clics hasta email transaccional conectado.",
      source: "nelvyon_campaigns",
      available: true,
    });
  } else {
    metrics.push({
      key: "nurture_sequence_status",
      label: "Secuencia nurture",
      value: "No configurada",
      hint: "Ejecuta el pack con email de contacto",
      limitation: "La secuencia 5-touch se crea al kickoff del pack SaaS B2B.",
      source: "unavailable",
      available: false,
    });
  }

  return {
    metrics,
    fetched_at: new Date().toISOString(),
    period_days: periodDays,
    degraded: metrics.filter((m) => !m.available).length >= 3,
    data_sources: [...sources],
  };
}

export function formatNurtureStatus(status: string | null, touches: number | null): string {
  if (!status) return "No configurada";
  const s = status.toLowerCase();
  const touchLabel = touches && touches > 0 ? ` (${touches}-touch)` : "";
  if (s === "sent" || s === "queued") return `Enviada${touchLabel}`;
  if (s === "ready" || s === "draft") return `Lista${touchLabel}`;
  if (s === "active" || s === "running") return `Activa${touchLabel}`;
  if (s === "skipped") return "Omitida (sin email)";
  if (s === "failed" || s === "error") return "Con errores";
  return `${status}${touchLabel}`;
}

async function dbResolveOwnerUserId(workspaceId: number): Promise<string | null> {
  const rows = await db().query<{ user_id: string }>(
    `SELECT user_id::text AS user_id FROM workspaces WHERE id = $1 LIMIT 1`,
    [workspaceId],
  );
  return rows[0]?.user_id ?? null;
}

async function dbCountMqls(workspaceId: number, userId: string): Promise<number> {
  const rows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM contacts
     WHERE workspace_id = $1 AND user_id = $2
       AND LOWER(COALESCE(status, '')) = ANY($3::text[])`,
    [workspaceId, userId, MQL_STATUSES],
  );
  return Number(rows[0]?.count ?? 0);
}

async function dbCountTrialDemoLeads(workspaceId: number, userId: string): Promise<number> {
  const rows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM contacts
     WHERE workspace_id = $1 AND user_id = $2
       AND (
         LOWER(COALESCE(status, 'lead')) = ANY($3::text[])
         OR LOWER(COALESCE(source, '')) LIKE '%demo%'
         OR LOWER(COALESCE(source, '')) LIKE '%trial%'
       )`,
    [workspaceId, userId, TRIAL_DEMO_STATUSES],
  );
  return Number(rows[0]?.count ?? 0);
}

async function dbCountDemos(workspaceId: number, userId: string): Promise<number> {
  try {
    const rows = await db().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM bookings
       WHERE workspace_id = $1 AND host_user_id = $2::uuid
         AND LOWER(COALESCE(status, 'confirmed')) NOT IN ('cancelled', 'canceled')`,
      [workspaceId, userId],
    );
    return Number(rows[0]?.count ?? 0);
  } catch {
    const legacy = await db().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM bookings
       WHERE user_id = $1::uuid
         AND LOWER(COALESCE(status, 'confirmed')) NOT IN ('cancelled', 'canceled')`,
      [userId],
    );
    return Number(legacy[0]?.count ?? 0);
  }
}

async function dbPipelineSummary(
  workspaceId: number,
  userId: string,
): Promise<{ count: number; valueEur: number }> {
  try {
    const rows = await db().query<{ count: string; value: string }>(
      `SELECT COUNT(*)::text AS count, COALESCE(SUM(value), 0)::text AS value
       FROM deals
       WHERE workspace_id = $1 AND user_id = $2
         AND LOWER(COALESCE(stage, 'lead')) NOT IN ('won', 'closed_won', 'closed-won', 'lost', 'closed_lost', 'closed-lost')`,
      [workspaceId, userId],
    );
    return {
      count: Number(rows[0]?.count ?? 0),
      valueEur: Math.round(Number(rows[0]?.value ?? 0)),
    };
  } catch {
    return { count: 0, valueEur: 0 };
  }
}

async function dbNurtureCampaign(
  workspaceId: number,
  userId: string,
  campaignId?: number | null,
): Promise<{ status: string | null; touches: number | null; name: string | null }> {
  if (campaignId && platformDbFallbackEnabled()) {
    const row = await dbGetCampaign(campaignId, workspaceId, userId);
    if (row) {
      let touches: number | null = null;
      try {
        const parsed = row.content ? JSON.parse(String(row.content)) : null;
        if (Array.isArray(parsed)) touches = parsed.length;
      } catch {
        /* ignore */
      }
      return { status: row.status ?? null, touches, name: row.name ?? null };
    }
  }

  const rows = await db().query<{ status: string; content: string | null; name: string | null }>(
    `SELECT status, content, name
     FROM nelvyon_campaigns
     WHERE workspace_id = $1 AND user_id = $2
       AND campaign_type = 'nurturing'
     ORDER BY id DESC
     LIMIT 1`,
    [workspaceId, userId],
  );
  const row = rows[0];
  if (!row) return { status: null, touches: null, name: null };
  let touches: number | null = null;
  try {
    const parsed = row.content ? JSON.parse(row.content) : null;
    if (Array.isArray(parsed)) touches = parsed.length;
  } catch {
    /* ignore */
  }
  return { status: row.status, touches, name: row.name };
}

export async function fetchSaasB2bCeoMetricsFromDb(params: {
  workspaceId: number;
  userId: string;
  campaignId?: number | null;
  nurtureFallback?: { status?: string; touches?: number };
  periodDays?: number;
}): Promise<SaasB2bCeoMetricsPayload> {
  const periodDays = params.periodDays ?? 30;
  const [mqls, trialDemoLeads, demosBooked, pipeline, nurture] = await Promise.all([
    dbCountMqls(params.workspaceId, params.userId),
    dbCountTrialDemoLeads(params.workspaceId, params.userId),
    dbCountDemos(params.workspaceId, params.userId),
    dbPipelineSummary(params.workspaceId, params.userId),
    dbNurtureCampaign(params.workspaceId, params.userId, params.campaignId),
  ]);

  return buildSaasB2bCeoMetrics(
    {
      mqls,
      trialDemoLeads,
      demosBooked,
      pipelineCount: pipeline.count,
      pipelineValueEur: pipeline.valueEur,
      nurtureStatus: nurture.status ?? params.nurtureFallback?.status ?? null,
      nurtureTouches: nurture.touches ?? params.nurtureFallback?.touches ?? null,
      nurtureCampaignName: nurture.name,
    },
    periodDays,
  );
}

export async function fetchSaasB2bCeoMetrics(params: {
  req: Request;
  workspaceId: number;
  userId?: string | null;
  campaignId?: number | null;
  nurtureFallback?: { status?: string; touches?: number };
  periodDays?: number;
}): Promise<SaasB2bCeoMetricsPayload> {
  const userId =
    params.userId?.trim() ||
    (await dbResolveOwnerUserId(params.workspaceId));

  if (!userId || !platformDbFallbackEnabled()) {
    return buildSaasB2bCeoMetrics(
      {
        mqls: null,
        trialDemoLeads: null,
        demosBooked: null,
        pipelineCount: null,
        pipelineValueEur: null,
        nurtureStatus: params.nurtureFallback?.status ?? null,
        nurtureTouches: params.nurtureFallback?.touches ?? null,
        nurtureCampaignName: null,
      },
      params.periodDays ?? 30,
    );
  }

  return fetchSaasB2bCeoMetricsFromDb({
    workspaceId: params.workspaceId,
    userId,
    campaignId: params.campaignId,
    nurtureFallback: params.nurtureFallback,
    periodDays: params.periodDays,
  });
}

export function saasB2bCeoMetricsToDisplayRows(
  payload: SaasB2bCeoMetricsPayload,
): { label: string; value: string; hint?: string; limitation?: string }[] {
  return payload.metrics.map((m) => ({
    label: m.label,
    value: m.value,
    hint: m.hint,
    limitation: m.limitation,
  }));
}
