import { createLogger } from "../logger";
import { osOrchestrator, sectorFromServiceId } from "../os-agents/OsOrchestrator";
import type { OsQueueItem } from "../os-agents/types";
import { QueueClient } from "./queueClient";
import type { OsQueueWorkItem } from "./types";

const DEFAULT_POLL_MS = 2000;

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

class SlotPool {
  private free: number;
  private readonly waiters: Array<() => void> = [];

  constructor(slots: number) {
    this.free = slots;
  }

  acquire(): Promise<void> {
    if (this.free > 0) {
      this.free--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    const next = this.waiters.shift();
    if (next) next();
    else this.free++;
  }
}

let pollTimer: ReturnType<typeof setInterval> | undefined;
let barridoTimer: ReturnType<typeof setInterval> | undefined;

/** Cada cuanto late un trabajo en curso. */
const LATIDO_MS = 15_000;

/**
 * Cuanto silencio hace falta para dar un trabajo por muerto, y cada cuanto se
 * barre la lista de procesamiento.
 *
 * Diez minutos es holgado a proposito: el coste de esperar de mas es que un
 * trabajo tarde en reintentarse; el de esperar de menos es ejecutarlo dos
 * veces mientras el original sigue vivo. No son comparables.
 */
const SILENCIO_PARA_DARLO_POR_MUERTO_MS = readIntEnv("WORKER_SILENCIO_MS", 10 * 60_000);
const BARRIDO_MS = 60_000;
let running = false;
let slots: SlotPool | undefined;
let inflight = 0;

const workerLog = createLogger("osWorker");

function getSlots(): SlotPool {
  if (!slots) {
    slots = new SlotPool(readIntEnv("MAX_CONCURRENT_JOBS", 3));
  }
  return slots;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processItem(item: OsQueueWorkItem): Promise<void> {
  const client = QueueClient.getInstance();

  const queueItem: OsQueueItem = {
    jobId: item.jobId,
    serviceId: item.serviceId,
    clientId: item.clientId,
    payload: item.payload,
    enqueuedAt: item.enqueuedAt,
    userId: item.userId,
  };

  const sector = sectorFromServiceId(item.serviceId);
  const startedAt = Date.now();
  workerLog.info("job_processing_start", { jobId: item.jobId, sector, userId: item.userId });

  /**
   * Latido mientras el trabajo corre.
   *
   * Es lo que permite al rescate distinguir «tarda» de «murio». Sin el, un
   * trabajo largo y sano acaba reencolado y ejecutado dos veces — el defecto
   * que el Bloque 4 corrigio en `OsQueueWorker` — o, si se sube el umbral para
   * evitarlo, la basura se queda varada horas.
   */
  const latido = setInterval(() => {
    void client.latido(item.jobId).catch(() => undefined);
  }, LATIDO_MS);
  if (typeof latido.unref === "function") latido.unref();

  try {
    const result = await osOrchestrator.processQueuedJob(queueItem);
    if (result.skipped) return;

    if (result.status === "completed") {
      await client.setJobResult(item.jobId, result.result ?? { message: result.message });
    } else {
      await client.setJobFailed(item.jobId, result.message ?? "Job failed");
    }
    workerLog.info("job_processing_complete", { jobId: item.jobId, durationMs: Date.now() - startedAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await client.setJobFailed(item.jobId, msg);
    workerLog.error(
      "job_processing_failed",
      { jobId: item.jobId, error: msg },
      err instanceof Error ? err : undefined,
    );
  } finally {
    clearInterval(latido);
    await client.acknowledgeDequeued(item).catch(() => undefined);
  }
}

async function pollOnce(): Promise<void> {
  if (!running) return;

  await getSlots().acquire();
  const client = QueueClient.getInstance();
  const item = await client.dequeue();
  if (!item) {
    getSlots().release();
    return;
  }

  inflight++;
  void processItem(item)
    .catch((e) =>
      workerLog.error(
        "job_processing_failed",
        { jobId: item.jobId, error: e instanceof Error ? e.message : String(e) },
        e instanceof Error ? e : undefined,
      ),
    )
    .finally(() => {
      inflight--;
      getSlots().release();
    });
}

export function startOsWorker(): void {
  if (running) return;
  slots = new SlotPool(readIntEnv("MAX_CONCURRENT_JOBS", 3));
  running = true;
  const pollMs = readIntEnv("WORKER_POLL_MS", DEFAULT_POLL_MS);
  void pollOnce();
  pollTimer = setInterval(() => {
    void pollOnce();
  }, pollMs);

  /**
   * Barrido de rescate.
   *
   * `os:async:processing` solo se escribia con `lmove` y se vaciaba con `lrem`:
   * nadie miraba nunca esa lista. Un worker que muriera entre las dos
   * operaciones dejaba el trabajo varado ahi para siempre, con su estado
   * congelado en `processing` y el cliente esperando un resultado que no iba a
   * llegar.
   *
   * Un rescate sin llamante seria el mismo defecto con otro nombre — que es lo
   * que le pasaba al `leaseUntil` del orquestador, escrito en cada trabajo y
   * leido por nadie.
   */
  void QueueClient.getInstance()
    .recuperarTrabajosVarados(SILENCIO_PARA_DARLO_POR_MUERTO_MS)
    .catch(() => undefined);
  barridoTimer = setInterval(() => {
    void QueueClient.getInstance()
      .recuperarTrabajosVarados(SILENCIO_PARA_DARLO_POR_MUERTO_MS)
      .catch(() => undefined);
  }, BARRIDO_MS);
  if (typeof barridoTimer.unref === "function") barridoTimer.unref();
}

export async function stopOsWorker(): Promise<void> {
  running = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
  if (barridoTimer) {
    clearInterval(barridoTimer);
    barridoTimer = undefined;
  }
  while (inflight > 0) {
    await sleep(25);
  }
}

export function initOsQueueWorker(): void {
  startOsWorker();
}
