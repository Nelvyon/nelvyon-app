import { PLAN_PRICES, PLAN_NAMES, type BillablePlan } from "../billing/planConfig";
import { readStripeKeyDiagnostic } from "../billing/stripePricePipelineTrace";
import { STRIPE_API_BASE } from "./stripeApi";

export type StripeProductSummary = {
  id: string;
  name: string;
  active: boolean;
  metadata: Record<string, string>;
};

export type StripePriceSummary = {
  id: string;
  active: boolean;
  currency: string;
  unitAmount: number | null;
  interval: string | null;
  productId: string;
  productName: string | null;
  nickname: string | null;
};

export type StripeCatalogAudit = {
  mode: "live" | "test" | "unknown";
  account: { id: string; email: string | null };
  activePrices: StripePriceSummary[];
  products: StripeProductSummary[];
};

type StripeListResponse<T> = {
  data: T[];
  has_more: boolean;
};

type StripePriceRaw = {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  nickname: string | null;
  recurring?: { interval?: string } | null;
  product: string | { id?: string; name?: string; active?: boolean; metadata?: Record<string, string> };
};

type StripeProductRaw = {
  id: string;
  name: string;
  active: boolean;
  metadata?: Record<string, string>;
};

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "";
  if (!key.trim()) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key.trim();
}

async function stripeCatalogRequest<T>(
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
  const res = await fetch(`${STRIPE_API_BASE}${path}`, { method, headers, body: payload });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Stripe API ${method} ${path} failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

function normalizeProduct(raw: StripePriceRaw["product"]): {
  productId: string;
  productName: string | null;
} {
  if (typeof raw === "string") return { productId: raw, productName: null };
  return { productId: raw.id ?? "unknown", productName: raw.name ?? null };
}

function toPriceSummary(raw: StripePriceRaw): StripePriceSummary {
  const { productId, productName } = normalizeProduct(raw.product);
  return {
    id: raw.id,
    active: raw.active,
    currency: raw.currency,
    unitAmount: raw.unit_amount,
    interval: raw.recurring?.interval ?? null,
    productId,
    productName,
    nickname: raw.nickname,
  };
}

/** Lista todos los prices activos con producto expandido. */
export async function listActiveStripePrices(): Promise<StripePriceSummary[]> {
  const prices: StripePriceSummary[] = [];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const qs = new URLSearchParams({ active: "true", limit: "100" });
    qs.append("expand[]", "data.product");
    if (startingAfter) qs.set("starting_after", startingAfter);

    const page = await stripeCatalogRequest<StripeListResponse<StripePriceRaw>>(
      "GET",
      `/prices?${qs.toString()}`,
    );
    for (const raw of page.data) {
      prices.push(toPriceSummary(raw));
    }
    hasMore = page.has_more;
    startingAfter = page.data.at(-1)?.id;
    if (!startingAfter) break;
  }
  return prices;
}

/** Lista productos activos. */
export async function listActiveStripeProducts(): Promise<StripeProductSummary[]> {
  const products: StripeProductSummary[] = [];
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const qs = new URLSearchParams({ active: "true", limit: "100" });
    if (startingAfter) qs.set("starting_after", startingAfter);

    const page = await stripeCatalogRequest<StripeListResponse<StripeProductRaw>>(
      "GET",
      `/products?${qs.toString()}`,
    );
    for (const raw of page.data) {
      products.push({
        id: raw.id,
        name: raw.name,
        active: raw.active,
        metadata: raw.metadata ?? {},
      });
    }
    hasMore = page.has_more;
    startingAfter = page.data.at(-1)?.id;
    if (!startingAfter) break;
  }
  return products;
}

export async function retrieveStripeAccountFull(): Promise<{ id: string; email: string | null }> {
  return stripeCatalogRequest<{ id: string; email: string | null }>("GET", "/account");
}

export async function auditStripeCatalog(): Promise<StripeCatalogAudit> {
  const keyDiag = readStripeKeyDiagnostic();
  const mode = keyDiag.prefix === "sk_live" ? "live" : keyDiag.prefix === "sk_test" ? "test" : "unknown";
  const [account, activePrices, products] = await Promise.all([
    retrieveStripeAccountFull(),
    listActiveStripePrices(),
    listActiveStripeProducts(),
  ]);
  return { mode, account, activePrices, products };
}

function planProductName(plan: BillablePlan): string {
  return `Nelvyon ${PLAN_NAMES[plan]}`;
}

function planUnitAmountCents(plan: BillablePlan): number {
  return Math.round(PLAN_PRICES[plan] * 100);
}

/** Busca producto activo cuyo nombre contiene el plan (p. ej. "Starter"). */
export function findProductForPlan(
  products: StripeProductSummary[],
  plan: BillablePlan,
): StripeProductSummary | null {
  const needle = plan.toLowerCase();
  const exact = products.find((p) => p.name.toLowerCase() === planProductName(plan).toLowerCase());
  if (exact) return exact;
  return (
    products.find((p) => p.active && p.name.toLowerCase().includes(needle)) ??
    products.find((p) => p.metadata?.plan?.toLowerCase() === needle) ??
    null
  );
}

/** Busca price activo mensual EUR que coincida con el plan en la cuenta API. */
export function findActivePriceForPlan(
  prices: StripePriceSummary[],
  plan: BillablePlan,
  productId?: string,
): StripePriceSummary | null {
  const expectedCents = planUnitAmountCents(plan);
  const matches = prices.filter((p) => {
    if (!p.active) return false;
    if (p.currency !== "eur") return false;
    if (p.interval !== "month") return false;
    if (productId && p.productId !== productId) return false;
    return p.unitAmount === expectedCents;
  });
  return matches[0] ?? null;
}

export async function createStripeProduct(plan: BillablePlan): Promise<StripeProductSummary> {
  const raw = await stripeCatalogRequest<StripeProductRaw>("POST", "/products", {
    name: planProductName(plan),
    "metadata[plan]": plan,
    "metadata[nelvyon]": "true",
  });
  return { id: raw.id, name: raw.name, active: raw.active, metadata: raw.metadata ?? {} };
}

export async function createStripeRecurringPrice(
  plan: BillablePlan,
  productId: string,
): Promise<StripePriceSummary> {
  const raw = await stripeCatalogRequest<StripePriceRaw>("POST", "/prices", {
    product: productId,
    currency: "eur",
    unit_amount: planUnitAmountCents(plan),
    "recurring[interval]": "month",
    nickname: `${PLAN_NAMES[plan]} Monthly`,
    "metadata[plan]": plan,
    "metadata[nelvyon]": "true",
  });
  return toPriceSummary(raw);
}
