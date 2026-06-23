import { DbClient } from "../../../../../backend/db/DbClient";

import {
  isSesCredentialError,
  isSesPermanentFailure,
  sendEmailViaSes,
} from "@/lib/email/sesMailer";
import {
  buildWelcomeEmailSequence,
  type WelcomeTouch,
} from "@/lib/packs/localPackProduction";
import type { LocalGrowthPackIntake } from "@/lib/packs/types";

function db() {
  return DbClient.getInstance();
}

export type WelcomeDispatchResult = {
  status: "sent" | "queued" | "skipped";
  touches: number;
  email_ids: number[];
  reason?: string;
};

type QueueEmailStatus = "sent" | "failed" | "pending" | "no_api_key";

type QueueEmailRow = {
  id: number;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  to_email: string;
  to_name: string | null;
  status: QueueEmailStatus;
  error_message: string | null;
  scheduled_at: string | null;
};

let emailQueueHasScheduledAt: boolean | null = null;

async function hasScheduledAtColumn(): Promise<boolean> {
  if (emailQueueHasScheduledAt != null) return emailQueueHasScheduledAt;
  const rows = await db().query<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'email_queue' AND column_name = 'scheduled_at'
     ) AS present`,
  );
  emailQueueHasScheduledAt = rows[0]?.present === true;
  return emailQueueHasScheduledAt;
}

async function upsertContact(params: {
  workspaceId: number;
  userId: string;
  email: string;
  name: string;
  businessName: string;
}): Promise<void> {
  const [first, ...rest] = params.name.split(/\s+/);
  const last = rest.join(" ") || null;
  await db().query(
    `INSERT INTO contacts (user_id, workspace_id, first_name, last_name, email, company_name, status, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', 'local_growth_pack', NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [params.userId, params.workspaceId, first || params.businessName, last, params.email, params.businessName],
  ).catch(async () => {
    const existing = await db().query<{ id: number }>(
      `SELECT id FROM contacts WHERE workspace_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [params.workspaceId, params.email],
    );
    if (existing.length === 0) {
      await db().query(
        `INSERT INTO contacts (user_id, workspace_id, first_name, last_name, email, company_name, status, source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', 'local_growth_pack', NOW(), NOW())`,
        [params.userId, params.workspaceId, first || params.businessName, last, params.email, params.businessName],
      );
    }
  });
}

async function queueTouch(params: {
  userId: string;
  workspaceId: number;
  toEmail: string;
  toName: string;
  touch: WelcomeTouch;
  bodyHtml: string;
  scheduledAtIso: string;
}): Promise<number> {
  const withSchedule = await hasScheduledAtColumn();
  const rows = withSchedule
    ? await db().query<{ id: number }>(
      `INSERT INTO email_queue (
         user_id, workspace_id, to_email, to_name, subject, body_text, body_html, email_type, status, scheduled_at, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'campaign', 'pending', $8::timestamptz, NOW())
       RETURNING id`,
      [
        params.userId,
        params.workspaceId,
        params.toEmail,
        params.toName,
        params.touch.subject,
        params.touch.body_text,
        params.bodyHtml,
        params.scheduledAtIso,
      ],
    )
    : await db().query<{ id: number }>(
      `INSERT INTO email_queue (
         user_id, workspace_id, to_email, to_name, subject, body_text, body_html, email_type, status, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'campaign', 'pending', NOW())
       RETURNING id`,
      [
        params.userId,
        params.workspaceId,
        params.toEmail,
        params.toName,
        params.touch.subject,
        params.touch.body_text,
        params.bodyHtml,
      ],
    );
  return Number(rows[0]?.id ?? 0);
}

function renderTouchHtml(touch: WelcomeTouch, recipientName: string): string {
  const escapedSubject = escapeHtml(touch.subject);
  const escapedPreview = escapeHtml(touch.preview);
  const paragraphs = touch.body_text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px 0;line-height:1.6;color:#0f172a;">${escapeHtml(line)}</p>`)
    .join("");
  return `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
  <div style="background:#0f766e;color:#ffffff;padding:16px 20px;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:20px;">${escapedSubject}</h1>
    <p style="margin:8px 0 0 0;font-size:13px;opacity:0.9;">${escapedPreview}</p>
  </div>
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 10px 10px;">
    <p style="margin:0 0 12px 0;line-height:1.6;color:#0f172a;">Hola ${escapeHtml(recipientName)},</p>
    ${paragraphs}
  </div>
</div>`.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function scheduledAtFromDelay(delayHours: number): string {
  return new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();
}

async function fetchQueueByIds(ids: number[]): Promise<QueueEmailRow[]> {
  if (ids.length === 0) return [];
  return db().query<QueueEmailRow>(
    `SELECT id, subject, body_text, body_html, to_email, to_name, status, error_message,
            scheduled_at::text AS scheduled_at
     FROM email_queue
     WHERE id = ANY($1::int[])
     ORDER BY id ASC`,
    [ids],
  );
}

export async function processPendingLocalWelcomeEmails(params: {
  limit?: number;
  workspaceId?: number;
} = {}): Promise<{ processed: number; sent: number; failed: number; noApiKey: number; skipped: number }> {
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
  const withSchedule = await hasScheduledAtColumn();
  const rows = withSchedule
    ? await db().query<QueueEmailRow>(
      `SELECT id, subject, body_text, body_html, to_email, to_name, status, error_message,
              scheduled_at::text AS scheduled_at
       FROM email_queue
       WHERE email_type = 'campaign'
         AND status = 'pending'
         AND COALESCE(scheduled_at, created_at) <= NOW()
         AND ($1::int IS NULL OR workspace_id = $1)
       ORDER BY COALESCE(scheduled_at, created_at) ASC, id ASC
       LIMIT $2`,
      [params.workspaceId ?? null, limit],
    )
    : await db().query<QueueEmailRow>(
      `SELECT id, subject, body_text, body_html, to_email, to_name, status, error_message,
              NULL::text AS scheduled_at
       FROM email_queue
       WHERE email_type = 'campaign'
         AND status = 'pending'
         AND ($1::int IS NULL OR workspace_id = $1)
       ORDER BY created_at ASC, id ASC
       LIMIT $2`,
      [params.workspaceId ?? null, limit],
    );

  let sent = 0;
  let failed = 0;
  let noApiKey = 0;
  let skipped = 0;

  for (const row of rows) {
    const bodyText = row.body_text?.trim() || "";
    const bodyHtml = row.body_html?.trim() || "";
    if (!bodyText && !bodyHtml) {
      await db().query(
        `UPDATE email_queue SET status = 'failed', error_message = 'empty_body' WHERE id = $1`,
        [row.id],
      );
      failed += 1;
      continue;
    }

    const result = await sendEmailViaSes({
      toEmail: row.to_email,
      toName: row.to_name || "",
      subject: row.subject,
      bodyText: bodyText || row.subject,
      bodyHtml: bodyHtml || `<p>${escapeHtml(bodyText || row.subject)}</p>`,
    });

    if (result.ok) {
      await db().query(
        `UPDATE email_queue SET status = 'sent', sent_at = NOW(), error_message = NULL WHERE id = $1`,
        [row.id],
      );
      sent += 1;
      continue;
    }

    const errorMessage = result.error ?? "ses_send_failed";
    if (isSesCredentialError(errorMessage)) {
      await db().query(
        `UPDATE email_queue SET status = 'no_api_key', error_message = $2 WHERE id = $1`,
        [row.id, errorMessage],
      );
      noApiKey += 1;
      continue;
    }

    if (isSesPermanentFailure(errorMessage)) {
      await db().query(
        `UPDATE email_queue SET status = 'failed', error_message = $2 WHERE id = $1`,
        [row.id, errorMessage],
      );
      failed += 1;
      continue;
    }

    await db().query(
      `UPDATE email_queue SET status = 'pending', error_message = $2 WHERE id = $1`,
      [row.id, result.error ?? "retry_pending"],
    );
    skipped += 1;
  }

  return { processed: rows.length, sent, failed, noApiKey, skipped };
}

function deriveWelcomeCampaignStatus(rows: QueueEmailRow[]): "sent" | "active" | "failed" | "queued" {
  if (rows.length === 0) return "queued";
  const allSent = rows.every((r) => r.status === "sent");
  if (allSent) return "sent";
  if (rows.some((r) => r.status === "failed")) return "failed";
  if (rows.some((r) => r.status === "sent")) return "active";
  return "queued";
}

export async function dispatchLocalWelcomeSequence(params: {
  workspaceId: number;
  userId: string;
  intake: LocalGrowthPackIntake;
  campaignId: number;
}): Promise<WelcomeDispatchResult> {
  const email = params.intake.contact_email?.trim().toLowerCase();
  if (!email) {
    return { status: "skipped", touches: 0, email_ids: [], reason: "no_contact_email" };
  }

  const touches = buildWelcomeEmailSequence(params.intake);
  const recipientName = params.intake.contact_name?.trim() || params.intake.business_name;

  await upsertContact({
    workspaceId: params.workspaceId,
    userId: params.userId,
    email,
    name: recipientName,
    businessName: params.intake.business_name,
  });

  const emailIds: number[] = [];
  for (const touch of touches) {
    const bodyHtml = renderTouchHtml(touch, recipientName);
    const id = await queueTouch({
      userId: params.userId,
      workspaceId: params.workspaceId,
      toEmail: email,
      toName: recipientName,
      touch,
      bodyHtml,
      scheduledAtIso: scheduledAtFromDelay(touch.delay_hours),
    });
    if (id > 0) emailIds.push(id);
  }

  const queueRows = await fetchQueueByIds(emailIds);
  const immediateTouchIds = queueRows
    .filter((row) => {
      if (!row.scheduled_at) return true;
      return new Date(row.scheduled_at).getTime() <= Date.now();
    })
    .map((row) => row.id);
  if (immediateTouchIds.length > 0) {
    await processPendingLocalWelcomeEmails({ limit: immediateTouchIds.length, workspaceId: params.workspaceId });
  }

  const refreshedRows = await fetchQueueByIds(emailIds);
  const campaignStatus = deriveWelcomeCampaignStatus(refreshedRows);

  const sequenceJson = JSON.stringify(touches);
  await db().query(
    `UPDATE nelvyon_campaigns
     SET content = $4, status = $5, campaign_type = 'welcome_sequence'
     WHERE id = $1 AND workspace_id = $2 AND user_id = $3`,
    [params.campaignId, params.workspaceId, params.userId, sequenceJson, campaignStatus],
  );

  return {
    status: campaignStatus === "sent" ? "sent" : emailIds.length === touches.length ? "queued" : "skipped",
    touches: touches.length,
    email_ids: emailIds,
  };
}
