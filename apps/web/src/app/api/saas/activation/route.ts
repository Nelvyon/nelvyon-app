import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { getDb } from "@nelvyon/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureSchema() {
  const db = getDb();
  await db.execute(sql`
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
    await ensureSchema();
    const db = getDb();

    const rows = await db.execute(sql`
      SELECT step_profile, step_contact, step_campaign, step_workflow, step_social, step_billing
      FROM saas_activation_checklist
      WHERE tenant_id = ${ctx.tenantId}
      LIMIT 1
    `);

    if (rows.rows.length === 0) {
      // Auto-detect completed steps from existing data
      const [contactCount, campaignCount, workflowCount] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) AS n FROM saas_crm_contacts WHERE tenant_id = ${ctx.tenantId}`).catch(() => ({ rows: [{ n: 0 }] })),
        db.execute(sql`SELECT COUNT(*) AS n FROM saas_campaigns WHERE tenant_id = ${ctx.tenantId}`).catch(() => ({ rows: [{ n: 0 }] })),
        db.execute(sql`SELECT COUNT(*) AS n FROM saas_workflows WHERE tenant_id = ${ctx.tenantId} AND status = 'active'`).catch(() => ({ rows: [{ n: 0 }] })),
      ]);

      const hasContacts = parseInt(String((contactCount.rows[0] as { n: unknown })?.n ?? 0)) > 0;
      const hasCampaigns = parseInt(String((campaignCount.rows[0] as { n: unknown })?.n ?? 0)) > 0;
      const hasWorkflows = parseInt(String((workflowCount.rows[0] as { n: unknown })?.n ?? 0)) > 0;
      const profileDone = !!(ctx.tenant.companyName && ctx.tenant.industry);

      await db.execute(sql`
        INSERT INTO saas_activation_checklist (tenant_id, step_profile, step_contact, step_campaign, step_workflow)
        VALUES (${ctx.tenantId}, ${profileDone}, ${hasContacts}, ${hasCampaigns}, ${hasWorkflows})
        ON CONFLICT (tenant_id) DO NOTHING
      `);

      return NextResponse.json({
        steps: {
          profile: profileDone,
          contact: hasContacts,
          campaign: hasCampaigns,
          workflow: hasWorkflows,
          social: false,
          billing: false,
        },
      });
    }

    const row = rows.rows[0] as {
      step_profile: boolean; step_contact: boolean; step_campaign: boolean;
      step_workflow: boolean; step_social: boolean; step_billing: boolean;
    };

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
    const body = (await req.json()) as Partial<{
      profile: boolean; contact: boolean; campaign: boolean;
      workflow: boolean; social: boolean; billing: boolean;
    }>;
    await ensureSchema();
    const db = getDb();

    await db.execute(sql`
      INSERT INTO saas_activation_checklist (
        tenant_id, step_profile, step_contact, step_campaign, step_workflow, step_social, step_billing
      ) VALUES (
        ${ctx.tenantId},
        ${body.profile ?? false}, ${body.contact ?? false}, ${body.campaign ?? false},
        ${body.workflow ?? false}, ${body.social ?? false}, ${body.billing ?? false}
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        step_profile  = COALESCE(EXCLUDED.step_profile, saas_activation_checklist.step_profile),
        step_contact  = COALESCE(EXCLUDED.step_contact, saas_activation_checklist.step_contact),
        step_campaign = COALESCE(EXCLUDED.step_campaign, saas_activation_checklist.step_campaign),
        step_workflow = COALESCE(EXCLUDED.step_workflow, saas_activation_checklist.step_workflow),
        step_social   = COALESCE(EXCLUDED.step_social, saas_activation_checklist.step_social),
        step_billing  = COALESCE(EXCLUDED.step_billing, saas_activation_checklist.step_billing),
        updated_at    = NOW()
    `);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
