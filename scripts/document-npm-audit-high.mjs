#!/usr/bin/env node
/**
 * Document npm audit high vulns without forcing upgrades.
 * Writes backend/local-ai/benchmarks/npm_audit_high_evidence.json
 *
 *   pnpm -C apps/web audit --json > ...  (this script runs it)
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "backend/local-ai/benchmarks");
mkdirSync(outDir, { recursive: true });
const evidencePath = join(outDir, "npm_audit_high_evidence.json");

const r = spawnSync("pnpm", ["audit", "--json"], {
  cwd: join(root, "apps/web"),
  encoding: "utf8",
  shell: true,
  timeout: 120000,
});

let parsed = null;
try {
  parsed = JSON.parse(r.stdout || "{}");
} catch {
  parsed = { parseError: true, stderr: (r.stderr || "").slice(0, 500) };
}

const advisories = parsed?.advisories || parsed?.vulnerabilities || {};
const highs = [];
const criticals = [];

if (parsed?.metadata?.vulnerabilities) {
  // pnpm v9+ shape
  const meta = parsed.metadata.vulnerabilities;
  for (const [name, info] of Object.entries(parsed.vulnerabilities || {})) {
    const sev = info.severity || info.severity;
    if (sev === "critical") criticals.push({ name, ...summarize(info) });
    if (sev === "high") highs.push({ name, ...summarize(info) });
  }
  writeEvidence(meta, highs, criticals);
} else if (typeof advisories === "object") {
  for (const adv of Object.values(advisories)) {
    const a = adv;
    if (a.severity === "critical") criticals.push(a);
    if (a.severity === "high") highs.push(a);
  }
  writeEvidence(parsed.metadata || {}, highs, criticals);
} else {
  writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ok: false,
        note: "Could not parse pnpm audit JSON — run manually: pnpm -C apps/web audit",
        exitStatus: r.status,
        stderr: (r.stderr || "").slice(0, 400),
        policy: "CI fails on critical only (KI-012 tracks high)",
      },
      null,
      2,
    ),
  );
  console.log("npm audit evidence written (parse incomplete)");
  process.exit(0);
}

function summarize(info) {
  return {
    severity: info.severity,
    via: Array.isArray(info.via) ? info.via.slice(0, 3) : info.via,
    fixAvailable: info.fixAvailable ?? null,
    isDirect: info.isDirect ?? null,
    range: info.range ?? null,
  };
}

function writeEvidence(meta, highsList, criticalsList) {
  const evidence = {
    generatedAt: new Date().toISOString(),
    ok: criticalsList.length === 0,
    criticalCount: criticalsList.length,
    highCount: highsList.length,
    metadata: meta,
    criticals: criticalsList.slice(0, 50),
    highs: highsList.slice(0, 80),
    policy: {
      ciFailsOn: "critical",
      highTrackedAs: "KI-012",
      nextAction: "Dependabot PRs; bump direct deps when fixAvailable && tests green",
    },
    claimComplete: false,
  };
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: evidence.ok,
        critical: evidence.criticalCount,
        high: evidence.highCount,
        path: evidencePath,
      },
      null,
      2,
    ),
  );
}
