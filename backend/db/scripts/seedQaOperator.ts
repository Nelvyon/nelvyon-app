/**
 * Idempotent QA operator seed for staging/production P0 smokes.
 *
 * Credentials match scripts/staging-smoke-*.mjs (documented in docs/STAGING_P0_SMOKES.md).
 *
 * Usage:
 *   pnpm -C apps/web exec tsx ../../backend/db/scripts/seedQaOperator.ts
 *   railway run --service @nelvyon/web pnpm -C apps/web exec tsx ../../backend/db/scripts/seedQaOperator.ts
 */
import { getAuthService } from "../../auth/AuthService";
import { DbClient } from "../DbClient";
import { loadEnvFiles } from "../loadEnvFiles";

const QA_EMAIL = process.env.QA_OPERATOR_EMAIL?.trim() || "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = process.env.QA_OPERATOR_PASSWORD?.trim() || "StagingQA2026!";
const QA_NAME = process.env.QA_OPERATOR_NAME?.trim() || "QA Audit Operator";
const QA_PLAN = process.env.QA_OPERATOR_PLAN?.trim() || "starter";

async function tableExists(db: DbClient, table: string): Promise<boolean> {
  const rows = await db.query<{ reg: string | null }>(
    `SELECT to_regclass($1::text) AS reg`,
    [`public.${table}`],
  );
  return rows[0]?.reg != null;
}

async function main(): Promise<void> {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  const auth = getAuthService();
  const hash = await auth.hashPassword(QA_PASSWORD);

  const existing = await db.query<{ user_id: string }>(
    `SELECT user_id::text FROM nelvyon_users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [QA_EMAIL],
  );

  let userId: string;
  if (existing[0]) {
    userId = existing[0].user_id;
    await db.query(
      `UPDATE nelvyon_users
       SET password_hash = $2, full_name = $3, plan = $4, updated_at = NOW()
       WHERE user_id = $1::uuid`,
      [userId, hash, QA_NAME, QA_PLAN],
    );
    console.log(`[seed-qa] updated nelvyon_users user_id=${userId}`);
  } else {
    const inserted = await db.query<{ user_id: string }>(
      `INSERT INTO nelvyon_users (email, password_hash, full_name, plan)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id::text`,
      [QA_EMAIL, hash, QA_NAME, QA_PLAN],
    );
    const row = inserted[0];
    if (!row) {
      throw new Error("INSERT nelvyon_users returned no row");
    }
    userId = row.user_id;
    console.log(`[seed-qa] created nelvyon_users user_id=${userId}`);
  }

  if (await tableExists(db, "onboarding")) {
    await db.query(
      `INSERT INTO onboarding (user_id, welcome_email_sent, profile_completed, first_agent_used, plan_activated, completed_at)
       VALUES ($1::uuid, true, true, true, true, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         welcome_email_sent = true,
         profile_completed = true,
         first_agent_used = true,
         plan_activated = true,
         completed_at = COALESCE(onboarding.completed_at, NOW()),
         updated_at = NOW()`,
      [userId],
    );
  }

  let workspaceId: number | null = null;
  if (await tableExists(db, "workspaces")) {
    const ws = await db.query<{ id: string }>(
      `SELECT id::text FROM workspaces WHERE user_id = $1 ORDER BY id ASC LIMIT 1`,
      [userId],
    );
    if (ws[0]) {
      workspaceId = Number(ws[0].id);
      console.log(`[seed-qa] workspace exists id=${workspaceId}`);
    } else {
      const created = await db.query<{ id: string }>(
        `INSERT INTO workspaces (user_id, name, slug, status, plan, created_at)
         VALUES ($1, 'Mi Workspace', 'default', 'active', $2, NOW())
         RETURNING id::text`,
        [userId, QA_PLAN],
      );
      workspaceId = Number(created[0]!.id);
      console.log(`[seed-qa] created workspace id=${workspaceId}`);
    }

    if (workspaceId != null && (await tableExists(db, "workspace_members"))) {
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, joined_at, created_at)
         SELECT $1::int, $2::varchar, $3::varchar, 'owner', 'active', $4::varchar, $4::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM workspace_members WHERE workspace_id = $1::int AND user_id = $2::varchar
         )`,
        [workspaceId, userId, QA_EMAIL, now],
      );
    }
  }

  if (await tableExists(db, "saas_tenants")) {
    const tenantPlan = ["starter", "pro", "enterprise"].includes(QA_PLAN) ? QA_PLAN : "starter";
    await db.query(
      `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, onboarding_step)
       VALUES ($1::uuid, 'QA Audit Co', 'marketing', $2, true, 4)
       ON CONFLICT (user_id) DO UPDATE SET
         plan = EXCLUDED.plan,
         onboarding_completed = true,
         updated_at = NOW()`,
      [userId, tenantPlan],
    );
    if (workspaceId != null) {
      await db.query(
        `UPDATE saas_tenants SET workspace_id = $2, updated_at = NOW()
         WHERE user_id = $1::uuid AND workspace_id IS NULL`,
        [userId, workspaceId],
      );
    }
  }

  const nelvyonRows = await db.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM nelvyon_users`);
  let workspacesTotal = "0";
  if (await tableExists(db, "workspaces")) {
    const wsRows = await db.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM workspaces`);
    workspacesTotal = wsRows[0]?.n ?? "0";
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: QA_EMAIL,
        userId,
        workspaceId,
        nelvyon_users_total: nelvyonRows[0]?.n,
        workspaces_total: workspacesTotal,
        next:
          "STAGING_BASE_URL=https://nelvyon.com node scripts/run-staging-p0-smokes.mjs --skip-wait",
      },
      null,
      2,
    ),
  );

  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
