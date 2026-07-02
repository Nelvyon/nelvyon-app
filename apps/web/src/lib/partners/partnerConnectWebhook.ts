import Stripe from "stripe";

import { DbClient } from "../../../../../backend/db/DbClient";
import {
  getPartnerStripeAccountByStripeId,
  insertLedgerEntry,
  upsertPartnerStripeAccount,
} from "@/lib/partners/partnerConnectStore";
import {
  mapStripeAccountStatus,
  type StripeAccountSnapshot,
} from "@/lib/partners/partnerStripeConnect";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "";
  if (!key.trim()) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key.trim());
}

function connectWebhookSecret(): string {
  const secret =
    process.env.STRIPE_WEBHOOK_CONNECT_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    "";
  if (!secret) throw new Error("STRIPE_WEBHOOK_CONNECT_SECRET is not configured");
  return secret;
}

function centsToEur(cents: number): number {
  return Math.round(cents) / 100;
}

function metaPartnerWs(meta: Stripe.Metadata | null | undefined): number | null {
  const raw = meta?.partner_workspace_id;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function metaClientWs(meta: Stripe.Metadata | null | undefined): number | null {
  const raw = meta?.client_workspace_id;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function handleAccountUpdated(account: StripeAccountSnapshot): Promise<void> {
  const row = await getPartnerStripeAccountByStripeId(account.id);
  if (!row) return;
  await upsertPartnerStripeAccount({
    partnerWorkspaceId: row.partner_workspace_id,
    partnerUserId: row.partner_user_id,
    stripeAccountId: account.id,
    onboardingStatus: mapStripeAccountStatus(account),
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });
}

async function recordConnectLedger(params: {
  partnerWorkspaceId: number;
  clientWorkspaceId: number | null;
  eventType: "pack_payment" | "subscription_invoice";
  stripeEventId: string;
  grossEur: number;
  wholesaleEur: number;
  description: string;
}): Promise<void> {
  await insertLedgerEntry({
    partnerWorkspaceId: params.partnerWorkspaceId,
    clientWorkspaceId: params.clientWorkspaceId,
    eventType: params.eventType,
    stripeEventId: params.stripeEventId,
    grossEur: params.grossEur,
    wholesaleEur: params.wholesaleEur,
    partnerMarginEur: Math.max(0, params.grossEur - params.wholesaleEur),
    description: params.description,
  });
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const partnerWs = metaPartnerWs(pi.metadata);
  if (!partnerWs) return;
  const clientWs = metaClientWs(pi.metadata);
  const grossEur = centsToEur(pi.amount);
  const wholesaleEur = pi.application_fee_amount != null ? centsToEur(pi.application_fee_amount) : 0;
  const packSku = pi.metadata?.pack_sku ?? "pack";
  await recordConnectLedger({
    partnerWorkspaceId: partnerWs,
    clientWorkspaceId: clientWs,
    eventType: "pack_payment",
    stripeEventId: pi.id,
    grossEur,
    wholesaleEur,
    description: `Stripe PI succeeded — ${packSku}`,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const partnerWs = metaPartnerWs(invoice.metadata);
  if (!partnerWs && invoice.subscription) {
    /* subscription on connected account — skip platform invoices without metadata */
    return;
  }
  if (!partnerWs) return;
  const clientWs = metaClientWs(invoice.metadata);
  const grossEur = centsToEur(invoice.amount_paid ?? 0);
  const wholesaleEur = invoice.application_fee_amount != null ? centsToEur(invoice.application_fee_amount) : 0;
  await recordConnectLedger({
    partnerWorkspaceId: partnerWs,
    clientWorkspaceId: clientWs,
    eventType: "subscription_invoice",
    stripeEventId: invoice.id,
    grossEur,
    wholesaleEur,
    description: `Invoice paid — subscription ${invoice.subscription ?? ""}`.trim(),
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const partnerWs = metaPartnerWs(sub.metadata);
  const clientWs = metaClientWs(sub.metadata);
  if (!partnerWs || !clientWs) return;
  const status = sub.status === "active" ? "active" : sub.status === "canceled" ? "canceled" : "past_due";
  await DbClient.getInstance().query(
    `UPDATE partner_client_billing SET status=$4, stripe_subscription_id=$3, updated_at=NOW()
     WHERE partner_workspace_id=$1 AND client_workspace_id=$2`,
    [partnerWs, clientWs, sub.id, status],
  ).catch(() => undefined);
}

export async function handleStripeConnectWebhook(
  rawBody: string,
  signatureHeader: string,
): Promise<void> {
  const event = getStripe().webhooks.constructEvent(rawBody, signatureHeader, connectWebhookSecret());

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as StripeAccountSnapshot;
      await handleAccountUpdated(account);
      break;
    }
    case "payment_intent.succeeded": {
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    }
    case "invoice.paid": {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  await DbClient.getInstance()
    .query(
      `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, status, received_at, processed_at)
     VALUES ($1, $2, 'processed', NOW(), NOW())
     ON CONFLICT (stripe_event_id) DO NOTHING`,
      [event.id, event.type],
    )
    .catch(() => undefined);
}
