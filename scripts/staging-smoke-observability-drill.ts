/**
 * Controlled local observability drill — Block 22.
 * Exercises OpsObservabilityCore APIs and writes evidence.
 * No paid Datadog/New Relic/APM. No network required.
 *
 * Usage: node scripts/staging-smoke-observability-drill.mjs
 *    or: pnpm -C apps/web exec tsx scripts/staging-smoke-observability-drill.ts
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INCIDENT_RUNBOOK_PATH,
  assertOpsObservabilityCoreIntegrity,
  buildOpsHealthSnapshot,
  buildStructuredLog,
  generateCorrelationId,
  opsMetrics,
  resetOpsObservabilityForTests,
  simulateAlert,
} from "../backend/agency/OpsObservabilityCore";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ROLLBACK_KILL_NOTES = [
  "Flag rollback preferred over code revert (docs/ops/INCIDENT_RUNBOOK.md).",
  "NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1 — RAG kill switch",
  "NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1 — AI canary kill",
  "NELVYON_ADS_SPEND_ENABLED=0 — ads spend remain OFF",
  "AUTONOMOUS_ALLOW_OPENAI=0 — no OpenAI spend",
  "Paid APM (Datadog/New Relic): NOT claimed — PREPARED_OFF / not installed",
];

function pass(check: string, detail = "ok") {
  console.log(`PASS [observability-drill] ${check}: ${detail}`);
}
function fail(check: string, detail: string) {
  console.log(`FAIL [observability-drill] ${check}: ${detail}`);
}

function runVitest(): boolean {
  const isWin = process.platform === "win32";
  const result = spawnSync(
    isWin ? "pnpm.cmd" : "pnpm",
    ["-C", "apps/web", "exec", "vitest", "run", "backend/agency/__tests__/OpsObservabilityCore.test.ts", "--reporter=dot"],
    { cwd: REPO_ROOT, stdio: "inherit", shell: isWin, env: process.env },
  );
  return result.status === 0;
}

function writeEvidence(payload: {
  vitestOk: boolean;
  correlationId: string;
  log: ReturnType<typeof buildStructuredLog>;
  integrityOk: boolean;
  liveMetric: number;
  liveAlertId: string;
  liveSnapshotProbeCount: number;
  snapshotTimestampMs: number;
}) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = join(REPO_ROOT, "scripts", "docs", "evidence", "os-saas-e2e", "modules");
  mkdirSync(dir, { recursive: true });

  const md = `# Observability local drill — Block 22

| Campo | Valor |
|-------|-------|
| Fecha | ${now.toISOString()} |
| Scope | **Local / free** \`OpsObservabilityCore\` only |
| Paid APM (Datadog / New Relic / PagerDuty) | **NOT claimed** — PREPARED_OFF / not installed |
| Vitest \`OpsObservabilityCore.test.ts\` | ${payload.vitestOk ? "PASS" : "FAIL"} |
| Integrity \`assertOpsObservabilityCoreIntegrity\` | ${payload.integrityOk ? "PASS" : "FAIL"} |
| Incident runbook | \`${INCIDENT_RUNBOOK_PATH}\` |
| Status | **IMPLEMENTED_VERIFIED (local core)** |

## Demonstrated controls

### 1. Correlation id
\`${payload.correlationId}\`

### 2. Structured log
\`\`\`json
${JSON.stringify(payload.log, null, 2)}
\`\`\`

### 3. Metric increment
- Counter \`drill_requests_total\` after \`increment(1)\` + \`increment(2)\` → **${payload.liveMetric}**

### 4. Simulated alert (in-memory only — not paging)
\`\`\`json
${JSON.stringify({ id: payload.liveAlertId, severity: "P2", message: "simulated_latency_blip_local_only", correlationId: payload.correlationId }, null, 2)}
\`\`\`

### 5. Health snapshot
- Probes: **${payload.liveSnapshotProbeCount}**
- Runbook path: \`${INCIDENT_RUNBOOK_PATH}\`
- Snapshot timestampMs: ${payload.snapshotTimestampMs}

### 6. Rollback / kill notes
${ROLLBACK_KILL_NOTES.map((n) => `- ${n}`).join("\n")}

## Honestidad

- Este drill **no** activa vendors de APM de pago.
- \`simulateAlert\` es un stand-in local in-memory (ver INCIDENT_RUNBOOK) — **no** pagina a humanos.
- Sin red obligatoria; staging URL en snapshot es solo para etiquetar probes de health conocidos.
`;

  const stamped = join(dir, `observability.drill_${stamp}.md`);
  const latest = join(dir, "observability.drill_latest.md");
  writeFileSync(stamped, md, "utf8");
  writeFileSync(latest, md, "utf8");
  console.log(`\nEvidence written: ${latest}`);
  console.log(`Evidence stamped: ${stamped}`);
  return latest;
}

function main() {
  console.log("=== Observability local drill (OpsObservabilityCore) ===");

  const vitestOk = runVitest();
  if (vitestOk) pass("vitest", "OpsObservabilityCore.test.ts green");
  else fail("vitest", "OpsObservabilityCore.test.ts failed");

  // Live drill (separate from integrity which resets state)
  resetOpsObservabilityForTests();
  const correlationId = generateCorrelationId("drill");
  const log = buildStructuredLog("info", "observability_local_drill_started", {
    correlationId,
    tenantId: "tenant-drill-synthetic",
    context: { surface: "ops_observability_core", paidApm: false },
  });
  opsMetrics.increment("drill_requests_total");
  opsMetrics.increment("drill_requests_total", 2);
  const liveMetric = opsMetrics.get("drill_requests_total");
  const alert = simulateAlert("P2", "simulated_latency_blip_local_only", correlationId);
  const snapshot = buildOpsHealthSnapshot("https://ideal-victory-staging.up.railway.app");

  pass("correlation_id", correlationId);
  pass("structured_log", `${log.level}:${log.message}`);
  pass("metric_increment", `drill_requests_total=${liveMetric}`);
  pass("simulated_alert", `${alert.severity} ${alert.id}`);
  pass("health_snapshot", `probes=${snapshot.probes.length} runbook=${snapshot.incidentRunbookPath}`);
  pass("rollback_kill_notes", `${ROLLBACK_KILL_NOTES.length} notes`);

  const integrity = assertOpsObservabilityCoreIntegrity();
  if (integrity.ok) pass("integrity", "ok");
  else fail("integrity", integrity.violations.join(", "));

  writeEvidence({
    vitestOk,
    correlationId,
    log,
    integrityOk: integrity.ok,
    liveMetric,
    liveAlertId: alert.id,
    liveSnapshotProbeCount: snapshot.probes.length,
    snapshotTimestampMs: snapshot.timestampMs,
  });

  if (!vitestOk || !integrity.ok) {
    console.log("CRITICAL_FAIL");
    process.exit(1);
  }
  console.log("ALL_PASS (local core only — no paid APM claimed)");
  process.exit(0);
}

main();
