/**
 * BLOQUE 4 · colas: una reclamación por trabajo, y recuperación honesta.
 *
 * Dos propiedades, y la segunda es la que casi nunca se prueba:
 *
 *   - **Nadie procesa el mismo trabajo dos veces.** Ni dos workers a la vez, ni
 *     el mismo worker tras un reintento.
 *   - **Un trabajo cuyo worker murió acaba FALLIDO, no completado ni colgado.**
 *     Un trabajo eternamente «en curso» es peor que uno fallido: nadie lo
 *     reintenta y nadie sabe que hay que mirarlo.
 *
 * El defecto que fija la segunda parte: la recuperación fallaba **todos** los
 * trabajos en curso al arrancar. Con una instancia eso es correcto —si está
 * arrancando, nadie estaba trabajando—. Con dos, desplegar la instancia B mataba
 * el trabajo en vuelo de la instancia A, y el cliente veía «interrumpido por
 * reinicio» en un trabajo que iba perfectamente.
 */
import { describe, expect, it, vi } from "vitest";

import { OsEventBus } from "../../os-agents/OsEventBus";
import { OsQueueWorker } from "../../os-agents/OsQueueWorker";
import type { OsJob } from "../../os-agents/OsJobStore";

/** Almacén en memoria que recuerda qué se le pidió hacer. */
function almacen(trabajos: OsJob[]) {
  const fallados: Array<{ jobId: string; motivo: string }> = [];
  const store = {
    listJobs: async () => trabajos,
    failJob: async (jobId: string, motivo: string) => {
      fallados.push({ jobId, motivo });
      const j = trabajos.find((x) => x.jobId === jobId);
      if (j) (j as { status: string }).status = "failed";
    },
    getJob: async (id: string) => trabajos.find((x) => x.jobId === id) ?? null,
    createJob: async () => trabajos[0]!,
    completeJob: async () => {},
    markStepRunning: async () => {},
    markStepCompleted: async () => {},
    markStepFailed: async () => {},
    updateJobProgress: async () => {},
  };
  return { store, fallados };
}

function cola() {
  const encolados: string[] = [];
  return {
    encolados,
    q: {
      enqueue: async (item: { jobId: string }) => {
        encolados.push(item.jobId);
      },
      dequeue: async () => null,
      size: async () => 0,
    },
  };
}

function trabajo(jobId: string, status: string, haceMs: number): OsJob {
  const cuando = new Date(Date.now() - haceMs).toISOString();
  return {
    jobId,
    serviceId: "seo_premium",
    clientId: "c1",
    status,
    progress: 0,
    steps: [],
    payload: {},
    createdAt: cuando,
    updatedAt: cuando,
  } as unknown as OsJob;
}

/**
 * Lanza la recuperación sin arrancar el bucle del worker.
 *
 * `OsQueueWorker` es un SINGLETON con constructor privado: hay que crearlo con
 * `getInstance(deps)` y desmontarlo entre pruebas, o la segunda recibe el
 * almacén de la primera y mide otra cosa.
 */
async function recuperar(trabajos: OsJob[]) {
  await OsQueueWorker.teardownForTests();
  const { store, fallados } = almacen(trabajos);
  const { q, encolados } = cola();
  const w = OsQueueWorker.getInstance({
    jobStore: store as never,
    queue: q as never,
    eventBus: new OsEventBus(),
    orchestrator: { processQueuedJob: async () => ({}) } as never,
  } as never);

  await (w as unknown as { recoverStaleJobs: () => Promise<void> }).recoverStaleJobs();
  await OsQueueWorker.teardownForTests();
  return { fallados, encolados };
}

describe("BLOQUE 4 · recuperación de trabajos", () => {
  it("EL CONTROL: un trabajo en cola se vuelve a encolar", async () => {
    // Sin esto, una recuperación que no hiciera nada pasaría las pruebas de
    // abajo y dejaría los trabajos encolados sin ejecutar para siempre.
    const { encolados } = await recuperar([trabajo("j1", "queued", 0)]);
    expect(encolados).toEqual(["j1"]);
  });

  it("un trabajo en curso y CALLADO se da por interrumpido", async () => {
    // Un worker que murió a mitad. Marcarlo fallido es lo honesto: alguien
    // puede reintentarlo. Dejarlo «en curso» lo condena al limbo.
    const { fallados } = await recuperar([trabajo("j1", "running", 30 * 60_000)]);
    expect(fallados.map((f) => f.jobId)).toEqual(["j1"]);
    expect(fallados[0]!.motivo).toMatch(/interrupted|reinicio/i);
  });

  it("un trabajo en curso y RECIENTE NO se toca", async () => {
    // El defecto. Con dos instancias, arrancar la segunda mataba el trabajo en
    // vuelo de la primera. `updated_at` avanza en cada paso del agente, así que
    // un trabajo vivo nunca lleva minutos sin moverse.
    const { fallados } = await recuperar([trabajo("j1", "running", 2_000)]);
    expect(fallados, "mato el trabajo en vuelo de otra instancia").toEqual([]);
  });

  it("un trabajo YA completado no se resucita ni se falla", async () => {
    // Un estado terminal es terminal. Volver a tocarlo reabriría algo cerrado.
    const { fallados, encolados } = await recuperar([trabajo("j1", "completed", 60 * 60_000)]);
    expect(fallados).toEqual([]);
    expect(encolados).toEqual([]);
  });

  it("un trabajo ya fallido no se vuelve a fallar", async () => {
    const { fallados } = await recuperar([trabajo("j1", "failed", 60 * 60_000)]);
    expect(fallados).toEqual([]);
  });

  it("con varios trabajos, cada uno recibe lo suyo", async () => {
    // La mezcla real al arrancar: algo en cola, algo muerto, algo vivo de otra
    // instancia y algo ya terminado.
    const { fallados, encolados } = await recuperar([
      trabajo("en-cola", "queued", 0),
      trabajo("muerto", "running", 30 * 60_000),
      trabajo("vivo-de-otra", "running", 1_000),
      trabajo("terminado", "completed", 0),
    ]);
    expect(encolados).toEqual(["en-cola"]);
    expect(fallados.map((f) => f.jobId)).toEqual(["muerto"]);
  });

  it("una marca de tiempo ilegible se trata como muerto, no como vivo", async () => {
    // Fallo cerrado en la dirección correcta: si no se puede saber cuándo dio
    // señales por última vez, dejarlo «en curso» para siempre es peor que
    // marcarlo fallido, porque nadie lo mira nunca.
    const roto = trabajo("j1", "running", 0);
    (roto as { updatedAt: string }).updatedAt = "no-es-una-fecha";
    (roto as { createdAt: string }).createdAt = "tampoco";
    const { fallados } = await recuperar([roto]);
    expect(fallados.map((f) => f.jobId)).toEqual(["j1"]);
  });

  it("el umbral de silencio se puede ajustar por entorno", async () => {
    // Un despliegue con pasos muy largos puede necesitar más margen. Que sea
    // configurable evita que alguien «arregle» el problema quitando la guarda.
    const previo = process.env.OS_WORKER_SILENCIO_MS;
    process.env.OS_WORKER_SILENCIO_MS = "1000";
    vi.resetModules();
    const { OsQueueWorker: Fresco } = await import("../../os-agents/OsQueueWorker");

    const trabajos = [trabajo("j1", "running", 5_000)];
    await Fresco.teardownForTests();
    const { store, fallados } = almacen(trabajos);
    const { q } = cola();
    const w = Fresco.getInstance({
      jobStore: store as never,
      queue: q as never,
      eventBus: new OsEventBus(),
      orchestrator: { processQueuedJob: async () => ({}) } as never,
    } as never);
    await (w as unknown as { recoverStaleJobs: () => Promise<void> }).recoverStaleJobs();
    await Fresco.teardownForTests();

    expect(fallados.map((f) => f.jobId)).toEqual(["j1"]);

    if (previo === undefined) delete process.env.OS_WORKER_SILENCIO_MS;
    else process.env.OS_WORKER_SILENCIO_MS = previo;
  });
});
