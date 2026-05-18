import { SendEmailCommand } from "@aws-sdk/client-ses";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientSingleton } from "../db/DbClient";
import { getSesClient } from "../email/sesClient";
import { removeScheduledSubscriptionChange, scheduleSubscriptionCancelAtPeriodEnd } from "../stripe/stripeApi";
import { cancellationScheduledEmail, offboardingEmail, type EmailContent } from "./cancellationEmailTemplates";
import { normalizeBillablePlan } from "./planConfig";

const FROM = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";
const SUBSCRIPTION_ACTIVE_FOR_PLAN_CHANGE = new Set(["active", "trialing", "past_due", "paused"]);
const RETENTION_DAYS = 30;

export type CancellationReason =
  | "precio"
  | "no_lo_uso"
  | "faltan_funciones"
  | "competencia"
  | "otro";

export interface CancellationStatus {
  isCancelling: boolean;
  periodEnd: string | null;
  daysLeft: number;
  plan: string;
  /** true si puede cambiar de plan vía Stripe (plan de pago + suscripción gestionable). */
  canChangePlan: boolean;
}

interface UserBillingRow {
  user_id: string;
  email: string;
  full_name: string;
  plan: string;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  period_end_date: string | null;
}

export class CancellationService {
  constructor(private readonly db: DbClient) {}

  static getInstance(): CancellationService {
    return new CancellationService(DbClientSingleton.getInstance());
  }

  async initiateCancellation(
    userId: string,
    reason: string,
    feedback?: string,
  ): Promise<{ periodEnd: Date }> {
    const row = await this.getUserBilling(userId);
    if (!row?.stripe_subscription_id) {
      throw new Error("No active Stripe subscription found");
    }

    const stripeResult = await scheduleSubscriptionCancelAtPeriodEnd(row.stripe_subscription_id);
    const periodEnd = stripeResult.currentBillingPeriod?.endsAt
      ? new Date(stripeResult.currentBillingPeriod.endsAt)
      : row.current_period_end
        ? new Date(row.current_period_end)
        : row.period_end_date
          ? new Date(row.period_end_date)
          : addDays(new Date(), 30);

    await this.db.query(
      `UPDATE nelvyon_users SET
         cancellation_reason = $2,
         cancellation_feedback = $3,
         cancelled_at = now(),
         cancel_at_period_end = true,
         period_end_date = $4,
         updated_at = now()
       WHERE user_id = $1`,
      [userId, reason, feedback ?? null, periodEnd.toISOString()],
    );

    await this.db.query(
      `UPDATE subscriptions SET
         cancel_at_period_end = true,
         current_period_end = $2,
         updated_at = now()
       WHERE user_id::text = $1`,
      [userId, periodEnd.toISOString()],
    );

    const reactivateUrl = this.settingsUrl();
    await this.sendEmail(
      row.email,
      cancellationScheduledEmail(row.full_name, row.plan, formatDateEs(periodEnd), reactivateUrl),
    );

    return { periodEnd };
  }

  async processCancellation(userId: string): Promise<void> {
    const row = await this.getUserBilling(userId);
    if (!row) return;

    const deletionAt = addDays(new Date(), RETENTION_DAYS);

    await this.db.query(
      `UPDATE nelvyon_users SET
         plan = 'free',
         cancel_at_period_end = false,
         scheduled_deletion_at = $2,
         updated_at = now()
       WHERE user_id = $1`,
      [userId, deletionAt.toISOString()],
    );

    await this.db.query(
      `UPDATE subscriptions SET
         plan = 'free',
         status = 'canceled',
         cancel_at_period_end = false,
         updated_at = now()
       WHERE user_id::text = $1`,
      [userId],
    );

    const exportUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com"}/dashboard/history`;
    await this.sendEmail(row.email, offboardingEmail(row.full_name, exportUrl));
  }

  async reactivateSubscription(userId: string): Promise<void> {
    const row = await this.getUserBilling(userId);
    if (!row?.stripe_subscription_id) {
      throw new Error("No Stripe subscription found");
    }

    await removeScheduledSubscriptionChange(row.stripe_subscription_id);

    await this.db.query(
      `UPDATE nelvyon_users SET
         cancellation_reason = NULL,
         cancellation_feedback = NULL,
         cancelled_at = NULL,
         cancel_at_period_end = false,
         period_end_date = NULL,
         updated_at = now()
       WHERE user_id = $1`,
      [userId],
    );

    await this.db.query(
      `UPDATE subscriptions SET
         cancel_at_period_end = false,
         status = 'active',
         updated_at = now()
       WHERE user_id::text = $1`,
      [userId],
    );
  }

  async getCancellationStatus(userId: string): Promise<CancellationStatus> {
    const row = await this.getUserBilling(userId);
    const plan = row?.plan ?? "free";
    const isCancelling = row?.cancel_at_period_end === true;
    const endRaw = row?.period_end_date ?? row?.current_period_end;
    const periodEnd = endRaw ? new Date(endRaw) : null;
    const daysLeft =
      isCancelling && periodEnd && !Number.isNaN(periodEnd.getTime())
        ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const subStatus = (row?.subscription_status ?? "").toLowerCase();
    const canChangePlan =
      normalizeBillablePlan(plan) !== null &&
      Boolean(row?.stripe_subscription_id?.trim()) &&
      SUBSCRIPTION_ACTIVE_FOR_PLAN_CHANGE.has(subStatus);

    return {
      isCancelling,
      periodEnd: periodEnd ? periodEnd.toISOString() : null,
      daysLeft,
      plan,
      canChangePlan,
    };
  }

  async isVoluntaryCancellationPending(userId: string): Promise<boolean> {
    const rows = await this.db.query<{ cancel_at_period_end: boolean }>(
      `SELECT cancel_at_period_end FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    return rows[0]?.cancel_at_period_end === true;
  }

  private async getUserBilling(userId: string): Promise<UserBillingRow | null> {
    const rows = await this.db.query<UserBillingRow>(
      `SELECT u.user_id, u.email, u.full_name,
              COALESCE(s.plan, u.plan) AS plan,
              COALESCE(s.stripe_subscription_id, s.paddle_subscription_id) AS stripe_subscription_id,
              s.status AS subscription_status,
              s.current_period_end::text AS current_period_end,
              u.cancel_at_period_end,
              u.period_end_date::text AS period_end_date
       FROM nelvyon_users u
       LEFT JOIN subscriptions s ON s.user_id::text = u.user_id
       WHERE u.user_id = $1
       LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  private settingsUrl(): string {
    return `${process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com"}/dashboard/settings`;
  }

  private async sendEmail(to: string, content: EmailContent): Promise<void> {
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

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateEs(date: Date): string {
  return date.toLocaleDateString("es-ES", { dateStyle: "long" });
}
