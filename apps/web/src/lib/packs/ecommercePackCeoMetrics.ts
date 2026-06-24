import { DbClient } from "../../../../../backend/db/DbClient";

function db() {
  return DbClient.getInstance();
}

export type EcommercePackCeoMetricKey =
  | "orders"
  | "revenue_eur"
  | "aov_eur"
  | "cart_abandonment_rate"
  | "roas_approx";

export type EcommercePackCeoMetric = {
  key: EcommercePackCeoMetricKey;
  label: string;
  value: string;
  hint: string;
  limitation?: string;
  source: string;
  available: boolean;
};

export type EcommercePackCeoMetricsPayload = {
  metrics: EcommercePackCeoMetric[];
  fetched_at: string;
  period_days: number;
  degraded: boolean;
  data_sources: string[];
};

export type EcommercePackCeoRawInputs = {
  orders: number | null;
  revenueEur: number | null;
  cartVisits: number | null;
  cartCheckouts: number | null;
  adsSpendEur: number | null;
  adsSpendAvailable: boolean;
};

export function buildEcommercePackCeoMetrics(
  raw: EcommercePackCeoRawInputs,
  periodDays = 30,
): EcommercePackCeoMetricsPayload {
  const metrics: EcommercePackCeoMetric[] = [];
  const sources = new Set<string>();

  if (raw.orders != null) {
    sources.add("ecommerce_orders");
    metrics.push({
      key: "orders",
      label: "Pedidos completados",
      value: raw.orders.toLocaleString("es-ES"),
      hint: `${raw.orders} pedidos completados en los últimos ${periodDays} días`,
      source: "ecommerce_orders",
      available: true,
    });
  } else {
    metrics.push({
      key: "orders",
      label: "Pedidos completados",
      value: "—",
      hint: "Conecta tu plataforma e-commerce para ver pedidos",
      limitation: "Integración e-commerce no configurada",
      source: "none",
      available: false,
    });
  }

  if (raw.revenueEur != null) {
    sources.add("ecommerce_revenue");
    const aov = raw.orders && raw.orders > 0
      ? Math.round(raw.revenueEur / raw.orders)
      : null;
    metrics.push({
      key: "revenue_eur",
      label: "Ingresos (€)",
      value: `${raw.revenueEur.toLocaleString("es-ES")} €`,
      hint: `Facturación total en los últimos ${periodDays} días`,
      source: "ecommerce_revenue",
      available: true,
    });
    metrics.push({
      key: "aov_eur",
      label: "Ticket medio (€)",
      value: aov != null ? `${aov} €` : "—",
      hint: aov != null ? `Ticket medio por pedido en ${periodDays} días` : "Insuficientes pedidos para calcular AOV",
      source: "ecommerce_revenue",
      available: aov != null,
    });
  } else {
    metrics.push({ key: "revenue_eur", label: "Ingresos (€)", value: "—", hint: "Sin datos de ingresos", limitation: "Integración e-commerce pendiente", source: "none", available: false });
    metrics.push({ key: "aov_eur", label: "Ticket medio (€)", value: "—", hint: "Sin datos de ticket medio", limitation: "Integración e-commerce pendiente", source: "none", available: false });
  }

  if (raw.cartVisits != null && raw.cartCheckouts != null && raw.cartVisits > 0) {
    sources.add("ecommerce_funnel");
    const abandonRate = Math.round((1 - raw.cartCheckouts / raw.cartVisits) * 100);
    metrics.push({
      key: "cart_abandonment_rate",
      label: "Abandono de carrito",
      value: `${abandonRate}%`,
      hint: `${abandonRate}% de usuarios añaden al carrito pero no completan la compra`,
      source: "ecommerce_funnel",
      available: true,
    });
  } else {
    metrics.push({ key: "cart_abandonment_rate", label: "Abandono de carrito", value: "—", hint: "Sin datos de funnel", limitation: "Datos de carrito no disponibles", source: "none", available: false });
  }

  if (raw.adsSpendAvailable && raw.adsSpendEur != null && raw.revenueEur != null && raw.adsSpendEur > 0) {
    sources.add("ads_spend");
    const roas = (raw.revenueEur / raw.adsSpendEur).toFixed(1);
    metrics.push({
      key: "roas_approx",
      label: "ROAS estimado",
      value: `${roas}x`,
      hint: `Por cada 1€ invertido en ads, se generan ${roas}€ en ventas (approx)`,
      source: "ads_spend",
      available: true,
    });
  } else {
    metrics.push({ key: "roas_approx", label: "ROAS estimado", value: "—", hint: "Conecta Google Ads o Meta para calcular ROAS", limitation: "Sin datos de inversión publicitaria", source: "none", available: false });
  }

  return {
    metrics,
    fetched_at: new Date().toISOString(),
    period_days: periodDays,
    degraded: metrics.some((m) => !m.available),
    data_sources: [...sources],
  };
}

export async function fetchEcommercePackCeoRawInputs(params: {
  workspaceId: number;
  tenantId: string;
  periodDays?: number;
}): Promise<EcommercePackCeoRawInputs> {
  const period = params.periodDays ?? 30;
  const sinceDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

  // Orders + revenue from CRM deals (ecommerce contacts tagged as order)
  const orderRows = await db().query<{ cnt: string; total: string }>(
    `SELECT COUNT(*)::text AS cnt,
            COALESCE(SUM((metadata->>'deal_value')::numeric), 0)::text AS total
     FROM saas_contacts
     WHERE tenant_id = $1
       AND created_at >= $2
       AND (metadata->>'contact_type' = 'order' OR stage = 'closed_won')`,
    [params.tenantId, sinceDate],
  ).catch(() => []);
  const orders = orderRows[0] ? Number(orderRows[0].cnt) : null;
  const revenueEur = orderRows[0] ? Number(orderRows[0].total) : null;

  // Ads spend from connected ads platforms
  const adsRows = await db().query<{ total_spend: string }>(
    `SELECT COALESCE(SUM((metadata->>'monthly_spend')::numeric), 0)::text AS total_spend
     FROM ads_connections
     WHERE tenant_id = $1 AND status = 'active'`,
    [params.tenantId],
  ).catch(() => []);
  const adsSpendEur = adsRows[0] ? Number(adsRows[0].total_spend) : null;

  return {
    orders,
    revenueEur: revenueEur && revenueEur > 0 ? revenueEur : null,
    cartVisits: null,
    cartCheckouts: null,
    adsSpendEur,
    adsSpendAvailable: adsSpendEur != null && adsSpendEur > 0,
  };
}
