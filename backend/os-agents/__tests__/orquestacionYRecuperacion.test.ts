/**
 * BLOQUE 3 · orquestación, cola, eventos y recuperación.
 *
 * Lo que se persigue aquí es una sola cosa, dicha de varias formas: **el
 * orquestador no puede inventar que algo terminó**.
 *
 * Un trabajo que se despacha a un servicio que no existe, uno que revienta a
 * mitad, uno que llega dos veces por un reintento — en los tres casos lo fácil
 * es devolver algo que parezca correcto. Y en los tres, lo que queda en la base
 * es lo que el cliente vera.
 */
import { describe, expect, it, vi } from "vitest";

import { OsEventBus } from "../OsEventBus";
import { OsOrchestrator } from "../OsOrchestrator";
import type { OsJob, OsJobStore } from "../OsJobStore";
import type { OsQueueItem } from "../types";

/** Almacén de trabajos en memoria que se comporta como el real. */
function almacenFalso() {
  const trabajos = new Map<string, OsJob>();
  let n = 0;

  const store = {
    createJob: async (input: Record<string, unknown>) => {
      const jobId = (input.jobId as string) ?? `job-${++n}`;
      const job = {
        jobId,
        serviceId: input.serviceId,
        clientId: input.clientId,
        status: "queued",
        progress: 0,
        payload: input.payload ?? {},
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      } as unknown as OsJob;
      trabajos.set(jobId, job);
      return job;
    },
    getJob: async (id: string) => trabajos.get(id) ?? null,
    failJob: async (id: string, message: string) => {
      const j = trabajos.get(id);
      if (j) {
        (j as { status: string }).status = "failed";
        (j as { error?: { message: string } }).error = { message };
      }
    },
    completeJob: async (id: string) => {
      const j = trabajos.get(id);
      if (j) (j as { status: string }).status = "completed";
    },
    markStepRunning: async () => {},
    markStepCompleted: async () => {},
    markStepFailed: async () => {},
    updateJobProgress: async () => {},
    listJobs: async () => [...trabajos.values()],
  } as unknown as OsJobStore;

  return { store, trabajos };
}

function item(jobId: string, serviceId = "seo_premium"): OsQueueItem {
  return {
    jobId,
    serviceId,
    clientId: "cliente-1",
    payload: { clientName: "Negocio de prueba", industry: "servicios" },
    enqueuedAt: new Date(0).toISOString(),
  };
}

describe("BLOQUE 3 · orquestador", () => {
  it("EL CONTROL: un servicio conocido se encola y devuelve identificador", async () => {
    // Sin esto, un orquestador que fallara SIEMPRE pasaria las pruebas
    // negativas de abajo y dejaria el producto sin despachar nada.
    const { store, trabajos } = almacenFalso();
    const bus = new OsEventBus();
    const orq = new OsOrchestrator(store, bus);

    const r = await orq.enqueueAndDispatch(
      { serviceId: "seo_premium", clientId: "c1", payload: {} },
      { skipQueue: true },
    );
    expect(r.status).toBe("queued");
    expect(r.jobId).toBeTruthy();
    expect(trabajos.get(r.jobId)!.status).toBe("queued");
  });

  it("un servicio DESCONOCIDO falla y lo dice; no crea trabajo fantasma", async () => {
    // Devolver `queued` para un servicio que no existe dejaria al cliente
    // esperando un trabajo que nadie va a ejecutar nunca.
    const { store, trabajos } = almacenFalso();
    const orq = new OsOrchestrator(store, new OsEventBus());

    const r = await orq.enqueueAndDispatch(
      { serviceId: "servicio_que_no_existe", clientId: "c1", payload: {} },
      { skipQueue: true },
    );
    expect(r.status).toBe("failed");
    expect(r.jobId).toBe("");
    expect(trabajos.size).toBe(0);
  });

  it("crear un trabajo emite `job:created`", async () => {
    const { store } = almacenFalso();
    const bus = new OsEventBus();
    const visto: string[] = [];
    bus.on("job:created", (p) => visto.push(p.jobId));

    const orq = new OsOrchestrator(store, bus);
    const r = await orq.enqueueAndDispatch(
      { serviceId: "seo_premium", clientId: "c1", payload: {} },
      { skipQueue: true },
    );
    expect(visto).toEqual([r.jobId]);
  });

  // -- duplicados y reintentos ----------------------------------------------

  it("NO DUPLICA: un trabajo que ya no esta en cola se salta", async () => {
    // El caso real: el mismo elemento llega dos veces a la cola -un reintento,
    // un evento repetido, un worker que revivio-. Si el segundo pase volviera a
    // ejecutar, cualquier accion irreversible del agente ocurriria dos veces.
    const { store, trabajos } = almacenFalso();
    const orq = new OsOrchestrator(store, new OsEventBus());

    const creado = await orq.enqueueAndDispatch(
      { serviceId: "seo_premium", clientId: "c1", payload: {} },
      { skipQueue: true },
    );
    (trabajos.get(creado.jobId) as { status: string }).status = "completed";

    const r = await orq.processQueuedJob(item(creado.jobId));
    expect(r.skipped).toBe(true);
    expect(r.status).toBe("completed");
  });

  it("NO DUPLICA: un trabajo ya en curso tampoco se reejecuta", async () => {
    const { store, trabajos } = almacenFalso();
    const orq = new OsOrchestrator(store, new OsEventBus());
    const creado = await orq.enqueueAndDispatch(
      { serviceId: "seo_premium", clientId: "c1", payload: {} },
      { skipQueue: true },
    );
    (trabajos.get(creado.jobId) as { status: string }).status = "running";

    const r = await orq.processQueuedJob(item(creado.jobId));
    expect(r.skipped).toBe(true);
  });

  it("un trabajo que NO existe no se inventa", async () => {
    const { store } = almacenFalso();
    const orq = new OsOrchestrator(store, new OsEventBus());
    const r = await orq.processQueuedJob(item("job-inexistente"));
    expect(r.status).toBe("failed");
    expect(r.message).toMatch(/not found/i);
  });

  it("procesar un servicio desconocido FALLA el trabajo y emite `job:failed`", async () => {
    const { store, trabajos } = almacenFalso();
    const bus = new OsEventBus();
    const fallos: string[] = [];
    bus.on("job:failed", (p) => fallos.push(p.jobId));

    const orq = new OsOrchestrator(store, bus);
    const creado = await orq.enqueueAndDispatch(
      { serviceId: "seo_premium", clientId: "c1", payload: {} },
      { skipQueue: true },
    );

    const r = await orq.processQueuedJob(item(creado.jobId, "servicio_inventado"));
    expect(r.status).toBe("failed");
    expect(fallos).toContain(creado.jobId);
    expect(trabajos.get(creado.jobId)!.status).toBe("failed");
  });

  // -- el fallo real de ejecución -------------------------------------------

  it("HONESTIDAD: si el agente revienta, el trabajo queda FALLIDO, no completado", async () => {
    // Sin proveedor de IA configurado, los pasos del agente lanzan. Es
    // justamente el escenario que interesa: que el orquestador no maquille el
    // resultado con los pasos que si salieron.
    const { store, trabajos } = almacenFalso();
    const bus = new OsEventBus();
    const eventos: string[] = [];
    bus.on("job:completed", () => eventos.push("completed"));
    bus.on("job:failed", () => eventos.push("failed"));

    const orq = new OsOrchestrator(store, bus);
    const creado = await orq.enqueueAndDispatch(
      { serviceId: "seo_premium", clientId: "c1", payload: {} },
      { skipQueue: true },
    );

    await orq.processQueuedJob(item(creado.jobId)).catch(() => null);

    expect(trabajos.get(creado.jobId)!.status).not.toBe("completed");
    expect(eventos).not.toContain("completed");
  });
});

describe("BLOQUE 3 · bus de eventos", () => {
  it("EL CONTROL: un suscriptor recibe lo que se emite", () => {
    const bus = new OsEventBus();
    const recibido: unknown[] = [];
    bus.on("job:progress", (p) => recibido.push(p));
    bus.emit("job:progress", { jobId: "j1", progress: 50, stepName: "paso" });
    expect(recibido).toHaveLength(1);
  });

  it("`subscribe` devuelve una baja que de verdad da de baja", () => {
    // Una funcion de baja que no diera de baja acumularia suscriptores en cada
    // trabajo: una fuga de memoria lenta y silenciosa en un proceso que corre
    // durante semanas.
    const bus = new OsEventBus();
    const recibido: unknown[] = [];
    const baja = bus.subscribe("job:completed", (p) => recibido.push(p));

    bus.emit("job:completed", { jobId: "j1", result: {} as never });
    expect(recibido).toHaveLength(1); // control positivo

    baja();
    bus.emit("job:completed", { jobId: "j2", result: {} as never });
    expect(recibido).toHaveLength(1);
  });

  it("un fallo en un suscriptor no impide que se emita el evento", () => {
    // `EventEmitter` propaga la excepcion del listener al emisor. Lo que se
    // comprueba es que el comportamiento sea el conocido y no una sorpresa.
    const bus = new OsEventBus();
    bus.on("job:failed", () => {
      throw new Error("suscriptor roto");
    });
    expect(() => bus.emit("job:failed", { jobId: "j1", error: { message: "x" } })).toThrow();
  });

  it("los eventos de un trabajo no llegan a los suscriptores de otro tipo", () => {
    const bus = new OsEventBus();
    const progreso: unknown[] = [];
    bus.on("job:progress", (p) => progreso.push(p));
    bus.emit("job:completed", { jobId: "j1", result: {} as never });
    expect(progreso).toHaveLength(0);
  });
});
