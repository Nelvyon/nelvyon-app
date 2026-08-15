import Stripe from "stripe";

import { CancellationService } from "../billing/cancellationService";
import { DunningService, resolveTenantIdFromUserId } from "../billing/dunningService";
import { mapStripePriceToNelvyon } from "./stripeApi";
import { mapBillablePlanToSaasPlan, shouldSyncSaasTenantPlan } from "../saas/saasTenantMapper";
import type { DbClient } from "../db/DbClient";
import { sendEmail } from "../email";
import { dateLocaleTag, resolveUserEmailLocale } from "../email/resolveUserEmailLocale";
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

function logStripeEvent(event: Stripe.Event, detail: Record<string, unknown>): void {
  console.error(
    `[stripe-webhook] ${event.type}`,
    JSON.stringify({ eventId: event.id, ...detail }),
  );
}

export async function processStripeEvent(event: Stripe.Event, db: DbClient): Promise<void> {
  const dunning = DunningService.getInstance();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (!userId) {
        logStripeEvent(event, { skipped: "missing_user_id" });
        return;
      }

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

      let plan = "starter";
      let periodEnd: Date | null = null;
      let cancelAtPeriodEnd = false;
      let status = "active";

      if (subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        plan = mapStripePriceToNelvyon(priceIdFromSubscription(sub));
        periodEnd = periodEndFromSubscription(sub);
        cancelAtPeriodEnd = sub.cancel_at_period_end === true;
        status = mapStripeStatus(sub.status);
      }

      const wasSuspended = await isTenantSuspended(db, userId);
      await upsertSubscription(db, {
        eventAt: new Date(event.created * 1000),
        eventId: event.id,
        userId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        plan,
        periodEnd,
        cancelAtPeriodEnd,
        status,
      });

      const tenantId = session.metadata?.tenant_id ?? (await resolveTenantIdFromUserId(db, userId));
      if (wasSuspended && tenantId && subscriptionId) {
        await dunning.handleReactivation(tenantId, subscriptionId);
      } else {
        await notifyPlanActivated(db, userId, plan, periodEnd);
      }

      if (tenantId) {
        const { maybeEarnLoyaltyFromCheckout } = await import("../saas/stripeLoyaltyEarn");
        await maybeEarnLoyaltyFromCheckout(
          db,
          tenantId,
          session.metadata ?? undefined,
          session.amount_total,
          session.id,
        );
      }

      logStripeEvent(event, { userId, plan, subscriptionId, customerId, tenantId });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) {
        logStripeEvent(event, { skipped: "missing_user_id" });
        return;
      }

      const plan = mapStripePriceToNelvyon(priceIdFromSubscription(sub));
      const periodEnd = periodEndFromSubscription(sub);
      const status = mapStripeStatus(sub.status);
      const wasSuspended = await isTenantSuspended(db, userId);

      await upsertSubscription(db, {
        eventAt: new Date(event.created * 1000),
        eventId: event.id,
        userId,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        plan,
        periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
        status,
      });

      const tenantId = sub.metadata?.tenant_id ?? (await resolveTenantIdFromUserId(db, userId));
      if (wasSuspended && tenantId) {
        await dunning.handleReactivation(tenantId, sub.id);
      } else if (event.type === "customer.subscription.created") {
        await notifyPlanActivated(db, userId, plan, periodEnd);
      }

      logStripeEvent(event, { userId, plan, status, subscriptionId: sub.id, tenantId });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (!userId) {
        logStripeEvent(event, { skipped: "missing_user_id" });
        return;
      }

      const tenantId = await resolveTenantIdFromUserId(db, userId);
      const subStatus = await getSubscriptionStatus(db, userId);
      if (subStatus === "past_due" || subStatus === "suspended") {
        if (tenantId) {
          await dunning.handleSuspension(tenantId, sub.id);
        }
        logStripeEvent(event, { userId, action: "suspension", tenantId });
        break;
      }

      const cancellation = CancellationService.getInstance();
      const voluntary = await cancellation.isVoluntaryCancellationPending(userId);
      if (voluntary) {
        await cancellation.processCancellation(userId);
        logStripeEvent(event, { userId, action: "voluntary_cancel" });
        break;
      }

      // Misma garantia de recencia que el upsert: un `deleted` antiguo no puede
      // cancelar una suscripcion reactivada despues.
      await db.query(
        `UPDATE subscriptions
            SET status='canceled',
                last_stripe_event_at=$2,
                last_stripe_event_id=$3,
                updated_at=now()
          WHERE user_id::text=$1
            AND (last_stripe_event_at IS NULL OR last_stripe_event_at < $2)`,
        [userId, new Date(event.created * 1000), event.id],
      );
      await downgradeSaasTenantPlan(db, userId);
      const email = await getUserEmail(db, userId);
      const periodEnd = periodEndFromSubscription(sub);
      if (email) {
        const locale = await resolveUserEmailLocale(db, userId);
        await sendEmail(
          "cancellation",
          {
            email,
            accessUntil: periodEnd?.toLocaleDateString(dateLocaleTag(locale)) ?? "—",
            appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com",
          },
          locale,
        );
      }
      logStripeEvent(event, { userId, action: "canceled" });
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRaw = invoice.subscription;
      const subscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id ?? "";
      if (!subscriptionId) {
        logStripeEvent(event, { skipped: "no_subscription" });
        return;
      }

      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const userId = sub.metadata?.user_id;
      if (!userId) {
        logStripeEvent(event, { skipped: "missing_user_id", subscriptionId });
        return;
      }

      const plan = mapStripePriceToNelvyon(priceIdFromSubscription(sub));
      const status = mapStripeStatus(sub.status);
      const tenantId = sub.metadata?.tenant_id ?? (await resolveTenantIdFromUserId(db, userId));
      const wasPastDue = (await getSubscriptionStatus(db, userId)) === "past_due";

      await upsertSubscription(db, {
        eventAt: new Date(event.created * 1000),
        eventId: event.id,
        userId,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        plan,
        periodEnd: periodEndFromSubscription(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
        status,
      });

      if (wasPastDue && tenantId) {
        await dunning.handleReactivation(tenantId, sub.id);
      }

      logStripeEvent(event, { userId, plan, status, subscriptionId, invoiceId: invoice.id, tenantId });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRaw = invoice.subscription;
      const subscriptionId = typeof subRaw === "string" ? subRaw : subRaw?.id ?? "";
      if (!subscriptionId) {
        logStripeEvent(event, { skipped: "no_subscription" });
        return;
      }

      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const userId = sub.metadata?.user_id;
      if (!userId) {
        logStripeEvent(event, { skipped: "missing_user_id", subscriptionId });
        return;
      }

      await upsertSubscription(db, {
        eventAt: new Date(event.created * 1000),
        eventId: event.id,
        userId,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        plan: mapStripePriceToNelvyon(priceIdFromSubscription(sub)),
        periodEnd: periodEndFromSubscription(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
        status: "past_due",
      });

      const tenantId = await resolveTenantIdFromUserId(db, userId);
      const attemptNumber = invoice.attempt_count ?? 1;
      if (tenantId) {
        await dunning.handlePaymentFailed(tenantId, subscriptionId, attemptNumber, event.id);
      }

      logStripeEvent(event, { userId, subscriptionId, attemptNumber, tenantId });
      break;
    }
    default:
      break;
  }
}

export async function handleStripeWebhook(rawBody: string, signatureHeader: string, db: DbClient): Promise<void> {
  const event = verifyStripeWebhook(rawBody, signatureHeader);
  await processStripeEvent(event, db);
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
    /** `event.created` del evento que origina la mutacion. Obligatorio: sin el
     *  no hay forma de rechazar un evento antiguo. */
    eventAt: Date;
    /** `event.id`, solo para trazabilidad: NO es orden cronologico. */
    eventId: string;
  },
): Promise<void> {
  const status = opts.status ?? "active";

  await db.query(
    `INSERT INTO subscriptions
       (user_id, stripe_subscription_id, stripe_customer_id,
        plan, status, current_period_end, cancel_at_period_end,
        last_stripe_event_at, last_stripe_event_id, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
     ON CONFLICT (user_id) DO UPDATE SET
       stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       last_stripe_event_at = EXCLUDED.last_stripe_event_at,
       last_stripe_event_id = EXCLUDED.last_stripe_event_id,
       updated_at = now()
     WHERE subscriptions.last_stripe_event_at IS NULL
        OR subscriptions.last_stripe_event_at < EXCLUDED.last_stripe_event_at`,
    [
      opts.userId,
      opts.stripeSubscriptionId,
      opts.stripeCustomerId,
      opts.plan,
      status,
      opts.periodEnd,
      opts.cancelAtPeriodEnd,
      opts.eventAt,
      opts.eventId,
    ],
  );

  if (!shouldSyncSaasTenantPlan(status)) {
    return;
  }

  await db.query(`UPDATE nelvyon_users SET plan = $2, updated_at = now() WHERE user_id = $1`, [
    opts.userId,
    opts.plan,
  ]);

  const saasPlan = mapBillablePlanToSaasPlan(opts.plan);
  await db.query(`UPDATE saas_tenants SET plan = $2, updated_at = now() WHERE user_id = $1`, [
    opts.userId,
    saasPlan,
  ]);

  try {
    const tenantRows = await db.query<{ id: string }>(
      `SELECT id FROM saas_tenants WHERE user_id = $1 LIMIT 1`,
      [opts.userId],
    );
    const tenantId = tenantRows[0]?.id;
    if (tenantId) {
      const { grantPackEntitlementsForTenant } = await import("../saas/SaasPackStoreService");
      await grantPackEntitlementsForTenant(db, tenantId);
    }
  } catch (err) {
    console.error("[stripe] grantFromPlan after plan sync failed:", err);
  }
}

async function downgradeSaasTenantPlan(db: DbClient, userId: string): Promise<void> {
  await db.query(`UPDATE nelvyon_users SET plan = 'starter', updated_at = now() WHERE user_id = $1`, [userId]);
  await db.query(`UPDATE saas_tenants SET plan = 'starter', updated_at = now() WHERE user_id = $1`, [userId]);
}

async function notifyPlanActivated(
  db: DbClient,
  userId: string,
  plan: string,
  periodEnd: Date | null,
): Promise<void> {
  const email = await getUserEmail(db, userId);
  if (email) {
    const locale = await resolveUserEmailLocale(db, userId);
    await sendEmail(
      "plan_activated",
      {
        email,
        plan,
        periodEnd: periodEnd?.toLocaleDateString(dateLocaleTag(locale)) ?? "—",
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com",
      },
      locale,
    );
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
