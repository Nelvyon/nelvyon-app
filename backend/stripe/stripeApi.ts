import type { BillablePlan } from "../billing/planConfig";
import { getStripePriceEnvVarName, getStripePriceId } from "../billing/planConfig";

export const STRIPE_API_BASE = "https://api.stripe.com/v1";

/** Price ID from env does not exist in the connected Stripe account (Live/Test mismatch or typo). */
export class StripePriceNotFoundError extends Error {
  readonly name = "StripePriceNotFoundError";

  constructor(
    readonly plan: BillablePlan,
    readonly priceId: string,
    readonly envVar: string,
    readonly stripeMessage: string,
  ) {
    super(
      `Price ID inexistente en Stripe: ${priceId} (${envVar}). ${stripeMessage}`,
    );
  }
}

/** Fallback billing portal when API is unavailable. */
export const STRIPE_BILLING_PORTAL_FALLBACK =
  process.env.STRIPE_BILLING_PORTAL_FALLBACK ?? "https://billing.stripe.com/p/login/test";

export type StripeCardSummary = {
  lastFour?: string;
  cardType?: string;
  expiryMonth?: number;
  expiryYear?: number;
};

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "";
  if (!key.trim()) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return key.trim();
}

function getSecretKeyOptional(): string | undefined {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "";
  return key.trim() || undefined;
}

async function stripeRequest<T>(
  method: string,
  path: string,
  body?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getSecretKey()}`,
  };
  let payload: string | undefined;
  if (body) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined || v === null) continue;
      params.append(k, String(v));
    }
    payload = params.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers,
    body: payload,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`Stripe API ${method} ${path} failed (${res.status}): ${detail}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

type StripeApiFailure = {
  httpStatus: number;
  stripeMessage: string;
  stripeType?: string;
  stripeCode?: string;
  raw: string;
};

function parseStripeApiFailure(message: string): StripeApiFailure | null {
  const match = message.match(/Stripe API \w+ .+ failed \((\d+)\):([\s\S]*)$/);
  if (!match) return null;

  const httpStatus = Number(match[1]);
  const raw = match[2]?.trim() ?? "";
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; type?: string; code?: string };
    };
    const stripeErr = parsed.error;
    return {
      httpStatus,
      stripeMessage: stripeErr?.message ?? raw,
      stripeType: stripeErr?.type,
      stripeCode: stripeErr?.code,
      raw,
    };
  } catch {
    return { httpStatus, stripeMessage: raw || message, raw };
  }
}

/** stripe.prices.retrieve — valida que el Price ID existe en la cuenta Stripe conectada. */
export async function retrieveStripePrice(priceId: string): Promise<{ id: string; active: boolean }> {
  return stripeRequest<{ id: string; active: boolean }>(
    "GET",
    `/prices/${encodeURIComponent(priceId)}`,
  );
}

/**
 * Resuelve STRIPE_PRICE_ID_* y verifica en Stripe antes de crear checkout.
 * @throws StripePriceNotFoundError si el price no existe (404 / resource_missing)
 */
export async function validateStripePriceForPlan(plan: BillablePlan): Promise<string> {
  const priceId = getStripePriceId(plan);
  const envVar = getStripePriceEnvVarName(plan);

  try {
    const price = await retrieveStripePrice(priceId);
    if (!price.active) {
      throw new StripePriceNotFoundError(
        plan,
        priceId,
        envVar,
        `El price existe pero está inactivo en Stripe Dashboard`,
      );
    }
    return priceId;
  } catch (e: unknown) {
    if (e instanceof StripePriceNotFoundError) {
      throw e;
    }
    const message = e instanceof Error ? e.message : String(e);
    const failure = parseStripeApiFailure(message);
    if (
      failure &&
      (failure.httpStatus === 404 ||
        failure.stripeCode === "resource_missing" ||
        failure.stripeMessage.toLowerCase().includes("no such price"))
    ) {
      throw new StripePriceNotFoundError(plan, priceId, envVar, failure.stripeMessage);
    }
    throw e;
  }
}

export function mapStripePriceToNelvyon(priceId: string): string {
  const map: Record<string, string> = {};
  for (const plan of ["starter", "pro", "agency"] as BillablePlan[]) {
    try {
      map[getStripePriceId(plan)] = plan;
    } catch {
      /* env may be partial in tests */
    }
  }
  return map[priceId] ?? "starter";
}

export async function createSubscriptionCheckoutSession(opts: {
  userId: string;
  email: string;
  plan: BillablePlan;
  successUrl: string;
  cancelUrl: string;
  couponId?: string | null;
  customerId?: string | null;
}): Promise<{ url: string | null; sessionId: string }> {
  const priceId = await validateStripePriceForPlan(opts.plan);
  const body: Record<string, string | number | boolean | undefined> = {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.userId,
    "metadata[user_id]": opts.userId,
    "subscription_data[metadata][user_id]": opts.userId,
    customer_email: opts.customerId ? undefined : opts.email,
    customer: opts.customerId ?? undefined,
  };
  if (opts.couponId) {
    body["discounts[0][coupon]"] = opts.couponId;
  }
  const session = await stripeRequest<{ id: string; url: string | null }>("POST", "/checkout/sessions", body);
  return { url: session.url, sessionId: session.id };
}

export async function updateSubscriptionItemsWithProration(
  subscriptionId: string,
  priceId: string,
): Promise<{ nextBilledAt: string | null; currentPeriodEndsAt: string | null }> {
  const sub = await stripeRequest<{
    items: { data: Array<{ id: string }> };
    current_period_end?: number;
  }>("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);

  const itemId = sub.items?.data?.[0]?.id;
  if (!itemId) {
    throw new Error("Stripe subscription has no line items");
  }

  const updated = await stripeRequest<{
    current_period_end?: number;
    billing_cycle_anchor?: number;
  }>("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    "items[0][id]": itemId,
    "items[0][price]": priceId,
    proration_behavior: "always_invoice",
  });

  const periodEnd = updated.current_period_end
    ? new Date(updated.current_period_end * 1000).toISOString()
    : null;
  return { nextBilledAt: periodEnd, currentPeriodEndsAt: periodEnd };
}

export async function scheduleSubscriptionCancelAtPeriodEnd(subscriptionId: string): Promise<{
  currentBillingPeriod?: { endsAt?: string };
}> {
  const updated = await stripeRequest<{ current_period_end?: number }>(
    "POST",
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { cancel_at_period_end: true },
  );
  return {
    currentBillingPeriod: updated.current_period_end
      ? { endsAt: new Date(updated.current_period_end * 1000).toISOString() }
      : undefined,
  };
}

export async function cancelSubscriptionImmediately(subscriptionId: string): Promise<void> {
  await stripeRequest("DELETE", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function removeScheduledSubscriptionChange(subscriptionId: string): Promise<void> {
  await stripeRequest("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    cancel_at_period_end: false,
  });
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string | null> {
  const session = await stripeRequest<{ url: string | null }>("POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export async function resolveStripePaymentMethodContext(
  subscriptionId: string,
  customerIdFromDb: string | null,
): Promise<{
  customerId: string | null;
  card: StripeCardSummary;
  portalUpdatePaymentUrl: string | null;
}> {
  const apiKey = getSecretKeyOptional();
  if (!apiKey) {
    return { customerId: customerIdFromDb, card: {}, portalUpdatePaymentUrl: null };
  }

  const sub = await stripeRequest<{
    customer: string | { id?: string };
    default_payment_method?: string | { card?: Record<string, unknown> };
  }>(
    "GET",
    `/subscriptions/${encodeURIComponent(subscriptionId)}?expand%5B0%5D=default_payment_method`,
  );

  let customerId: string | null = customerIdFromDb;
  if (typeof sub.customer === "string") {
    customerId = sub.customer;
  } else if (sub.customer && typeof sub.customer === "object" && sub.customer.id) {
    customerId = sub.customer.id;
  }

  let card: StripeCardSummary = {};
  const pm = sub.default_payment_method;
  if (pm && typeof pm === "object" && pm.card && typeof pm.card === "object") {
    const c = pm.card as Record<string, unknown>;
    const last4 = c.last4 as string | undefined;
    const brand = c.brand as string | undefined;
    card = {
      lastFour: last4,
      cardType: brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : undefined,
      expiryMonth: typeof c.exp_month === "number" ? c.exp_month : undefined,
      expiryYear: typeof c.exp_year === "number" ? c.exp_year : undefined,
    };
  }

  let portalUpdatePaymentUrl: string | null = null;
  if (customerId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
    portalUpdatePaymentUrl = await createBillingPortalSession(
      customerId,
      `${appUrl}/dashboard/settings`,
    );
  }

  return { customerId, card, portalUpdatePaymentUrl };
}
