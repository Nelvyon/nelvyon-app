import Stripe from "stripe";

import { DbClient } from "../../../../../backend/db/DbClient";
import { getPartnerStripeAccountByStripeId, upsertPartnerStripeAccount } from "@/lib/partners/partnerConnectStore";
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
