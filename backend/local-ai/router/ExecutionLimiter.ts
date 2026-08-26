const MAX_CONCURRENT = Number(process.env.ROUTER_MAX_CONCURRENT ?? 1);

let active = 0;
const waiters: Array<{ resolve: () => void; reject: (e: Error) => void; onAbort?: () => void }> = [];

export type ExecutionSlotHandle = { release: () => void; queueWaitMs: number };

/** Limits concurrent executeTask pipelines (RAG + Ollama) to avoid pool exhaustion. */
export async function acquireExecutionSlot(signal?: AbortSignal): Promise<ExecutionSlotHandle> {
  if (signal?.aborted) throw new Error("task_cancelled");

  const waitStart = Date.now();
  if (active < MAX_CONCURRENT) {
    active++;
    return { release: releaseSlot, queueWaitMs: 0 };
  }

  await new Promise<void>((resolve, reject) => {
    const entry = { resolve, reject, onAbort: undefined as (() => void) | undefined };
    if (signal) {
      /**
       * Al abortar hay que SACARLO DE LA COLA, no solo rechazar su promesa.
       *
       * Antes se quedaba dentro: al liberarse un hueco, `releaseSlot()` sacaba
       * a ese muerto y le llamaba a `resolve()`, que ya no hacia nada. La senal
       * de «te toca» se gastaba en alguien que ya no estaba, y el siguiente
       * vivo se quedaba esperando otra liberacion que podia no llegar nunca:
       * un trabajo colgado indefinidamente, sin error y sin nada que lo delate.
       */
      entry.onAbort = () => {
        const i = waiters.indexOf(entry);
        if (i >= 0) waiters.splice(i, 1);
        reject(new Error("task_cancelled"));
      };
      signal.addEventListener("abort", entry.onAbort, { once: true });
    }
    waiters.push(entry);
  });

  return { release: releaseSlot, queueWaitMs: Date.now() - waitStart };
}

function releaseSlot(): void {
  const next = waiters.shift();
  if (next) {
    /**
     * El hueco pasa DIRECTAMENTE al siguiente: `active` no baja.
     *
     * Antes se decrementaba y el esperador hacia `active++` despues del
     * `await`, o sea en una microtarea posterior. En ese hueco `active` estaba
     * por debajo de lo real, y cualquiera que llegase justo entonces veia sitio
     * libre y entraba: con limite 1 podia haber dos ejecutandose. Un limitador
     * que puede superar su propio limite no limita, retrasa.
     *
     * Cediendo el hueco sin soltarlo, el contador nunca miente.
     */
    if (next.onAbort) next.onAbort = undefined;
    next.resolve();
    return;
  }
  active = Math.max(0, active - 1);
}

export function resetExecutionLimiterForTests(): void {
  active = 0;
  waiters.length = 0;
}
