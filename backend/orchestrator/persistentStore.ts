/**
 * Persistent orchestrator job store — file-backed checkpoints (Block C).
 * Survives process restart when NELVYON_ORCH_PERSIST_DIR is set.
 * Default: in-memory only (same as before) when dir unset.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { OrchestratorJob } from "./contracts";

export type PersistedOrchestratorState = {
  version: 1;
  savedAt: string;
  jobs: OrchestratorJob[];
};

export function getOrchestratorPersistDir(): string | null {
  const d = process.env.NELVYON_ORCH_PERSIST_DIR?.trim();
  return d || null;
}

export function loadPersistedJobs(dir: string): Map<string, OrchestratorJob> {
  const map = new Map<string, OrchestratorJob>();
  const path = join(dir, "orchestrator_jobs.json");
  if (!existsSync(path)) return map;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as PersistedOrchestratorState;
    for (const j of raw.jobs ?? []) {
      if (j?.jobId && j?.tenantId) map.set(j.jobId, j);
    }
  } catch {
    /* corrupt → empty; caller may dead-letter */
  }
  return map;
}

export function checkpointJobs(dir: string, jobs: Iterable<OrchestratorJob>): void {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "orchestrator_jobs.json");
  const tmp = join(dir, "orchestrator_jobs.json.tmp");
  const state: PersistedOrchestratorState = {
    version: 1,
    savedAt: new Date().toISOString(),
    jobs: [...jobs],
  };
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, path);
}

/** On restart: queued/running → queued for recovery; terminal states kept. */
export function recoverJobsAfterRestart(jobs: Map<string, OrchestratorJob>): number {
  let recovered = 0;
  for (const j of jobs.values()) {
    if (j.state === "running" || j.state === "waiting_tool" || j.state === "waiting_approval") {
      j.state = "queued";
      j.startedAt = null;
      j.lastError = j.lastError ?? "recovered_after_restart";
      recovered++;
    }
  }
  return recovered;
}
