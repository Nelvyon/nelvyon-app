import { DbClient } from "../../../../../backend/db/DbClient";

import {
  buildNurtureEmailSequence,
  type NurtureTouch,
} from "@/lib/packs/saasB2bPackProduction";
import type { SaasB2bGrowthPackIntake } from "@/lib/packs/types";

function db() {
  return DbClient.getInstance();
}

export type NurtureDispatchResult = {
  status: "sent" | "queued" | "skipped";
  touches: number;
  email_ids: number[];
  reason?: string;
};

async function upsertContact(params: {
  workspaceId: number;
  userId: string;
  email: string;
  name: string;
  businessName: string;
}): Promise<void> {
  const [first, ...rest] = params.name.split(/\s+/);
  const last = rest.join(" ") || null;
  try {
    await db().query(
      `INSERT INTO contacts (user_id, workspace_id, first_name, last_name, email, company_name, status, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'mql', 'saas_b2b_pack', NOW(), NOW())`,
      [params.userId, params.workspaceId, first || params.businessName, last, params.email, params.businessName],
    );
  } catch {
    const existing = await db().query<{ id: number }>(
      `SELECT id FROM contacts WHERE workspace_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [params.workspaceId, params.email],
    );
    if (existing.length === 0) {
      await db().query(
        `INSERT INTO contacts (user_id, workspace_id, first_name, last_name, email, company_name, status, source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'mql', 'saas_b2b_pack', NOW(), NOW())`,
        [params.userId, params.workspaceId, first || params.businessName, last, params.email, params.businessName],
      );
    }
  }
}

async function queueTouch(params: {
  userId: string;
  workspaceId: number;
  toEmail: string;
  toName: string;
  touch: NurtureTouch;
}): Promise<number> {
  const rows = await db().query<{ id: number }>(
    `INSERT INTO email_queue (user_id, workspace_id, to_email, to_name, subject, body_text, email_type, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'campaign', 'pending', NOW())
     RETURNING id`,
    [
      params.userId,
      params.workspaceId,
      params.toEmail,
      params.toName,
      params.touch.subject,
      params.touch.body_text,
    ],
  );
  return Number(rows[0]?.id ?? 0);
}

export async function dispatchSaasB2bNurtureSequence(params: {
  workspaceId: number;
  userId: string;
  intake: SaasB2bGrowthPackIntake;
  campaignId: number;
}): Promise<NurtureDispatchResult> {
  const email = params.intake.contact_email?.trim().toLowerCase();
  if (!email) {
    return { status: "skipped", touches: 0, email_ids: [], reason: "no_contact_email" };
  }

  const touches = buildNurtureEmailSequence(params.intake);
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
    const id = await queueTouch({
      userId: params.userId,
      workspaceId: params.workspaceId,
      toEmail: email,
      toName: recipientName,
      touch,
    });
    if (id > 0) emailIds.push(id);
  }

  const sequenceJson = JSON.stringify(touches);
  await db().query(
    `UPDATE nelvyon_campaigns
     SET content = $4, status = 'sent', campaign_type = 'nurturing'
     WHERE id = $1 AND workspace_id = $2 AND user_id = $3`,
    [params.campaignId, params.workspaceId, params.userId, sequenceJson],
  );

  return {
    status: emailIds.length === touches.length ? "queued" : "skipped",
    touches: touches.length,
    email_ids: emailIds,
  };
}
