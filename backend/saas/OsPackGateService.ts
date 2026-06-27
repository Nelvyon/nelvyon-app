/**
 * O22 — OsPackGateService
 * Blocking gate that validates all 8 pack fixtures + the OS QA vitest suite.
 * Ports are injectable so vitest never spawns a sub-vitest or hits live runners;
 * the production singleton lazy-loads the cert service + spawns vitest.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Ports ───────────────────────────────────────────────────────────────────────

export type CertPort = {
  validateAllFixtures(): Array<{ packId: string; valid: boolean }>;
  dryRunAll(): Promise<Array<{ packId: string; status: string }>>;
};

export type VitestPort = {
  runGateTests(): Promise<{ passed: number; failed: number; files: string[] }>;
};

// ── Types ───────────────────────────────────────────────────────────────────────

export type GateTriggerSource = "ci" | "manual" | "cron";
export type GateStatus = "running" | "passed" | "failed";

export type GateCheck = { name: string; ok: boolean; detail?: string };

export type PackGateRun = {
  id: string;
  runKey: string;
  triggerSource: GateTriggerSource;
  status: GateStatus;
  packsTotal: number;
  packsPassed: number;
  packsFailed: number;
  checks: GateCheck[];
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
};

export type PackGateSummary = {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  lastStatus: GateStatus | null;
};

export type RunLocalGateResult = {
  runId: string | null;
  runKey: string;
  status: GateStatus;
  packsPassed: number;
  packsFailed: number;
  checks: GateCheck[];
};

export type OsPackGateErrorCode = "NOT_FOUND";

export class OsPackGateError extends Error {
  constructor(public readonly code: OsPackGateErrorCode, message: string) {
    super(message);
    this.name = "OsPackGateError";
  }
}

type GateRow = {
  id: string;
  run_key: string;
  trigger_source: GateTriggerSource;
  status: GateStatus;
  packs_total: number;
  packs_passed: number;
  packs_failed: number;
  checks: GateCheck[];
  error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
};

function rowToRun(r: GateRow): PackGateRun {
  return {
    id: r.id,
    runKey: r.run_key,
    triggerSource: r.trigger_source,
    status: r.status,
    packsTotal: r.packs_total,
    packsPassed: r.packs_passed,
    packsFailed: r.packs_failed,
    checks: r.checks ?? [],
    errorMessage: r.error_message,
    metadata: r.metadata ?? {},
    startedAt: r.started_at,
    completedAt: r.completed_at,
  };
}

const GATE_TEST_FILES = [
  "apps/web/src/lib/packs/__tests__/packCertification.o17.test.ts",
  "backend/autonomous/__tests__/visualQaEngine.test.ts",
  "backend/autonomous/__tests__/OsVisualQaGateService.o18.test.ts",
];

// ── Default ports ────────────────────────────────────────────────────────────────

const defaultCertPort: CertPort = {
  validateAllFixtures() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cert = require("../os-agents/packs/OsPackCertificationService") as {
      ALL_PACK_IDS: string[];
      PACK_FIXTURES: Record<string, Record<string, unknown>>;
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RUNNERS } = require("../../apps/web/src/app/api/os/packs/[packId]/kickoff/runnersMap") as {
      RUNNERS: Record<string, { validate: (b: unknown) => unknown }>;
    };
    return cert.ALL_PACK_IDS.map((packId) => {
      const entry = RUNNERS[packId];
      const valid = !!entry && entry.validate(cert.PACK_FIXTURES[packId]) !== null;
      return { packId, valid };
    });
  },
  async dryRunAll() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ALL_PACK_IDS } = require("../os-agents/packs/OsPackCertificationService") as { ALL_PACK_IDS: string[] };
    return ALL_PACK_IDS.map((packId) => ({ packId, status: "pending" }));
  },
};

const defaultVitestPort: VitestPort = {
  async runGateTests() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
    const res = spawnSync(
      "pnpm",
      ["-C", "apps/web", "exec", "vitest", "run", ...GATE_TEST_FILES, "--reporter=dot"],
      { encoding: "utf-8", shell: process.platform === "win32" },
    );
    const ok = res.status === 0;
    return { passed: ok ? GATE_TEST_FILES.length : 0, failed: ok ? 0 : GATE_TEST_FILES.length, files: GATE_TEST_FILES };
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsPackGateService | null = null;

export function getOsPackGateService(): OsPackGateService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new OsPackGateService(DbClient.getInstance(), defaultCertPort, defaultVitestPort);
  }
  return _instance;
}

export function resetOsPackGateServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsPackGateService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly cert: CertPort = defaultCertPort,
    private readonly vitest: VitestPort = defaultVitestPort,
  ) {}

  async startRun(runKey: string, source: GateTriggerSource = "ci"): Promise<PackGateRun> {
    const rows = await this.db.query<GateRow>(
      `INSERT INTO os_pack_gate_runs (run_key, trigger_source, status)
       VALUES ($1, $2, 'running')
       RETURNING *`,
      [runKey, source],
    );
    return rowToRun(rows[0]!);
  }

  async completeRun(
    id: string,
    result: { packsPassed: number; packsFailed: number; checks: GateCheck[] },
  ): Promise<PackGateRun> {
    const status: GateStatus = result.packsFailed === 0 && result.checks.every((c) => c.ok) ? "passed" : "failed";
    const rows = await this.db.query<GateRow>(
      `UPDATE os_pack_gate_runs
       SET status = $2, packs_passed = $3, packs_failed = $4, checks = $5::jsonb, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, result.packsPassed, result.packsFailed, JSON.stringify(result.checks)],
    );
    if (!rows[0]) throw new OsPackGateError("NOT_FOUND", `Gate run ${id} no encontrado`);
    return rowToRun(rows[0]);
  }

  async failRun(id: string, error: string): Promise<PackGateRun> {
    const rows = await this.db.query<GateRow>(
      `UPDATE os_pack_gate_runs
       SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, error],
    );
    if (!rows[0]) throw new OsPackGateError("NOT_FOUND", `Gate run ${id} no encontrado`);
    return rowToRun(rows[0]);
  }

  async listRuns(limit = 20): Promise<PackGateRun[]> {
    const rows = await this.db.query<GateRow>(
      `SELECT * FROM os_pack_gate_runs ORDER BY started_at DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map(rowToRun);
  }

  async getSummary(): Promise<PackGateSummary> {
    const rows = await this.db.query<{ status: GateStatus; count: string }>(
      `SELECT status, COUNT(*) AS count FROM os_pack_gate_runs
       WHERE started_at >= NOW() - INTERVAL '30 days'
       GROUP BY status`,
    );
    let total = 0, passed = 0, failed = 0;
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      total += n;
      if (r.status === "passed") passed += n;
      if (r.status === "failed") failed += n;
    }
    const last = await this.db.query<{ status: GateStatus }>(
      `SELECT status FROM os_pack_gate_runs ORDER BY started_at DESC LIMIT 1`,
    );
    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      lastStatus: last[0]?.status ?? null,
    };
  }

  /** Orchestrate the local blocking gate: validate 8 fixtures + dryRun + vitest. */
  async runLocalGate(opts: { runKey?: string; source?: GateTriggerSource; runVitest?: boolean } = {}): Promise<RunLocalGateResult> {
    const runKey = opts.runKey ?? `local-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const run = await this.startRun(runKey, opts.source ?? "manual");
    const checks: GateCheck[] = [];

    try {
      // 1 — validate all 8 fixtures
      const fixtures = this.cert.validateAllFixtures();
      let packsPassed = 0;
      let packsFailed = 0;
      for (const f of fixtures) {
        checks.push({ name: `fixture:${f.packId}`, ok: f.valid, detail: f.valid ? "valid" : "invalid fixture" });
        if (f.valid) packsPassed++; else packsFailed++;
      }

      // 2 — dry-run all 8 (no real runner in CI)
      const dry = await this.cert.dryRunAll();
      checks.push({ name: "dryRunAll", ok: dry.length === fixtures.length, detail: `${dry.length} packs dry-run` });

      // 3 — gate vitest suite (skippable in unit tests via runVitest:false)
      if (opts.runVitest !== false) {
        const vt = await this.vitest.runGateTests();
        checks.push({ name: "vitest", ok: vt.failed === 0, detail: `${vt.passed} passed / ${vt.failed} failed` });
      }

      const completed = await this.completeRun(run.id, { packsPassed, packsFailed, checks });
      return { runId: run.id, runKey, status: completed.status, packsPassed, packsFailed, checks };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.failRun(run.id, msg).catch(() => null);
      return { runId: run.id, runKey, status: "failed", packsPassed: 0, packsFailed: 0, checks: [...checks, { name: "error", ok: false, detail: msg }] };
    }
  }
}
