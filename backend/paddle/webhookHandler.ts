import crypto from "crypto";

import { CancellationService } from "../billing/cancellationService";
import { DunningService, resolveTenantIdFromUserId } from "../billing/dunningService";
import type { DbClient } from "../db/DbClient";
import { sendEmail } from "../email";
import { completeStep } from "../onboarding";

export type PaddleEventType =
  | "checkout.completed"
  | "subscription.activated"
  | "subscription.updated"
  | "subscription.canceled"
  | "subscription.payment.failed"
  | "subscription.payment_failed";

export function mapPaddlePlanToNelvyon(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.PADDLE_PRICE_STARTER ?? "pri_starter"]: "starter",
    [process.env.PADDLE_PRICE_PRO ?? "pri_pro"]: "pro",
    [process.env.PADDLE_PRICE_AGENCY ?? "pri_agency"]: "agency",
  };
  return map[priceId] ?? "starter";
}

export function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  try {
    const parts: Record<string, string> = {};
    for (const segment of signatureHeader.split(";")) {
      const idx = segment.indexOf("=");
      if (idx <= 0) continue;
      const k = segment.slice(0, idx).trim();
      const v = segment.slice(idx + 1).trim();
      parts[k] = v;
    }
    const ts = parts.ts;
    const h1 = parts.h1;
    if (!ts || !h1) return false;
    const payload = `${ts}:${rawBody}`;
    const expectedHex = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const received = Buffer.from(h1, "hex");
    const expected = Buffer.from(expectedHex, "hex");
    if (received.length !== expected.length || received.length === 0) return false;
    return crypto.timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

export async function handlePaddleWebhook(rawBody: string, signatureHeader: string, db: DbClient): Promise<void> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? "";
  if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
    throw new Error("Invalid Paddle signature");
  }
  const event = JSON.parse(rawBody) as {
    event_type: PaddleEventType;
    data: Record<string, unknown>;
  };
  const data = event.data as {
    id?: string;
    customer_id?: string;
    custom_data?: { user_id?: string };
    items?: Array<{ price?: { id?: string } }>;
    current_billing_period?: { ends_at?: string };
    scheduled_change?: { action?: string };
    status?: string;
    billing_details?: { payment_attempt_count?: number };
  };
  const userId = data.custom_data?.user_id;
  if (!userId) return;
  const paddleSubId = data.id ?? null;
  const paddleCustomerId = data.customer_id ?? null;
  const priceId = data.items?.[0]?.price?.id ?? "";
  const plan = mapPaddlePlanToNelvyon(priceId);
  const periodEnd = data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null;
  const cancelAtPeriodEnd = data.scheduled_change?.action === "cancel";
  const normalizedEvent = event.event_type.replace(/_/g, ".") as PaddleEventType;
  const dunning = DunningService.getInstance();
  const tenantId = await resolveTenantIdFromUserId(db, userId);
  const subscriptionId = paddleSubId ?? "";

  switch (normalizedEvent) {
    case "checkout.completed":
    case "subscription.activated":
    case "subscription.updated": {
      const wasSuspended = await isTenantSuspended(db, userId);
      await db.query(
        `INSERT INTO subscriptions
           (user_id, paddle_subscription_id, paddle_customer_id,
            plan, status, current_period_end, cancel_at_period_end, updated_at)
         VALUES ($1,$2,$3,$4,'active',$5,$6,now())
         ON CONFLICT (user_id) DO UPDATE SET
           paddle_subscription_id = EXCLUDED.paddle_subscription_id,
           paddle_customer_id = EXCLUDED.paddle_customer_id,
           plan = EXCLUDED.plan,
           status = 'active',
           current_period_end = EXCLUDED.current_period_end,
           cancel_at_period_end = EXCLUDED.cancel_at_period_end,
           updated_at = now()`,
        [userId, paddleSubId, paddleCustomerId, plan, periodEnd, cancelAtPeriodEnd],
      );
      if (wasSuspended && tenantId && subscriptionId) {
        await dunning.handleReactivation(tenantId, subscriptionId);
      } else {
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
          console.error("[paddle] onboarding plan_activated step failed:", err);
        }
      }
      break;
    }
    case "subscription.canceled": {
      const subStatus = await getSubscriptionStatus(db, userId);
      if (subStatus === "past_due" || subStatus === "suspended") {
        if (tenantId && subscriptionId) {
          await dunning.handleSuspension(tenantId, subscriptionId);
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
      if (email) {
        await sendEmail("cancellation", {
          email,
          accessUntil: periodEnd?.toLocaleDateString("es-ES") ?? "—",
          appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com",
        });
      }
      break;
    }
    case "subscription.payment.failed": {
      const attemptNumber =
        data.billing_details?.payment_attempt_count ??
        (await countPaymentFailures(db, tenantId ?? "")) + 1;
      if (tenantId && subscriptionId) {
        await dunning.handlePaymentFailed(tenantId, subscriptionId, attemptNumber, data.id ?? null);
      }
      break;
    }
    default:
      break;
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

async function countPaymentFailures(db: DbClient, tenantId: string): Promise<number> {
  if (!tenantId) return 0;
  const rows = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM dunning_log
     WHERE tenant_id = $1 AND event_type = 'payment_failed'`,
    [tenantId],
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}
