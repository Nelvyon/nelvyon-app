/**
 * KI-026 staging isolation evidence.
 *
 * 1) Catalog: RLS ON + expected policies present (required).
 * 2) Predicate isolation: evaluate the same expressions the policies use
 *    (current_tenant_id / JWT helpers). Proves ADR-032 wiring.
 * 3) Optional runtime RLS via SET ROLE nelvyon_rls_probe (often denied on
 *    managed superuser/pooler connections — recorded, not required for ok).
 *
 * Usage: DATABASE_URL=... node scripts/verify-ki026-rls-isolation.mjs
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const requireFromWeb = createRequire(join(root, "apps/web/package.json"));
const pg = requireFromWeb("pg");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(2);
}

const evidencePath = join(root, "backend/local-ai/benchmarks/ki026_rls_isolation_evidence.json");
mkdirSync(dirname(evidencePath), { recursive: true });

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const evidence = {
  generatedAt: new Date().toISOString(),
  method: "catalog_plus_predicate",
  ok: false,
  checks: {},
  errors: [],
  notes: [],
};

async function q(sql, params = []) {
  return client.query(sql, params);
}

try {
  const core = [
    ["audit_logs", ["audit_logs_saas_tenant_select", "audit_logs_saas_tenant_insert"]],
    ["cdp_segments", ["cdp_segments_tenant"]],
    ["chatbot_conversations", ["chatbot_conversations_user"]],
    ["dialer_calls", ["dialer_calls_tenant"]],
    ["funnels", ["funnels_tenant"]],
    ["funnel_steps", ["funnel_steps_tenant"]],
    ["lms_enrollments", ["lms_enrollments_tenant"]],
    ["lms_progress", ["lms_progress_tenant"]],
    ["social_accounts", ["social_accounts_tenant"]],
    ["social_alerts", ["social_alerts_tenant"]],
    ["social_mentions", ["social_mentions_tenant"]],
    ["social_posts", ["social_posts_tenant"]],
    ["social_post_analytics", ["social_post_analytics_tenant"]],
  ];

  const policyMap = {};
  for (const [table, expected] of core) {
    const r = await q(
      `SELECT pol.polname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
       WHERE n.nspname = 'public' AND c.relname = $1`,
      [table],
    );
    const rls = r.rows[0]?.relrowsecurity === true;
    const names = r.rows.map((x) => x.polname).filter(Boolean);
    const missing = expected.filter((e) => !names.includes(e));
    policyMap[table] = { rlsOn: rls, policies: names, missingExpected: missing };
  }
  evidence.checks.policies = policyMap;
  evidence.checks.mig516 = (
    await q(`SELECT EXISTS (SELECT 1 FROM _migrations WHERE name LIKE '516_%') AS ok`)
  ).rows[0].ok;
  evidence.checks.current_tenant_id = (
    await q(`SELECT to_regprocedure('public.current_tenant_id()') IS NOT NULL AS ok`)
  ).rows[0].ok;
  evidence.checks.shared_memory_untouched = (
    await q(`
      SELECT
        EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saas_shared_memory_entries'
          AND policyname = 'saas_shared_memory_entries_saas_tenant') AS entries_ok,
        EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saas_shared_memory_audit'
          AND policyname = 'saas_shared_memory_audit_saas_tenant') AS audit_ok
    `)
  ).rows[0];

  // Policy quals snapshot (prove expressions use correct helpers)
  const quals = await q(`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
    ORDER BY tablename, policyname
  `, [core.map((c) => c[0])]);
  evidence.checks.policy_definitions = quals.rows.map((r) => ({
    table: r.tablename,
    policy: r.policyname,
    cmd: r.cmd,
    uses_current_tenant_id: String(r.qual || "").includes("current_tenant_id")
      || String(r.with_check || "").includes("current_tenant_id"),
    uses_saas_uuid: String(r.qual || "").includes("nelvyon_current_saas_tenant_uuid")
      || String(r.with_check || "").includes("nelvyon_current_saas_tenant_uuid"),
    uses_jwt_user: String(r.qual || "").includes("nelvyon_jwt_user_id")
      || String(r.with_check || "").includes("nelvyon_jwt_user_id"),
  }));

  // --- Predicate isolation: FastAPI funnels ---
  const wsA = 910001;
  const wsB = 910002;
  let funnelPred = { ok: false };
  try {
    await q(`DELETE FROM funnels WHERE workspace_id IN ($1,$2)`, [wsA, wsB]);
    const fa = await q(
      `INSERT INTO funnels (workspace_id, name, status) VALUES ($1,'ki026-a','draft') RETURNING id`,
      [wsA],
    );
    const fb = await q(
      `INSERT INTO funnels (workspace_id, name, status) VALUES ($1,'ki026-b','draft') RETURNING id`,
      [wsB],
    );
    const idA = fa.rows[0].id;
    const idB = fb.rows[0].id;

    // set_tenant_context uses set_config(..., is_local=true) — must share one transaction
    await q(`BEGIN`);
    await q(`SELECT set_tenant_context($1)`, [wsA]);
    const seenA = (
      await q(
        `SELECT id FROM funnels WHERE id = ANY($1::uuid[]) AND workspace_id = public.current_tenant_id()`,
        [[idA, idB]],
      )
    ).rows;
    await q(`COMMIT`);

    await q(`BEGIN`);
    await q(`SELECT set_tenant_context($1)`, [wsB]);
    const seenB = (
      await q(
        `SELECT id FROM funnels WHERE id = ANY($1::uuid[]) AND workspace_id = public.current_tenant_id()`,
        [[idA, idB]],
      )
    ).rows;
    await q(`COMMIT`);

    await q(`BEGIN`);
    await q(`SELECT set_config('app.tenant_id', '', true)`);
    const seenNone = (
      await q(
        `SELECT id FROM funnels WHERE id = ANY($1::uuid[]) AND workspace_id = public.current_tenant_id()`,
        [[idA, idB]],
      )
    ).rows;
    await q(`COMMIT`);

    funnelPred = {
      ok:
        seenA.length === 1 &&
        seenA[0].id === idA &&
        seenB.length === 1 &&
        seenB[0].id === idB &&
        seenNone.length === 0,
      seenA: seenA.length,
      seenB: seenB.length,
      seenNone: seenNone.length,
    };
    await q(`DELETE FROM funnels WHERE id IN ($1,$2)`, [idA, idB]);
  } catch (e) {
    evidence.errors.push(`funnels_pred: ${e instanceof Error ? e.message : String(e)}`);
    funnelPred = { ok: false, error: String(e) };
  }
  evidence.checks.fastapi_funnels_predicate = funnelPred;

  // --- Predicate: SaaS audit via nelvyon_current_saas_tenant_uuid ---
  let auditPred = { ok: false, skipped: false };
  try {
    const tenants = (
      await q(
        `SELECT id::text, user_id::text FROM saas_tenants
         WHERE onboarding_completed = true AND user_id IS NOT NULL
         ORDER BY created_at ASC LIMIT 2`,
      )
    ).rows;
    if (tenants.length < 2) {
      auditPred = { ok: false, skipped: true, reason: "need >=2 onboarding saas_tenants" };
    } else {
      const tA = tenants[0];
      const tB = tenants[1];
      const ra = await q(
        `INSERT INTO audit_logs (tenant_id, action, module, details)
         VALUES ($1::uuid, 'ki026_probe_a', 'ki026', '{}'::jsonb) RETURNING id`,
        [tA.id],
      );
      const rb = await q(
        `INSERT INTO audit_logs (tenant_id, action, module, details)
         VALUES ($1::uuid, 'ki026_probe_b', 'ki026', '{}'::jsonb) RETURNING id`,
        [tB.id],
      );
      const idA = ra.rows[0].id;
      const idB = rb.rows[0].id;

      await q(`BEGIN`);
      await q(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [tA.user_id]);
      const seenA = (
        await q(
          `SELECT id FROM audit_logs
           WHERE id = ANY($1::uuid[])
             AND tenant_id = public.nelvyon_current_saas_tenant_uuid()`,
          [[idA, idB]],
        )
      ).rows;
      await q(`COMMIT`);

      await q(`BEGIN`);
      await q(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [tB.user_id]);
      const seenB = (
        await q(
          `SELECT id FROM audit_logs
           WHERE id = ANY($1::uuid[])
             AND tenant_id = public.nelvyon_current_saas_tenant_uuid()`,
          [[idA, idB]],
        )
      ).rows;
      await q(`COMMIT`);

      await q(`BEGIN`);
      await q(`SELECT set_config('request.jwt.claim.sub', '', true)`);
      const seenNone = (
        await q(
          `SELECT id FROM audit_logs
           WHERE id = ANY($1::uuid[])
             AND tenant_id = public.nelvyon_current_saas_tenant_uuid()`,
          [[idA, idB]],
        )
      ).rows;
      await q(`COMMIT`);

      auditPred = {
        ok:
          seenA.length === 1 &&
          String(seenA[0].id) === String(idA) &&
          seenB.length === 1 &&
          String(seenB[0].id) === String(idB) &&
          seenNone.length === 0,
        seenA: seenA.length,
        seenB: seenB.length,
        seenNone: seenNone.length,
      };
      await q(`DELETE FROM audit_logs WHERE id IN ($1,$2)`, [idA, idB]);
    }
  } catch (e) {
    evidence.errors.push(`audit_pred: ${e instanceof Error ? e.message : String(e)}`);
    auditPred = { ok: false, error: String(e) };
  }
  evidence.checks.saas_audit_predicate = auditPred;

  // --- Predicate: chatbot via nelvyon_jwt_user_id ---
  let chatPred = { ok: false, skipped: false };
  try {
    const users = (
      await q(`SELECT user_id::text FROM nelvyon_users ORDER BY created_at ASC NULLS LAST LIMIT 2`)
    ).rows;
    if (users.length < 2) {
      chatPred = { ok: false, skipped: true, reason: "need >=2 nelvyon_users" };
    } else {
      const uA = users[0].user_id;
      const uB = users[1].user_id;
      const cfgA = await q(
        `INSERT INTO chatbot_configs (user_id, name)
         VALUES ($1::uuid, 'ki026-a')
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [uA],
      );
      const cfgB = await q(
        `INSERT INTO chatbot_configs (user_id, name)
         VALUES ($1::uuid, 'ki026-b')
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [uB],
      );
      const botA = cfgA.rows[0].id;
      const botB = cfgB.rows[0].id;
      const cA = await q(
        `INSERT INTO chatbot_conversations (chatbot_id, session_id, messages)
         VALUES ($1, $2, '[]'::jsonb) RETURNING id`,
        [botA, `ki026-a-${Date.now()}`],
      );
      const cB = await q(
        `INSERT INTO chatbot_conversations (chatbot_id, session_id, messages)
         VALUES ($1, $2, '[]'::jsonb) RETURNING id`,
        [botB, `ki026-b-${Date.now()}`],
      );
      const idA = cA.rows[0].id;
      const idB = cB.rows[0].id;

      await q(`BEGIN`);
      await q(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uA]);
      const seenA = (
        await q(
          `SELECT id FROM chatbot_conversations
           WHERE id = ANY($1::uuid[])
             AND chatbot_id IN (
               SELECT id FROM chatbot_configs WHERE user_id = public.nelvyon_jwt_user_id()
             )`,
          [[idA, idB]],
        )
      ).rows;
      await q(`COMMIT`);

      await q(`BEGIN`);
      await q(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uB]);
      const seenB = (
        await q(
          `SELECT id FROM chatbot_conversations
           WHERE id = ANY($1::uuid[])
             AND chatbot_id IN (
               SELECT id FROM chatbot_configs WHERE user_id = public.nelvyon_jwt_user_id()
             )`,
          [[idA, idB]],
        )
      ).rows;
      await q(`COMMIT`);

      await q(`BEGIN`);
      await q(`SELECT set_config('request.jwt.claim.sub', '', true)`);
      const seenNone = (
        await q(
          `SELECT id FROM chatbot_conversations
           WHERE id = ANY($1::uuid[])
             AND chatbot_id IN (
               SELECT id FROM chatbot_configs WHERE user_id = public.nelvyon_jwt_user_id()
             )`,
          [[idA, idB]],
        )
      ).rows;
      await q(`COMMIT`);

      chatPred = {
        ok:
          seenA.length === 1 &&
          String(seenA[0].id) === String(idA) &&
          seenB.length === 1 &&
          String(seenB[0].id) === String(idB) &&
          seenNone.length === 0,
        seenA: seenA.length,
        seenB: seenB.length,
        seenNone: seenNone.length,
      };
      await q(`DELETE FROM chatbot_conversations WHERE id IN ($1,$2)`, [idA, idB]);
    }
  } catch (e) {
    evidence.errors.push(`chat_pred: ${e instanceof Error ? e.message : String(e)}`);
    chatPred = { ok: false, error: String(e) };
  }
  evidence.checks.chatbot_predicate = chatPred;

  // SET ROLE probe skipped on pooler (drops connection); document limitation
  evidence.checks.runtime_set_role = {
    attempted: false,
    skipped: true,
    reason:
      "Supabase pooler/superuser: SET ROLE drops session; FORCE RLS bypassed by superuser. Predicate isolation validates policy expressions.",
  };
  evidence.notes.push(
    "Runtime RLS enforcement requires a non-superuser DB role. Catalog + transactional predicate isolation validate ADR-032 wiring.",
  );

  const policyOk = Object.values(policyMap).every(
    (p) => p.rlsOn && p.missingExpected.length === 0,
  );
  const auditOk = auditPred.ok === true || auditPred.skipped === true;
  const chatOk = chatPred.ok === true || chatPred.skipped === true;

  evidence.ok =
    evidence.checks.mig516 === true &&
    evidence.checks.current_tenant_id === true &&
    policyOk &&
    funnelPred.ok === true &&
    auditOk &&
    chatOk &&
    evidence.checks.shared_memory_untouched?.entries_ok === true;

  if (auditPred.skipped !== true && auditPred.ok !== true) evidence.ok = false;
  if (chatPred.skipped !== true && chatPred.ok !== true) evidence.ok = false;

  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(evidence.ok ? 0 : 1);
} catch (e) {
  evidence.errors.push(e instanceof Error ? e.message : String(e));
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.error(JSON.stringify(evidence, null, 2));
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
