/**
 * Staging validation — Phase 1 Local Pack welcome email (SendGrid + cron + CEO KPI).
 * Usage: node scripts/staging-validate-phase1-email.mjs
 *
 * Requires: DATABASE_URL (staging), CRON_SECRET, optional SENDGRID_API_KEY for Activity check.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BASE = process.env.STAGING_WEB_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
const QA_PASSWORD = "StagingQA2026!";
const RUN_ID = `phase1-${Date.now()}`;
const TEST_CONTACT_EMAIL = process.env.PHASE1_TEST_EMAIL?.trim() || `phase1-welcome-${RUN_ID}@nelvyon.test`;

function loadStagingEnv() {
  const envPath = path.join(ROOT, "apps/web/.env.staging.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

async function applyMigration(client) {
  const sqlPath = path.join(ROOT, "backend/migrations/email_queue_scheduled_at.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await client.query(sql);
  const col = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'email_queue' AND column_name = 'scheduled_at'`,
  );
  return col.rows.length > 0;
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const data = await res.json();
  return { token: data.token, userId: data.userId };
}

async function getWorkspaceId(token) {
  const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`workspaces ${res.status}`);
  const list = await res.json();
  const ws = Array.isArray(list) ? list[0] : list?.items?.[0];
  if (!ws?.id) throw new Error("no workspace");
  return ws.id;
}

async function kickoff(token, workspaceId) {
  const payload = {
    business_name: `Phase1 QA ${RUN_ID}`,
    sector: "dental",
    city: "Madrid",
    country: "ES",
    value_proposition: "Clínica dental de prueba Fase 1 email",
    primary_cta: "Reservar cita",
    contact_email: TEST_CONTACT_EMAIL,
    contact_name: "Phase1 QA",
  };
  const res = await fetch(`${BASE}/api/os/packs/local-business-growth/kickoff`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": String(workspaceId),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`kickoff ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function pollRun(token, workspaceId, runId) {
  for (let i = 0; i < 25; i += 1) {
    const res = await fetch(`${BASE}/api/os/packs/local-business-growth/${runId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Workspace-Id": String(workspaceId),
      },
    });
    if (res.ok) {
      const run = await res.json();
      if (["completed", "needs_review", "failed"].includes(run.status)) return run;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("kickoff poll timeout");
}

async function callCron(cronSecret) {
  const res = await fetch(`${BASE}/api/cron/local-pack-email-queue?limit=50`, {
    headers: { "x-cron-secret": cronSecret },
  });
  const body = await res.text();
  return { status: res.status, body: body.slice(0, 500) };
}

async function fetchCeoMetrics(token, workspaceId, campaignId) {
  const qs = campaignId ? `?campaign_id=${campaignId}` : "";
  const res = await fetch(`${BASE}/api/platform/packs/local-growth/ceo-metrics${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Workspace-Id": String(workspaceId),
    },
  });
  if (!res.ok) return { ok: false, status: res.status, text: await res.text() };
  return { ok: true, payload: await res.json() };
}

async function queryEmailQueue(client, toEmail) {
  const r = await client.query(
    `SELECT id, status, sent_at IS NOT NULL AS has_sent_at, scheduled_at, subject, error_message
     FROM email_queue
     WHERE LOWER(to_email) = LOWER($1) AND email_type = 'campaign'
     ORDER BY id DESC
     LIMIT 10`,
    [toEmail],
  );
  return r.rows;
}

async function checkSendGridActivity(apiKey, toEmail) {
  if (!apiKey) return { checked: false, count: null, reason: "no_api_key_in_env" };
  try {
    const res = await fetch(
      `https://api.sendgrid.com/v3/messages?query=${encodeURIComponent(`to_email="${toEmail}"`)}&limit=10`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      },
    );
    if (res.status === 404 || res.status === 403) {
      const stats = await fetch("https://api.sendgrid.com/v3/stats?start_date=2026-06-01", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return {
        checked: true,
        count: null,
        reason: `messages_api_${res.status}`,
        statsOk: stats.ok,
      };
    }
    if (!res.ok) return { checked: true, count: 0, reason: `http_${res.status}` };
    const data = await res.json();
    const msgs = data.messages ?? data.result ?? [];
    return { checked: true, count: Array.isArray(msgs) ? msgs.length : 0, reason: "messages_api" };
  } catch (e) {
    return { checked: false, count: null, reason: String(e) };
  }
}

async function main() {
  loadStagingEnv();

  const dbUrl = process.env.DATABASE_URL?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();

  const report = {
    migration: false,
    cronRoute: null,
    kickoff: null,
    emailQueue: [],
    sentCount: 0,
    sendgrid: null,
    ceoWelcome: null,
    done: false,
    blockers: [],
  };

  if (!dbUrl) {
    report.blockers.push("DATABASE_URL missing");
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    report.migration = await applyMigration(client);
  } catch (e) {
    report.blockers.push(`migration: ${e.message}`);
  }

  if (!cronSecret) {
    report.blockers.push("CRON_SECRET missing (set from Railway)");
  } else {
    const cronProbe = await fetch(`${BASE}/api/cron/local-pack-email-queue`, {
      headers: { "x-cron-secret": "wrong" },
    });
    report.cronRoute = cronProbe.status === 401 ? "exists" : `status_${cronProbe.status}`;
    if (cronProbe.status === 404) report.blockers.push("cron route 404 — Phase 1 not deployed?");
  }

  try {
    const { token } = await login();
    const workspaceId = await getWorkspaceId(token);
    const run = await kickoff(token, workspaceId);
    report.kickoff = { id: run.id, status: run.status };
    const finalRun = await pollRun(token, workspaceId, run.id);
    report.kickoff.finalStatus = finalRun.status;
    const campaignId = finalRun.report?.kpis?.saas_campaign_id ?? null;
    const welcomeIds =
      finalRun.report?.kpis?.email_queue_ids ??
      finalRun.steps?.find((s) => s.key === "welcome_email")?.metadata?.email_queue_ids;

    if (cronSecret && report.cronRoute === "exists") {
      report.cronResult = await callCron(cronSecret);
    }

    await new Promise((r) => setTimeout(r, 5000));

    report.emailQueue = await queryEmailQueue(client, TEST_CONTACT_EMAIL);
    report.sentCount = report.emailQueue.filter((r) => r.status === "sent" && r.has_sent_at).length;

    report.sendgrid = await checkSendGridActivity(sendgridKey, TEST_CONTACT_EMAIL);

    const ceo = await fetchCeoMetrics(token, workspaceId, campaignId);
    if (ceo.ok) {
      const w = ceo.payload.metrics?.find((m) => m.key === "welcome_sequence_status");
      report.ceoWelcome = w ? { value: w.value, available: w.available, hint: w.hint } : null;
    } else {
      report.ceoWelcome = { error: ceo.status, text: ceo.text?.slice(0, 200) };
    }

    report.done =
      report.sentCount >= 3 &&
      report.ceoWelcome?.value &&
      !String(report.ceoWelcome.value).toLowerCase().includes("cola") &&
      report.blockers.length === 0;
  } catch (e) {
    report.blockers.push(`e2e: ${e.message}`);
  } finally {
    await client.end();
  }

  console.log(JSON.stringify({ ...report, testEmail: TEST_CONTACT_EMAIL }, null, 2));
  process.exit(report.done ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
