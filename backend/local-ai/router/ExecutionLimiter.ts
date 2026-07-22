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
      entry.onAbort = () => reject(new Error("task_cancelled"));
      signal.addEventListener("abort", entry.onAbort, { once: true });
    }
    waiters.push(entry);
  });

  active++;
  return { release: releaseSlot, queueWaitMs: Date.now() - waitStart };
}

function releaseSlot(): void {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) {
    if (next.onAbort) next.onAbort = undefined;
    next.resolve();
  }
}

export function resetExecutionLimiterForTests(): void {
  active = 0;
  waiters.length = 0;
}
