import { DbClient } from "../../../../../backend/db/DbClient";

import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";
import { dbGetCampaign, platformDbFallbackEnabled } from "@/lib/platformDbFallback";

function db() {
  return DbClient.getInstance();
}

export type LocalPackCeoMetricKey =
  | "leads"
  | "cpl_approx"
  | "appointments"
  | "landing_to_lead_rate"
  | "welcome_sequence_status";

export type LocalPackCeoMetric = {
  key: LocalPackCeoMetricKey;
  label: string;
  value: string;
  hint: string;
  limitation?: string;
  source: string;
  available: boolean;
};

export type LocalPackCeoMetricsPayload = {
  metrics: LocalPackCeoMetric[];
  fetched_at: string;
  period_days: number;
  degraded: boolean;
  data_sources: string[];
};

export type LocalPackCeoRawInputs = {
  leads: number | null;
  adsSpendEur: number | null;
  adsSpendAvailable: boolean;
  appointments: number | null;
  landingVisits: number | null;
  landingConversions: number | null;
  welcomeStatus: string | null;
  welcomeTouches: number | null;
  welcomeCampaignName: string | null;
};

const LEAD_STATUSES = ["lead", "new", "prospect", "mql", "subscriber"];

export function buildLocalPackCeoMetrics(
  raw: LocalPackCeoRawInputs,
  periodDays = 30,
): LocalPackCeoMetricsPayload {
  const metrics: LocalPackCeoMetric[] = [];
  const sources = new Set<string>();

  const leads = raw.leads;
  if (leads != null) {
    sources.add("crm_contacts");
    metrics.push({
      key: "leads",
      label: "Leads",
      value: String(leads),
      hint: `Contactos en CRM con estado lead (${periodDays} días, acumulado)`,
      limitation: "Cuenta contactos con status lead/MQL en Nelvyon CRM; no incluye leads solo en Ads sin sync.",
      source: "crm_contacts",
      available: true,
    });
  } else {
    metrics.push({
      key: "leads",
      label: "Leads",
      value: "—",
      hint: "Sin contactos lead en CRM todavía",
      limitation: "Conecta formularios o importa contactos para ver este KPI.",
      source: "unavailable",
      available: false,
    });
  }

  const spend = raw.adsSpendEur;
  const cpl =
    raw.adsSpendAvailable && spend != null && spend > 0 && leads != null && leads > 0
      ? Math.round((spend / leads) * 100) / 100
      : null;

  if (cpl != null) {
    sources.add("ads_reporting");
    metrics.push({
      key: "cpl_approx",
      label: "CPL aprox.",
      value: `${cpl.toLocaleString("es-ES")} €`,
      hint: `Gasto publicidad ÷ ${leads} leads`,
      limitation:
        "Aproximado: suma Google/Meta conectados ÷ leads CRM. Sin atribución multitouch ni offline.",
      source: "ads_reporting",
      available: true,
    });
  } else if (raw.adsSpendAvailable && spend != null && spend > 0 && (leads == null || leads === 0)) {
    sources.add("ads_reporting");
    metrics.push({
      key: "cpl_approx",
      label: "CPL aprox.",
      value: "—",
      hint: `Gasto ${spend.toLocaleString("es-ES")} € sin leads atribuibles aún`,
      limitation: "Necesitas al menos 1 lead en CRM para calcular CPL.",
      source: "ads_reporting",
      available: false,
    });
  } else {
    metrics.push({
      key: "cpl_approx",
      label: "CPL aprox.",
      value: "—",
      hint: "Conecta Google/Meta Ads y registra leads en CRM",
      limitation: "Sin gasto Ads real conectado; no se usa simulador.",
      source: "unavailable",
      available: false,
    });
  }

  if (raw.appointments != null) {
    sources.add("bookings");
    metrics.push({
      key: "appointments",
      label: "Citas",
      value: String(raw.appointments),
      hint: "Reservas confirmadas o pendientes (excl. canceladas)",
      limitation: "Solo citas creadas en módulo Reservas Nelvyon; no incluye agenda externa.",
      source: "bookings",
      available: true,
    });
  } else {
    metrics.push({
      key: "appointments",
      label: "Citas",
      value: "0",
      hint: "Sin citas registradas en Reservas",
      limitation: "Activa reservas online o el chatbot de citas del pack.",
      source: "bookings",
      available: false,
    });
  }

  const visits = raw.landingVisits;
  const conversions = raw.landingConversions;
  if (visits != null && visits > 0) {
    sources.add("landing_analytics");
    const rate = conversions != null ? Math.round((conversions / visits) * 1000) / 10 : 0;
    metrics.push({
      key: "landing_to_lead_rate",
      label: "Landing → lead",
      value: `${rate.toLocaleString("es-ES")}%`,
      hint: `${conversions ?? 0} conversiones / ${visits} visitas landing`,
      limitation:
        "Basado en eventos impression y form_submit/conversion de landing Nelvyon; tráfico sin pixel no cuenta.",
      source: "landing_analytics",
      available: true,
    });
  } else if (visits === 0) {
    sources.add("landing_analytics");
    metrics.push({
      key: "landing_to_lead_rate",
      label: "Landing → lead",
      value: "0%",
      hint: "Landing publicada sin visitas medidas aún",
      limitation: "Comparte la URL live o conecta GA4 para ampliar el tracking.",
      source: "landing_analytics",
      available: false,
    });
  } else {
    metrics.push({
      key: "landing_to_lead_rate",
      label: "Landing → lead",
      value: "—",
      hint: "Sin analytics de landing disponibles",
      limitation: "Publica la landing del pack y genera tráfico para medir conversión.",
      source: "unavailable",
      available: false,
    });
  }

  const welcomeLabel = formatWelcomeStatus(raw.welcomeStatus, raw.welcomeTouches);
  if (raw.welcomeStatus) {
    sources.add("nelvyon_campaigns");
    metrics.push({
      key: "welcome_sequence_status",
      label: "Secuencia bienvenida",
      value: welcomeLabel,
      hint: raw.welcomeCampaignName ?? "Campaña email del pack local",
      limitation:
        "Estado de la campaña welcome_sequence en Nelvyon; no refleja aperturas/clics hasta conectar email transaccional.",
      source: "nelvyon_campaigns",
      available: true,
    });
  } else {
    metrics.push({
      key: "welcome_sequence_status",
      label: "Secuencia bienvenida",
      value: "No configurada",
      hint: "Ejecuta el pack local con email de contacto",
      limitation: "La secuencia 3-touch se crea al kickoff del pack con contact_email.",
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

export function formatWelcomeStatus(status: string | null, touches: number | null): string {
  if (!status) return "No configurada";
  const s = status.toLowerCase();
  const touchLabel = touches && touches > 0 ? ` (${touches}-touch)` : "";
  if (s === "sent") return `Enviada${touchLabel}`;
  if (s === "queued" || s === "pending") return `En cola${touchLabel}`;
  if (s === "ready" || s === "draft") return `Lista${touchLabel}`;
  if (s === "active" || s === "running") return `Activa${touchLabel}`;
  if (s === "skipped") return "Omitida (sin email)";
  if (s === "no_api_key") return "Pendiente (falta SES)";
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

async function dbCountLeads(workspaceId: number, userId: string): Promise<number> {
  const rows = await db().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM contacts
     WHERE workspace_id = $1 AND user_id = $2
       AND LOWER(COALESCE(status, 'lead')) = ANY($3::text[])`,
    [workspaceId, userId, LEAD_STATUSES],
  );
  return Number(rows[0]?.count ?? 0);
}

async function dbCountAppointments(workspaceId: number, userId: string): Promise<number> {
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

async function dbLandingConversion(workspaceId: number): Promise<{
  visits: number;
  conversions: number;
}> {
  try {
    const rows = await db().query<{ visits: string; conversions: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE la.event_type = 'impression')::text AS visits,
         COUNT(*) FILTER (WHERE la.event_type IN ('conversion', 'form_submit'))::text AS conversions
       FROM landing_analytics la
       INNER JOIN landing_pages lp ON lp.id = la.page_id
       WHERE lp.workspace_id = $1`,
      [workspaceId],
    );
    return {
      visits: Number(rows[0]?.visits ?? 0),
      conversions: Number(rows[0]?.conversions ?? 0),
    };
  } catch {
    return { visits: 0, conversions: 0 };
  }
}

async function dbWelcomeCampaign(
  workspaceId: number,
  userId: string,
  campaignId?: number | null,
): Promise<{ status: string | null; touches: number | null; name: string | null }> {
  const deriveQueueStatus = async (touches: number | null): Promise<string | null> => {
    if (!touches || touches <= 0) return null;
    const rows = await db().query<{ status: string }>(
      `SELECT status
       FROM email_queue
       WHERE workspace_id = $1
         AND user_id = $2
         AND email_type = 'campaign'
       ORDER BY created_at DESC
       LIMIT $3`,
      [workspaceId, userId, touches],
    );
    if (rows.length === 0) return null;
    const statuses = rows.map((row) => (row.status || "").toLowerCase());
    if (statuses.every((status) => status === "sent")) return "sent";
    if (statuses.some((status) => status === "failed")) return "failed";
    if (statuses.some((status) => status === "no_api_key")) return "no_api_key";
    if (statuses.some((status) => status === "sent")) return "active";
    return "queued";
  };

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
      const queueDerivedStatus = await deriveQueueStatus(touches);
      return {
        status: queueDerivedStatus ?? row.status ?? null,
        touches,
        name: row.name ?? null,
      };
    }
  }

  const rows = await db().query<{ status: string; content: string | null; name: string | null }>(
    `SELECT status, content, name
     FROM nelvyon_campaigns
     WHERE workspace_id = $1 AND user_id = $2
       AND campaign_type = 'welcome_sequence'
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
  const queueDerivedStatus = await deriveQueueStatus(touches);
  return { status: queueDerivedStatus ?? row.status, touches, name: row.name };
}

function parseAdsSpend(body: unknown): { spend: number | null; available: boolean } {
  if (!body || typeof body !== "object") return { spend: null, available: false };
  const o = body as Record<string, unknown>;
  const google = o.google as { mock?: boolean; summary?: { cost?: number } } | undefined;
  const meta = o.meta as { mock?: boolean; summary?: { spend?: number } } | undefined;
  const unified = o.unified as { total_spend?: number } | undefined;
  const googleMock = google?.mock === true;
  const metaMock = meta?.mock === true;
  if (googleMock && metaMock) return { spend: null, available: false };
  const spend = Number(
    unified?.total_spend ??
      (Number(google?.summary?.cost ?? 0) + Number(meta?.summary?.spend ?? 0)),
  );
  if (!Number.isFinite(spend) || spend <= 0) return { spend: null, available: false };
  return { spend, available: true };
}

async function fetchAdsSpendFromUpstream(req: Request): Promise<{ spend: number | null; available: boolean }> {
  try {
    const res = await proxyPlatformFetch(req, "GET", "/api/ads-agent/reporting/unified");
    if (!res.ok) return { spend: null, available: false };
    return parseAdsSpend(await res.json());
  } catch {
    return { spend: null, available: false };
  }
}

export async function fetchLocalPackCeoMetricsFromDb(params: {
  workspaceId: number;
  userId: string;
  campaignId?: number | null;
  welcomeFallback?: { status?: string; touches?: number };
  periodDays?: number;
}): Promise<LocalPackCeoMetricsPayload> {
  const periodDays = params.periodDays ?? 30;
  const [leads, appointments, landing, welcome] = await Promise.all([
    dbCountLeads(params.workspaceId, params.userId),
    dbCountAppointments(params.workspaceId, params.userId),
    dbLandingConversion(params.workspaceId),
    dbWelcomeCampaign(params.workspaceId, params.userId, params.campaignId),
  ]);

  const welcomeStatus =
    welcome.status ?? params.welcomeFallback?.status ?? null;
  const welcomeTouches =
    welcome.touches ?? params.welcomeFallback?.touches ?? null;

  return buildLocalPackCeoMetrics(
    {
      leads,
      adsSpendEur: null,
      adsSpendAvailable: false,
      appointments,
      landingVisits: landing.visits,
      landingConversions: landing.conversions,
      welcomeStatus,
      welcomeTouches,
      welcomeCampaignName: welcome.name,
    },
    periodDays,
  );
}

export async function fetchLocalPackCeoMetrics(params: {
  req: Request;
  workspaceId: number;
  userId?: string | null;
  campaignId?: number | null;
  welcomeFallback?: { status?: string; touches?: number };
  periodDays?: number;
}): Promise<LocalPackCeoMetricsPayload> {
  const periodDays = params.periodDays ?? 30;
  const userId =
    params.userId?.trim() ||
    (await dbResolveOwnerUserId(params.workspaceId));

  if (!userId || !platformDbFallbackEnabled()) {
    return buildLocalPackCeoMetrics(
      {
        leads: null,
        adsSpendEur: null,
        adsSpendAvailable: false,
        appointments: null,
        landingVisits: null,
        landingConversions: null,
        welcomeStatus: params.welcomeFallback?.status ?? null,
        welcomeTouches: params.welcomeFallback?.touches ?? null,
        welcomeCampaignName: null,
      },
      periodDays,
    );
  }

  const [leads, appointments, landing, welcome, ads] = await Promise.all([
    dbCountLeads(params.workspaceId, userId),
    dbCountAppointments(params.workspaceId, userId),
    dbLandingConversion(params.workspaceId),
    dbWelcomeCampaign(params.workspaceId, userId, params.campaignId),
    fetchAdsSpendFromUpstream(params.req),
  ]);

  const welcomeStatus = welcome.status ?? params.welcomeFallback?.status ?? null;
  const welcomeTouches = welcome.touches ?? params.welcomeFallback?.touches ?? null;

  const base = buildLocalPackCeoMetrics(
    {
      leads,
      adsSpendEur: ads.spend,
      adsSpendAvailable: ads.available,
      appointments,
      landingVisits: landing.visits,
      landingConversions: landing.conversions,
      welcomeStatus,
      welcomeTouches,
      welcomeCampaignName: welcome.name,
    },
    periodDays,
  );

  if (ads.available) {
    base.data_sources.push("ads_reporting");
  }

  return base;
}

export function localPackCeoMetricsToDisplayRows(
  payload: LocalPackCeoMetricsPayload,
): { label: string; value: string; hint?: string; limitation?: string }[] {
  return payload.metrics.map((m) => ({
    label: m.label,
    value: m.value,
    hint: m.hint,
    limitation: m.limitation,
  }));
}
