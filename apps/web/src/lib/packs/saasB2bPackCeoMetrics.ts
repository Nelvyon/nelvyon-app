import { DbClient } from "../../../../../backend/db/DbClient";

function db() {
  return DbClient.getInstance();
}

export type SaasB2bPackCeoMetricKey =
  | "trials"
  | "mrr_eur"
  | "cac_approx"
  | "demo_close_rate"
  | "churn_rate";

export type SaasB2bPackCeoMetric = {
  key: SaasB2bPackCeoMetricKey;
  label: string;
  value: string;
  hint: string;
  limitation?: string;
  source: string;
  available: boolean;
};

export type SaasB2bPackCeoMetricsPayload = {
  metrics: SaasB2bPackCeoMetric[];
  fetched_at: string;
  period_days: number;
  degraded: boolean;
  data_sources: string[];
};

export type SaasB2bPackCeoRawInputs = {
  trials: number | null;
  mrrEur: number | null;
  demos: number | null;
  closedDeals: number | null;
  churned: number | null;
  activeSubscriptions: number | null;
  adsSpendEur: number | null;
  adsSpendAvailable: boolean;
};

export function buildSaasB2bPackCeoMetrics(
  raw: SaasB2bPackCeoRawInputs,
  periodDays = 30,
): SaasB2bPackCeoMetricsPayload {
  const metrics: SaasB2bPackCeoMetric[] = [];
  const sources = new Set<string>();

  if (raw.trials != null) {
    sources.add("crm_trials");
    metrics.push({
      key: "trials",
      label: "Trials iniciados",
      value: raw.trials.toLocaleString("es-ES"),
      hint: `${raw.trials} nuevos trials en los últimos ${periodDays} días`,
      source: "crm_trials",
      available: true,
    });
  } else {
    metrics.push({ key: "trials", label: "Trials iniciados", value: "—", hint: "Sin datos de trials en CRM", limitation: "Etiqueta 'trial' no configurada en CRM", source: "none", available: false });
  }

  if (raw.mrrEur != null) {
    sources.add("billing_mrr");
    metrics.push({
      key: "mrr_eur",
      label: "MRR (€)",
      value: `${raw.mrrEur.toLocaleString("es-ES")} €/mes`,
      hint: `Ingresos recurrentes mensuales activos`,
      source: "billing_mrr",
      available: true,
    });
  } else {
    metrics.push({ key: "mrr_eur", label: "MRR (€)", value: "—", hint: "Sin datos de facturación recurrente", limitation: "Stripe no configurado o sin subscripciones activas", source: "none", available: false });
  }

  if (raw.adsSpendAvailable && raw.adsSpendEur != null && raw.trials != null && raw.trials > 0) {
    sources.add("ads_spend");
    const cac = Math.round(raw.adsSpendEur / raw.trials);
    metrics.push({
      key: "cac_approx",
      label: "CAC estimado (€)",
      value: `${cac} €/trial`,
      hint: `Coste de adquisición por trial basado en inversión publicitaria`,
      source: "ads_spend",
      available: true,
    });
  } else {
    metrics.push({ key: "cac_approx", label: "CAC estimado (€)", value: "—", hint: "Conecta publicidad para calcular CAC", limitation: "Sin datos de inversión publicitaria o sin trials", source: "none", available: false });
  }

  if (raw.demos != null && raw.closedDeals != null && raw.demos > 0) {
    sources.add("crm_pipeline");
    const rate = Math.round((raw.closedDeals / raw.demos) * 100);
    metrics.push({
      key: "demo_close_rate",
      label: "Demo → cierre",
      value: `${rate}%`,
      hint: `${rate}% de los demos se convierten en cliente de pago`,
      source: "crm_pipeline",
      available: true,
    });
  } else {
    metrics.push({ key: "demo_close_rate", label: "Demo → cierre", value: "—", hint: "Etiqueta 'demo' y 'closed_won' en pipeline para ver ratio", limitation: "Datos insuficientes en pipeline", source: "none", available: false });
  }

  if (raw.churned != null && raw.activeSubscriptions != null && raw.activeSubscriptions > 0) {
    sources.add("billing_churn");
    const rate = ((raw.churned / raw.activeSubscriptions) * 100).toFixed(1);
    metrics.push({
      key: "churn_rate",
      label: "Churn mensual",
      value: `${rate}%`,
      hint: `${rate}% de suscriptores cancelaron en los últimos ${periodDays} días`,
      source: "billing_churn",
      available: true,
    });
  } else {
    metrics.push({ key: "churn_rate", label: "Churn mensual", value: "—", hint: "Sin datos suficientes de cancelaciones", limitation: "Requiere historial de subscripciones Stripe", source: "none", available: false });
  }

  return {
    metrics,
    fetched_at: new Date().toISOString(),
    period_days: periodDays,
    degraded: metrics.some((m) => !m.available),
    data_sources: [...sources],
  };
}

export async function fetchSaasB2bPackCeoRawInputs(params: {
  workspaceId: number;
  tenantId: string;
  periodDays?: number;
}): Promise<SaasB2bPackCeoRawInputs> {
  const period = params.periodDays ?? 30;
  const sinceDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

  const trialRows = await db().query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM saas_contacts
     WHERE tenant_id = $1 AND created_at >= $2
       AND (stage = 'trial' OR metadata->>'stage' = 'trial')`,
    [params.tenantId, sinceDate],
  ).catch(() => []);
  const trials = trialRows[0] ? Number(trialRows[0].cnt) : null;

  const mrrRows = await db().query<{ mrr: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS mrr FROM saas_invoices
     WHERE tenant_id = $1 AND status = 'paid' AND recurring = true`,
    [params.tenantId],
  ).catch(() => []);
  const mrrEur = mrrRows[0] ? Number(mrrRows[0].mrr) : null;

  const demoRows = await db().query<{ demos: string; closed: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE stage = 'demo')::text AS demos,
       COUNT(*) FILTER (WHERE stage = 'closed_won')::text AS closed
     FROM saas_deals WHERE tenant_id = $1 AND created_at >= $2`,
    [params.tenantId, sinceDate],
  ).catch(() => []);
  const demos = demoRows[0] ? Number(demoRows[0].demos) : null;
  const closedDeals = demoRows[0] ? Number(demoRows[0].closed) : null;

  const adsRows = await db().query<{ total_spend: string }>(
    `SELECT COALESCE(SUM((metadata->>'monthly_spend')::numeric), 0)::text AS total_spend
     FROM ads_connections WHERE tenant_id = $1 AND status = 'active'`,
    [params.tenantId],
  ).catch(() => []);
  const adsSpendEur = adsRows[0] ? Number(adsRows[0].total_spend) : null;

  return {
    trials: trials && trials > 0 ? trials : null,
    mrrEur: mrrEur && mrrEur > 0 ? mrrEur : null,
    demos,
    closedDeals,
    churned: null,
    activeSubscriptions: null,
    adsSpendEur,
    adsSpendAvailable: adsSpendEur != null && adsSpendEur > 0,
  };
}
