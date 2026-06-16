/**
 * Full Phase 1 staging probe (migration applied via applyEmailQueueMigrationStaging.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const BASE = "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const RUN_ID = Date.now();
const TEST_EMAIL = process.env.PHASE1_TEST_EMAIL?.trim() || `phase1-${RUN_ID}@nelvyon.test`;
const CRON_SECRET = process.env.CRON_SECRET?.trim() || "";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = fs.readFileSync(path.join(root, "apps/web/.env.staging.local"), "utf8");
const dbUrl = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login ${res.status}`);
  return data.token;
}

function authHeaders(token, ws) {
  return {
    Authorization: `Bearer ${token}`,
    Cookie: `nelvyon_token=${token}`,
    "X-Workspace-Id": String(ws),
    Accept: "application/json",
  };
}

async function workspaceId(token) {
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: authHeaders(token, ""),
  });
  const list = await res.json();
  return (Array.isArray(list) ? list[0] : list.items?.[0])?.id;
}

async function kickoff(token, ws) {
  const res = await fetch(`${BASE}/api/os/packs/local-business-growth/kickoff`, {
    method: "POST",
    headers: { ...authHeaders(token, ws), "Content-Type": "application/json" },
    body: JSON.stringify({
      business_name: `Phase1 ${RUN_ID}`,
      sector: "dental",
      city: "Madrid",
      value_proposition: "Validacion Fase 1 email",
      primary_cta: "Reservar cita",
      contact_email: TEST_EMAIL,
      contact_name: "Phase1 QA",
    }),
  });
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

async function poll(token, ws, id) {
  for (let i = 0; i < 25; i++) {
    const res = await fetch(`${BASE}/api/os/packs/local-business-growth/${id}`, {
      headers: authHeaders(token, ws),
    });
    if (res.ok) {
      const run = await res.json();
      if (["completed", "failed", "needs_review"].includes(run.status)) return run;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  return null;
}

async function ceo(token, ws, campaignId) {
  const qs = campaignId ? `?campaign_id=${campaignId}` : "";
  const res = await fetch(`${BASE}/api/platform/packs/local-growth/ceo-metrics${qs}`, {
    headers: authHeaders(token, ws),
  });
  return res.ok ? res.json() : { error: res.status, text: await res.text() };
}

async function main() {
  const cronRouteStatus = (await fetch(`${BASE}/api/cron/local-pack-email-queue`)).status;
  const cronStatusCheck = (await fetch(`${BASE}/api/cron/status-check`)).status;

  const token = await login();
  const ws = await workspaceId(token);
  const ko = await kickoff(token, ws);
  const run = ko.body?.id ? await poll(token, ws, ko.body.id) : null;
  const campaignId = run?.report?.kpis?.saas_campaign_id;

  let cronResult = null;
  if (CRON_SECRET && cronRouteStatus !== 404) {
    const c = await fetch(`${BASE}/api/cron/local-pack-email-queue?limit=50`, {
      headers: { "x-cron-secret": CRON_SECRET },
    });
    cronResult = { status: c.status, body: (await c.text()).slice(0, 300) };
  } else if (CRON_SECRET && cronRouteStatus === 404) {
    cronResult = { status: 404, body: "route_not_deployed" };
  } else {
    cronResult = { status: 0, body: "CRON_SECRET_not_available_locally" };
  }

  await new Promise((r) => setTimeout(r, 4000));

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = await client.query(
    `SELECT id, status, sent_at, scheduled_at, error_message, subject, created_at
     FROM email_queue WHERE LOWER(to_email) = LOWER($1) AND email_type = 'campaign'
     ORDER BY id ASC LIMIT 10`,
    [TEST_EMAIL],
  );
  const colCheck = await client.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name='email_queue' AND column_name='scheduled_at'",
  );
  await client.end();

  const ceoPayload = run ? await ceo(token, ws, campaignId) : null;
  const welcome = ceoPayload?.metrics?.find((m) => m.key === "welcome_sequence_status");
  const sentRows = rows.rows.filter((r) => r.status === "sent" && r.sent_at);

  console.log(
    JSON.stringify(
      {
        migrationScheduledAtColumn: colCheck.rowCount > 0,
        testEmail: TEST_EMAIL,
        cronLocalPackRouteStatus: cronRouteStatus,
        cronStatusCheckRouteStatus: cronStatusCheck,
        cronResult,
        kickoffHttp: ko.status,
        runStatus: run?.status,
        welcomeDispatchStatus: run?.report?.kpis?.welcome_email_status,
        emailQueueCount: rows.rows.length,
        emailQueue: rows.rows,
        sentWithSentAtCount: sentRows.length,
        welcomeKpi: welcome ? { value: welcome.value, available: welcome.available } : ceoPayload,
        phase1Done:
          sentRows.length >= 3 &&
          welcome?.value &&
          !String(welcome.value).toLowerCase().includes("cola") &&
          cronRouteStatus !== 404,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
