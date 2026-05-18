/** Base URL for Paddle Billing API (centralizado; sandbox por defecto). */
export const PADDLE_API_BASE =
  process.env.PADDLE_ENV === "production" || process.env.PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

/** Portal genérico si fallan las llamadas a la API (fail graceful). */
export const PADDLE_CUSTOMER_PORTAL_FALLBACK = "https://customer.paddle.com";

export type PaddleCardSummary = {
  lastFour?: string;
  cardType?: string;
  expiryMonth?: number;
  expiryYear?: number;
};

function getApiKey(): string {
  const key = process.env.PADDLE_API_KEY ?? "";
  if (!key.trim()) {
    throw new Error("PADDLE_API_KEY is not configured");
  }
  return key.trim();
}

function getApiKeyOptional(): string | undefined {
  const key = process.env.PADDLE_API_KEY ?? "";
  return key.trim() || undefined;
}

/**
 * Resuelve URL autenticada para actualizar método de pago (portal session)
 * y enlaces de management del GET subscription, más un resumen de tarjeta
 * desde GET /customers/{id}/payment-methods (sin almacenar PAN).
 */
export async function resolvePaddlePaymentMethodContext(
  subscriptionId: string,
  customerIdFromDb: string | null,
): Promise<{
  customerId: string | null;
  card: PaddleCardSummary;
  portalUpdatePaymentUrl: string | null;
  managementUpdatePaymentUrl: string | null;
}> {
  const apiKey = getApiKeyOptional();
  if (!apiKey) {
    return {
      customerId: customerIdFromDb,
      card: {},
      portalUpdatePaymentUrl: null,
      managementUpdatePaymentUrl: null,
    };
  }

  const subRes = await fetch(`${PADDLE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!subRes.ok) {
    throw new Error(`Paddle subscription read failed: ${subRes.status}`);
  }
  const subJson = (await subRes.json()) as {
    data?: {
      customer_id?: string;
      management_urls?: { update_payment_method?: string | null };
    };
  };
  const data = subJson.data;
  const customerId =
    typeof data?.customer_id === "string" && data.customer_id.length > 0 ? data.customer_id : customerIdFromDb;

  const managementRaw = data?.management_urls?.update_payment_method;
  const managementUpdatePaymentUrl =
    typeof managementRaw === "string" && managementRaw.length > 0 ? managementRaw : null;

  let card: PaddleCardSummary = {};
  if (customerId) {
    card = await fetchPaddleCustomerCardSummary(apiKey, customerId);
  }

  let portalUpdatePaymentUrl: string | null = null;
  if (customerId) {
    portalUpdatePaymentUrl = await createPaddlePortalUpdatePaymentMethodUrl(apiKey, customerId, subscriptionId);
  }

  return { customerId, card, portalUpdatePaymentUrl, managementUpdatePaymentUrl };
}

async function fetchPaddleCustomerCardSummary(apiKey: string, customerId: string): Promise<PaddleCardSummary> {
  const res = await fetch(
    `${PADDLE_API_BASE}/customers/${encodeURIComponent(customerId)}/payment-methods?per_page=10`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!res.ok) return {};
  const json = (await res.json()) as { data?: unknown[] };
  const items = json.data;
  if (!Array.isArray(items) || items.length === 0) return {};
  const pm = items[0] as Record<string, unknown>;
  const card = (typeof pm.card === "object" && pm.card !== null ? pm.card : null) as Record<string, unknown> | null;
  const lastRaw = (card?.last4 ?? card?.last_four ?? pm.last4 ?? pm.last_four) as string | number | undefined;
  const lastFour =
    lastRaw !== undefined && lastRaw !== null
      ? String(lastRaw).replace(/\D/g, "").slice(-4) || undefined
      : undefined;
  const scheme = (card?.type ?? card?.scheme ?? pm.type) as string | undefined;
  const cardType = typeof scheme === "string" && scheme.length > 0 ? formatCardScheme(scheme) : undefined;
  const expiryMonth = pickExpiryNumber(card?.expiry_month ?? card?.expiryMonth ?? pm.expiry_month);
  const expiryYear = pickExpiryNumber(card?.expiry_year ?? card?.expiryYear ?? pm.expiry_year);
  return { lastFour, cardType, expiryMonth, expiryYear };
}

function pickExpiryNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number.parseInt(v, 10);
  return undefined;
}

function formatCardScheme(raw: string): string {
  const s = raw.replace(/_/g, " ").trim();
  if (!s) return raw;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

async function createPaddlePortalUpdatePaymentMethodUrl(
  apiKey: string,
  customerId: string,
  subscriptionId: string,
): Promise<string | null> {
  const res = await fetch(`${PADDLE_API_BASE}/customers/${encodeURIComponent(customerId)}/portal-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subscription_ids: [subscriptionId] }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: {
      urls?: {
        subscriptions?: Array<{
          id?: string;
          update_subscription_payment_method?: string;
          update_payment_method?: string;
        }>;
        update_payment_method?: string;
      };
    };
  };
  const subs = json.data?.urls?.subscriptions;
  if (Array.isArray(subs)) {
    const entry = subs.find((s) => s?.id === subscriptionId) ?? subs[0];
    const u = entry?.update_subscription_payment_method ?? entry?.update_payment_method;
    if (typeof u === "string" && u.length > 0) return u;
  }
  const direct = json.data?.urls?.update_payment_method;
  if (typeof direct === "string" && direct.length > 0) return direct;
  return null;
}

export type PaddleSubscriptionItemUpdate = { price_id: string; quantity: number };

/**
 * Actualiza ítems de la suscripción con prorrata (Paddle factura/calcula).
 * No actualiza BD local: hacerlo solo si la llamada termina OK.
 */
export async function updateSubscriptionItemsWithProration(
  subscriptionId: string,
  items: PaddleSubscriptionItemUpdate[],
  prorationBillingMode: "prorated_immediately" = "prorated_immediately",
): Promise<{ nextBilledAt: string | null; currentPeriodEndsAt: string | null }> {
  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items,
      proration_billing_mode: prorationBillingMode,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`Paddle subscription update failed (${res.status}): ${detail}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const json = (await res.json()) as {
    data?: {
      next_billed_at?: string;
      current_billing_period?: { ends_at?: string };
    };
  };
  return {
    nextBilledAt: json.data?.next_billed_at ?? null,
    currentPeriodEndsAt: json.data?.current_billing_period?.ends_at ?? null,
  };
}

export async function scheduleSubscriptionCancelAtPeriodEnd(subscriptionId: string): Promise<{
  currentBillingPeriod?: { endsAt?: string };
}> {
  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scheduled_change: {
        action: "cancel",
        effective_at: "next_billing_period",
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Paddle cancel schedule failed (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as {
    data?: {
      current_billing_period?: { ends_at?: string };
    };
  };
  return {
    currentBillingPeriod: json.data?.current_billing_period?.ends_at
      ? { endsAt: json.data.current_billing_period.ends_at }
      : undefined,
  };
}

/** Cancel active subscription as soon as possible (e.g. account deletion). Fails soft if API errors. */
export async function cancelSubscriptionImmediately(subscriptionId: string): Promise<void> {
  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ effective_from: "immediately" }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Paddle cancel immediate failed (${res.status}): ${detail}`);
  }
}

export async function removeScheduledSubscriptionChange(subscriptionId: string): Promise<void> {
  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scheduled_change: null,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Paddle reactivate failed (${res.status}): ${detail}`);
  }
}
