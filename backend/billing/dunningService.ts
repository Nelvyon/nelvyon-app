import { SendEmailCommand } from "@aws-sdk/client-ses";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientSingleton } from "../db/DbClient";
import { getSesClient } from "../email/sesClient";
import {
  finalWarningEmail,
  paymentFailedEmail,
  reactivationEmail,
  secondNoticeEmail,
  suspensionEmail,
  type EmailContent,
} from "./dunningEmailTemplates";

const GRACE_PERIOD_DAYS = 7;
const STRIPE_PORTAL_URL =
  process.env.STRIPE_BILLING_PORTAL_FALLBACK ??
  process.env.STRIPE_CUSTOMER_PORTAL_URL ??
  process.env.PADDLE_CUSTOMER_PORTAL_URL ??
  "https://billing.stripe.com/p/login/test";
const FROM = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";

export type DunningBannerStatus = "active" | "grace" | "warning" | "suspended";

export class DunningService {
  constructor(private readonly db: DbClient) {}

  static getInstance(): DunningService {
    return new DunningService(DbClientSingleton.getInstance());
  }

  async handlePaymentFailed(
    tenantId: string,
    subscriptionId: string,
    attemptNumber: number,
    paddleEventId: string | null,
  ): Promise<void> {
    const profile = await this.getTenantProfile(tenantId);
    if (!profile) return;

    await this.db.query(
      `INSERT INTO dunning_log (tenant_id, subscription_id, event_type, attempt_number, paddle_event_id)
       VALUES ($1, $2, 'payment_failed', $3, $4)`,
      [tenantId, subscriptionId, attemptNumber, paddleEventId],
    );

    if (attemptNumber === 1) {
      await this.db.query(
        `INSERT INTO dunning_log (tenant_id, subscription_id, event_type, attempt_number, paddle_event_id)
         VALUES ($1, $2, 'grace_period', 1, $3)`,
        [tenantId, subscriptionId, paddleEventId],
      );
      await this.db.query(
        `UPDATE subscriptions SET status = 'past_due', updated_at = now()
         WHERE COALESCE(stripe_subscription_id, paddle_subscription_id) = $1 OR user_id = $2`,
        [subscriptionId, profile.userId],
      );
      await this.sendDunningEmail(
        profile.email,
        paymentFailedEmail(profile.fullName, profile.planLabel, STRIPE_PORTAL_URL),
      );
      return;
    }

    if (attemptNumber === 2) {
      const { daysLeft } = await this.getGracePeriodStatus(tenantId);
      await this.sendDunningEmail(
        profile.email,
        secondNoticeEmail(profile.fullName, daysLeft, STRIPE_PORTAL_URL),
      );
      return;
    }

    if (attemptNumber >= 3) {
      await this.sendDunningEmail(profile.email, finalWarningEmail(profile.fullName, STRIPE_PORTAL_URL));
    }
  }

  async handleSuspension(tenantId: string, subscriptionId: string): Promise<void> {
    const profile = await this.getTenantProfile(tenantId);
    if (!profile) return;

    await this.db.query(`UPDATE nelvyon_users SET plan = 'suspended', updated_at = now() WHERE tenant_id = $1`, [
      tenantId,
    ]);
    await this.db.query(
      `UPDATE subscriptions SET status = 'suspended', updated_at = now()
       WHERE COALESCE(stripe_subscription_id, paddle_subscription_id) = $1 OR user_id = $2`,
      [subscriptionId, profile.userId],
    );
    await this.db.query(
      `INSERT INTO dunning_log (tenant_id, subscription_id, event_type, attempt_number)
       VALUES ($1, $2, 'suspended', 1)`,
      [tenantId, subscriptionId],
    );
    await this.sendDunningEmail(
      profile.email,
      suspensionEmail(profile.fullName, STRIPE_PORTAL_URL),
    );
  }

  async handleReactivation(tenantId: string, subscriptionId: string): Promise<void> {
    const profile = await this.getTenantProfile(tenantId);
    if (!profile) return;

    const subRows = await this.db.query<{ plan: string }>(
      `SELECT plan FROM subscriptions
       WHERE paddle_subscription_id = $1 OR user_id = $2
       LIMIT 1`,
      [subscriptionId, profile.userId],
    );
    const restoredPlan = subRows[0]?.plan && subRows[0].plan !== "suspended" ? subRows[0].plan : profile.previousPlan;

    await this.db.query(`UPDATE nelvyon_users SET plan = $2, updated_at = now() WHERE tenant_id = $1`, [
      tenantId,
      restoredPlan,
    ]);
    await this.db.query(
      `UPDATE subscriptions SET status = 'active', updated_at = now()
       WHERE COALESCE(stripe_subscription_id, paddle_subscription_id) = $1 OR user_id = $2`,
      [subscriptionId, profile.userId],
    );
    await this.db.query(
      `INSERT INTO dunning_log (tenant_id, subscription_id, event_type, attempt_number)
       VALUES ($1, $2, 'reactivated', 1)`,
      [tenantId, subscriptionId],
    );
    await this.sendDunningEmail(
      profile.email,
      reactivationEmail(profile.fullName, restoredPlan),
    );
  }

  async getGracePeriodStatus(tenantId: string): Promise<{ inGrace: boolean; daysLeft: number }> {
    const userRows = await this.db.query<{ plan: string }>(
      `SELECT plan FROM nelvyon_users WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    const plan = userRows[0]?.plan ?? "free";
    if (plan === "suspended") {
      return { inGrace: false, daysLeft: 0 };
    }

    const graceRows = await this.db.query<{ created_at: string }>(
      `SELECT created_at FROM dunning_log
       WHERE tenant_id = $1 AND event_type = 'grace_period'
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId],
    );
    if (graceRows.length === 0) {
      return { inGrace: false, daysLeft: 0 };
    }

    const started = new Date(graceRows[0].created_at);
    const elapsedMs = Date.now() - started.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, GRACE_PERIOD_DAYS - elapsedDays);
    return { inGrace: daysLeft > 0, daysLeft };
  }

  async isAgentExecutionBlocked(tenantId: string): Promise<boolean> {
    const { status } = await this.getDunningStatus(tenantId);
    return status === "warning" || status === "suspended";
  }

  async getDunningStatus(tenantId: string): Promise<{
    status: DunningBannerStatus;
    daysLeft: number;
    updateUrl: string;
  }> {
    const userRows = await this.db.query<{ plan: string }>(
      `SELECT plan FROM nelvyon_users WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    const plan = userRows[0]?.plan ?? "free";
    if (plan === "suspended") {
      return { status: "suspended", daysLeft: 0, updateUrl: STRIPE_PORTAL_URL };
    }

    const { inGrace, daysLeft } = await this.getGracePeriodStatus(tenantId);
    if (!inGrace) {
      return { status: "active", daysLeft: 0, updateUrl: STRIPE_PORTAL_URL };
    }

    const attemptRows = await this.db.query<{ max_attempt: string }>(
      `SELECT COALESCE(MAX(attempt_number), 0)::text AS max_attempt
       FROM dunning_log
       WHERE tenant_id = $1 AND event_type = 'payment_failed'`,
      [tenantId],
    );
    const maxAttempt = parseInt(attemptRows[0]?.max_attempt ?? "0", 10);

    if (daysLeft <= 1 || maxAttempt >= 3) {
      return { status: "warning", daysLeft, updateUrl: STRIPE_PORTAL_URL };
    }
    return { status: "grace", daysLeft, updateUrl: STRIPE_PORTAL_URL };
  }

  private async getTenantProfile(tenantId: string): Promise<{
    userId: string;
    email: string;
    fullName: string;
    planLabel: string;
    previousPlan: string;
  } | null> {
    const rows = await this.db.query<{
      user_id: string;
      email: string;
      full_name: string;
      plan: string;
    }>(
      `SELECT u.user_id, u.email, u.full_name, COALESCE(s.plan, u.plan) AS plan
       FROM nelvyon_users u
       LEFT JOIN subscriptions s ON s.user_id = u.user_id
       WHERE u.tenant_id = $1
       ORDER BY u.created_at ASC
       LIMIT 1`,
      [tenantId],
    );
    const row = rows[0];
    if (!row) return null;
    const planLabel = row.plan === "suspended" ? "tu plan" : row.plan;
    return {
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      planLabel,
      previousPlan: row.plan === "suspended" ? "starter" : row.plan,
    };
  }

  private async sendDunningEmail(to: string, content: EmailContent): Promise<void> {
    const client = getSesClient();
    await client.send(
      new SendEmailCommand({
        Source: `NELVYON <${FROM}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: content.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: content.html, Charset: "UTF-8" },
            Text: { Data: content.text, Charset: "UTF-8" },
          },
        },
      }),
    );
  }
}

export async function resolveTenantIdFromUserId(db: DbClient, userId: string): Promise<string | null> {
  const rows = await db.query<{ tenant_id: string }>(
    `SELECT tenant_id FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0]?.tenant_id ?? null;
}
