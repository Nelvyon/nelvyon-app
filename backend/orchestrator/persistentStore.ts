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

/**
 * Al reiniciar: lo interrumpido vuelve a la cola. Lo que esperaba a un humano, NO.
 *
 * `waiting_approval` estaba en esta lista junto a `running` y `waiting_tool`, y
 * eso convertia cualquier reinicio —un despliegue, un contenedor que se
 * recicla— en un salto de la aprobacion: el trabajo volvia a `queued`, el
 * demonio lo cogia en el siguiente tick y ejecutaba la accion que un humano
 * todavia no habia autorizado. Sin rastro de que se hubiera saltado nada.
 *
 * La diferencia entre los tres estados no es de matiz:
 *
 *   - `running`      — se estaba ejecutando y el proceso murio. Reencolar es lo
 *                      correcto: nadie decidio nada, solo se corto.
 *   - `waiting_tool` — una llamada a una herramienta quedo a medias. Igual.
 *   - `waiting_approval` — hay una PERSONA que todavia no ha dicho que si.
 *                      Reencolarlo no es recuperar: es decidir en su nombre.
 *
 * Una recuperacion nunca puede completar una decision que no ha tomado nadie.
 */
export function recoverJobsAfterRestart(jobs: Map<string, OrchestratorJob>): number {
  let recovered = 0;
  for (const j of jobs.values()) {
    if (j.state === "running" || j.state === "waiting_tool") {
      j.state = "queued";
      j.startedAt = null;
      j.lastError = j.lastError ?? "recovered_after_restart";
      recovered++;
    }
  }
  return recovered;
}
