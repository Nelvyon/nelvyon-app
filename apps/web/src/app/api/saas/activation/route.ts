import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureSchema() {
  const db = DbClient.getInstance();
  await db.query(`
    CREATE TABLE IF NOT EXISTS saas_activation_checklist (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id    TEXT NOT NULL UNIQUE,
      step_profile BOOLEAN NOT NULL DEFAULT FALSE,
      step_contact BOOLEAN NOT NULL DEFAULT FALSE,
      step_campaign BOOLEAN NOT NULL DEFAULT FALSE,
      step_workflow BOOLEAN NOT NULL DEFAULT FALSE,
      step_social   BOOLEAN NOT NULL DEFAULT FALSE,
      step_billing  BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at  TIMESTAMPTZ,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const tenantId = ctx.tenant.id;
    await ensureSchema();
    const db = DbClient.getInstance();

    const rows = await db.query<{
      step_profile: boolean; step_contact: boolean; step_campaign: boolean;
      step_workflow: boolean; step_social: boolean; step_billing: boolean;
    }>(
      `SELECT step_profile, step_contact, step_campaign, step_workflow, step_social, step_billing
       FROM saas_activation_checklist
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenantId],
    );

    if (rows.length === 0) {
      // Auto-detect completed steps from existing data
      const [contactCount, campaignCount, workflowCount, socialCount, tenantPlan] = await Promise.all([
        db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_contacts WHERE tenant_id = $1`, [tenantId]).catch(() => [{ n: "0" }]),
        db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_campanias WHERE tenant_id = $1`, [tenantId]).catch(() => [{ n: "0" }]),
        db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_workflows WHERE tenant_id = $1`, [tenantId]).catch(() => [{ n: "0" }]),
        db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM saas_social_posts WHERE tenant_id = $1`, [tenantId]).catch(() => [{ n: "0" }]),
        db.query<{ plan: string }>(`SELECT plan FROM saas_tenants WHERE id = $1`, [tenantId]).catch(() => [{ plan: "starter" }]),
      ]);

      const hasContacts = parseInt(String(contactCount[0]?.n ?? 0)) > 0;
      const hasCampaigns = parseInt(String(campaignCount[0]?.n ?? 0)) > 0;
      const hasWorkflows = parseInt(String(workflowCount[0]?.n ?? 0)) > 0;
      const hasSocial = parseInt(String(socialCount[0]?.n ?? 0)) > 0;
      const billingDone = String(tenantPlan[0]?.plan ?? "starter") !== "starter";
      const profileDone = !!(ctx.tenant.companyName && ctx.tenant.industry);

      await db.query(
        `INSERT INTO saas_activation_checklist (tenant_id, step_profile, step_contact, step_campaign, step_workflow, step_social, step_billing)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id) DO NOTHING`,
        [tenantId, profileDone, hasContacts, hasCampaigns, hasWorkflows, hasSocial, billingDone],
      );

      return NextResponse.json({
        steps: {
          profile: profileDone,
          contact: hasContacts,
          campaign: hasCampaigns,
          workflow: hasWorkflows,
          social: hasSocial,
          billing: billingDone,
        },
      });
    }

    const row = rows[0];

    return NextResponse.json({
      steps: {
        profile: row.step_profile,
        contact: row.step_contact,
        campaign: row.step_campaign,
        workflow: row.step_workflow,
        social: row.step_social,
        billing: row.step_billing,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const tenantId = ctx.tenant.id;
    const body = (await req.json()) as Partial<{
      profile: boolean; contact: boolean; campaign: boolean;
      workflow: boolean; social: boolean; billing: boolean;
    }>;
    await ensureSchema();
    const db = DbClient.getInstance();

    const fields: string[] = [];
    const values: unknown[] = [tenantId];
    let idx = 2;

    const map: Array<[keyof typeof body, string]> = [
      ["profile", "step_profile"],
      ["contact", "step_contact"],
      ["campaign", "step_campaign"],
      ["workflow", "step_workflow"],
      ["social", "step_social"],
      ["billing", "step_billing"],
    ];

    for (const [key, col] of map) {
      if (body[key] !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(body[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ ok: true });
    }

    await db.query(
      `INSERT INTO saas_activation_checklist (tenant_id)
       VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET
         ${fields.join(", ")},
         updated_at = NOW()`,
      values,
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
