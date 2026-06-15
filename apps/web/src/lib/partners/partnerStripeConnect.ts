import type { PartnerOnboardingStatus } from "@/lib/partners/partnerConnectTypes";

const STRIPE_API = "https://api.stripe.com/v1";

export function isStripeConnectConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "";
  return Boolean(key.trim());
}

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "";
  if (!key.trim()) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key.trim();
}

async function stripeForm<T>(method: string, path: string, body?: Record<string, string>): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
  };
  let payload: string | undefined;
  if (body) {
    payload = new URLSearchParams(body).toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const res = await fetch(`${STRIPE_API}${path}`, { method, headers, body: payload });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Stripe ${method} ${path} failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export type StripeAccountSnapshot = {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: { disabled_reason?: string | null };
};

export function mapStripeAccountStatus(account: StripeAccountSnapshot): PartnerOnboardingStatus {
  if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
    return "active";
  }
  const disabled = account.requirements?.disabled_reason;
  if (disabled && disabled !== "requirements.pending_verification") {
    return "restricted";
  }
  if (account.details_submitted) return "pending";
  return "pending";
}

export function connectStatusLabel(status: PartnerOnboardingStatus): string {
  switch (status) {
    case "active":
      return "Completo";
    case "restricted":
      return "Restringido";
    case "pending":
      return "Pendiente";
    case "not_started":
    default:
      return "Sin configurar";
  }
}

export async function createExpressConnectAccount(params: {
  email: string;
  partnerWorkspaceId: number;
  partnerUserId: string;
}): Promise<StripeAccountSnapshot> {
  return stripeForm<StripeAccountSnapshot>("POST", "/accounts", {
    type: "express",
    country: "ES",
    email: params.email,
    "capabilities[card_payments][requested]": "true",
    "capabilities[transfers][requested]": "true",
    "metadata[partner_workspace_id]": String(params.partnerWorkspaceId),
    "metadata[partner_user_id]": params.partnerUserId,
  });
}

export async function createConnectAccountLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  return stripeForm<{ url: string }>("POST", "/account_links", {
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
}

export async function retrieveConnectAccount(accountId: string): Promise<StripeAccountSnapshot> {
  return stripeForm<StripeAccountSnapshot>("GET", `/accounts/${encodeURIComponent(accountId)}`);
}
