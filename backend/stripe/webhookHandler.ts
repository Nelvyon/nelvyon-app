import Stripe from "stripe";

import { CancellationService } from "../billing/cancellationService";
import { DunningService, resolveTenantIdFromUserId } from "../billing/dunningService";
import { mapStripePriceToNelvyon } from "./stripeApi";
import type { DbClient } from "../db/DbClient";
import { sendEmail } from "../email";
import { completeStep } from "../onboarding";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "";
  if (!key.trim()) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key.trim());
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret.trim()) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return getStripe().webhooks.constructEvent(rawBody, signatureHeader, secret.trim());
}

function periodEndFromSubscription(sub: Stripe.Subscription): Date | null {
  if (sub.current_period_end) {
    return new Date(sub.current_period_end * 1000);
  }
  return null;
}

function priceIdFromSubscription(sub: Stripe.Subscription): string {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  if (typeof price === "string") return price;
  return price?.id ?? "";
}

export async function handleStripeWebhook(rawBody: string, signatureHeader: string, db: DbClient): Promise<void> {
  const event = verifyStripeWebhook(rawBody, signatureHeader);
  const dunning = DunningService.getInstance();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (!userId) return;

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

      let plan = "starter";
      let periodEnd: Date | null = null;
      let cancelAtPeriodEnd = false;

      if (subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        plan = mapStripePriceToNelvyon(priceIdFromSubscription(sub));
        periodEnd = periodEndFromSubscription(sub);
        cancelAtPeriodEnd = sub.cancel_at_period_end === true;
      }

      const wasSuspended = await isTenantSuspended(db, userId);
      await upsertSubscription(db, {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        plan,
        periodEnd,
        cancelAtPeriodEnd,
      });

      const tenantId = await resolveTenantIdFromUserId(db, userId);
      if (wasSuspended && tenantId && subscriptionId) {
        await dunning.handleReactivation(tenantId, subscriptionId);
      } else {
        await notifyPlanActivated(db, userId, plan, periodEnd);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) return;

      const plan = mapStripePriceToNelvyon(priceIdFromSubscription(sub));
      const periodEnd = periodEndFromSubscription(sub);
      const wasSuspended = await isTenantSuspended(db, userId);

      await upsertSubscription(db, {
        userId,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        plan,
        periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
        status: mapStripeStatus(sub.status),
      });

      const tenantId = await resolveTenantIdFromUserId(db, userId);
      if (wasSuspended && tenantId) {
        await dunning.handleReactivation(tenantId, sub.id);
      } else if (event.type === "customer.subscription.created") {
        await notifyPlanActivated(db, userId, plan, periodEnd);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) return;

      const tenantId = await resolveTenantIdFromUserId(db, userId);
      const subStatus = await getSubscriptionStatus(db, userId);
      if (subStatus === "past_due" || subStatus === "suspended") {
        if (tenantId) {
          await dunning.handleSuspension(tenantId, sub.id);
        }
        break;
      }

      const cancellation = CancellationService.getInstance();
      const voluntary = await cancellation.isVoluntaryCancellationPending(userId);
      if (voluntary) {
        await cancellation.processCancellation(userId);
        break;
      }

      await db.query(`UPDATE subscriptions SET status='canceled', updated_at=now() WHERE user_id::text=$1`, [userId]);
      const email = await getUserEmail(db, userId);
      const periodEnd = periodEndFromSubscription(sub);
      if (email) {
        await sendEmail("cancellation", {
          email,
          accessUntil: periodEnd?.toLocaleDateString("es-ES") ?? "—",
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com",
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRaw = invoice.subscription;
      const subscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id ?? "";
      if (!subscriptionId) return;

      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const userId = sub.metadata?.user_id;
      if (!userId) return;

      const tenantId = await resolveTenantIdFromUserId(db, userId);
      const attemptNumber = invoice.attempt_count ?? 1;
      if (tenantId) {
        await dunning.handlePaymentFailed(tenantId, subscriptionId, attemptNumber, event.id);
      }
      break;
    }
    default:
      break;
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") return status;
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "paused") return "paused";
  return status;
}

async function upsertSubscription(
  db: DbClient,
  opts: {
    userId: string;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
    plan: string;
    periodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    status?: string;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO subscriptions
       (user_id, stripe_subscription_id, stripe_customer_id,
        plan, status, current_period_end, cancel_at_period_end, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,now())
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at = now()`,
    [
      opts.userId,
      opts.stripeSubscriptionId,
      opts.stripeCustomerId,
      opts.plan,
      opts.status ?? "active",
      opts.periodEnd,
      opts.cancelAtPeriodEnd,
    ],
  );
  await db.query(`UPDATE nelvyon_users SET plan = $2, updated_at = now() WHERE user_id = $1`, [
    opts.userId,
    opts.plan,
  ]);
}

async function notifyPlanActivated(
  db: DbClient,
  userId: string,
  plan: string,
  periodEnd: Date | null,
): Promise<void> {
  const email = await getUserEmail(db, userId);
  if (email) {
    await sendEmail("plan_activated", {
      email,
      plan,
      periodEnd: periodEnd?.toLocaleDateString("es-ES") ?? "—",
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com",
    });
  }
  try {
    await completeStep(userId, "plan_activated");
  } catch (err) {
    console.error("[stripe] onboarding plan_activated step failed:", err);
  }
}

async function getUserEmail(db: DbClient, userId: string): Promise<string | null> {
  const rows = await db.query<{ email: string }>("SELECT email FROM nelvyon_users WHERE user_id = $1", [userId]);
  return rows[0]?.email ?? null;
}

async function getSubscriptionStatus(db: DbClient, userId: string): Promise<string | null> {
  const rows = await db.query<{ status: string }>(
    `SELECT status FROM subscriptions WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0]?.status ?? null;
}

async function isTenantSuspended(db: DbClient, userId: string): Promise<boolean> {
  const rows = await db.query<{ plan: string }>(`SELECT plan FROM nelvyon_users WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0]?.plan === "suspended";
}
