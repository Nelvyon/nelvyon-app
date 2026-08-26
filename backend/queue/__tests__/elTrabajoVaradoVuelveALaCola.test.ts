/**
 * BLOQUE 6 · un trabajo no se queda varado para siempre.
 *
 * La cola usa el patron fiable de Redis: `lmove` saca el trabajo de la lista de
 * pendientes y lo deja en `os:async:processing` en la misma operacion atomica,
 * y `lrem` lo quita de ahi cuando el worker termina. Eso esta bien resuelto: si
 * el proceso muere despues del `lmove`, el trabajo **no se pierde**.
 *
 * El problema es lo que pasa despues: `os:async:processing` solo se escribe con
 * `lmove` y se vacia con `lrem`. **Nadie mira nunca esa lista.** Si el worker
 * muere entre las dos operaciones —un despliegue, un OOM, un contenedor que se
 * recicla— el trabajo se queda ahi para siempre, su estado se queda en
 * `processing`, y el cliente que lo pidio no recibe nada nunca. Sin error, sin
 * alerta, sin rastro.
 *
 * Media pieza del patron fiable no es un patron fiable: es una lista que crece.
 *
 * Y la recuperacion tiene su propia trampa, la misma que el Bloque 4 corrigio en
 * `OsQueueWorker`: si se rescata «lo que lleva mucho en processing», se acaba
 * matando el trabajo largo de otra instancia que va perfectamente. Por eso lo
 * que se mide es el SILENCIO, no la duracion — y para eso hace falta un latido.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const listas = new Map<string, string[]>();
const claves = new Map<string, unknown>();

const redisMock = {
  lpush: vi.fn(async (k: string, v: string) => {
    const l = listas.get(k) ?? [];
    l.unshift(v);
    listas.set(k, l);
    return l.length;
  }),
  rpush: vi.fn(async (k: string, v: string) => {
    const l = listas.get(k) ?? [];
    l.push(v);
    listas.set(k, l);
    return l.length;
  }),
  lmove: vi.fn(async (origen: string, destino: string) => {
    const o = listas.get(origen) ?? [];
    const v = o.pop();
    if (v === undefined) return null;
    listas.set(origen, o);
    const d = listas.get(destino) ?? [];
    d.unshift(v);
    listas.set(destino, d);
    return v;
  }),
  lrange: vi.fn(async (k: string) => [...(listas.get(k) ?? [])]),
  lrem: vi.fn(async (k: string, _n: number, v: string) => {
    const l = listas.get(k) ?? [];
    const i = l.indexOf(v);
    if (i >= 0) l.splice(i, 1);
    listas.set(k, l);
    return i >= 0 ? 1 : 0;
  }),
  set: vi.fn(async (k: string, v: unknown) => {
    claves.set(k, v);
    return "OK";
  }),
  get: vi.fn(async (k: string) => claves.get(k) ?? null),
  expire: vi.fn(async () => 1),
};

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function MockRedis() {
    return redisMock;
  }),
}));

vi.mock("../../os-agents/OsOrchestrator", () => ({
  osOrchestrator: {
    enqueueAndDispatch: vi.fn(async () => ({ jobId: "x", status: "queued" })),
    processQueuedJob: vi.fn(async () => ({ status: "completed", result: {} })),
  },
  sectorFromServiceId: (s: string) => s.split("_")[0] ?? "web",
}));

import { QueueClient } from "../queueClient";

const PROCESANDO = "os:async:processing";
const PENDIENTES = "os:async:queue";

function itemCrudo(jobId: string): string {
  return JSON.stringify({
    jobId,
    serviceId: "seo_audit",
    clientId: "c1",
    payload: {},
    enqueuedAt: new Date().toISOString(),
    userId: "u1",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  listas.clear();
  claves.clear();
  QueueClient.resetForTests();
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
});

describe("BLOQUE 6 · lo que queda en la lista de procesamiento se rescata", () => {
  it("un trabajo cuyo worker murio vuelve a la cola", async () => {
    const c = QueueClient.getInstance();
    listas.set(PENDIENTES, [itemCrudo("job-huerfano")]);

    // El worker lo coge...
    const item = await c.dequeue();
    expect(item?.jobId).toBe("job-huerfano");
    expect(listas.get(PROCESANDO)).toHaveLength(1);

    // ...y muere aqui. Nunca llama a `acknowledgeDequeued`.
    // Pasa mucho rato sin una sola senal de vida.
    claves.set("os:async:job:job-huerfano", {
      jobId: "job-huerfano",
      status: "processing",
      userId: "u1",
      createdAt: new Date(Date.now() - 600_000).toISOString(),
      updatedAt: new Date(Date.now() - 600_000).toISOString(),
    });

    const rescatados = await c.recuperarTrabajosVarados(120_000);

    expect(rescatados, "nadie rescato el trabajo del worker muerto").toBe(1);
    expect(listas.get(PENDIENTES) ?? [], "no volvio a la cola de pendientes").toHaveLength(1);
    expect(listas.get(PROCESANDO) ?? [], "sigue ocupando la lista de procesamiento").toHaveLength(0);
  });

  it("EL CONTROL: un trabajo que SIGUE latiendo no se toca", async () => {
    /**
     * La trampa de la recuperacion. Si se rescata «lo que lleva mucho en
     * processing», un trabajo largo de otra instancia —que va perfectamente—
     * se reencola y se ejecuta DOS VECES.
     *
     * Es literalmente el defecto que el Bloque 4 corrigio en `OsQueueWorker`,
     * donde arrancar una instancia mataba el trabajo en vuelo de la otra. Lo
     * que se mide es el silencio, no la duracion.
     */
    const c = QueueClient.getInstance();
    listas.set(PENDIENTES, [itemCrudo("job-largo")]);
    await c.dequeue();

    // Empezo hace diez minutos, pero latio hace dos segundos.
    claves.set("os:async:job:job-largo", {
      jobId: "job-largo",
      status: "processing",
      userId: "u1",
      createdAt: new Date(Date.now() - 600_000).toISOString(),
      updatedAt: new Date(Date.now() - 2_000).toISOString(),
    });

    expect(
      await c.recuperarTrabajosVarados(120_000),
      "mato el trabajo en vuelo de otra instancia",
    ).toBe(0);
    expect(listas.get(PROCESANDO) ?? []).toHaveLength(1);
  });

  it("el latido mantiene vivo un trabajo largo", async () => {
    // Sin latido no hay forma de distinguir «tarda» de «murio», y cualquier
    // umbral acaba matando trabajo bueno o dejando basura para siempre.
    const c = QueueClient.getInstance();
    listas.set(PENDIENTES, [itemCrudo("job-latiendo")]);
    await c.dequeue();

    claves.set("os:async:job:job-latiendo", {
      jobId: "job-latiendo",
      status: "processing",
      userId: "u1",
      createdAt: new Date(Date.now() - 600_000).toISOString(),
      updatedAt: new Date(Date.now() - 600_000).toISOString(),
    });

    await c.latido("job-latiendo");

    expect(
      await c.recuperarTrabajosVarados(120_000),
      "el latido no impidio que lo dieran por muerto",
    ).toBe(0);
  });

  it("un trabajo ya terminado se limpia de la lista sin reencolarse", async () => {
    // Si el worker murio DESPUES de escribir el resultado pero ANTES del `lrem`,
    // el trabajo esta hecho. Reencolarlo lo ejecutaria por segunda vez: un
    // side effect duplicado por culpa de la propia recuperacion.
    const c = QueueClient.getInstance();
    listas.set(PENDIENTES, [itemCrudo("job-hecho")]);
    await c.dequeue();

    claves.set("os:async:job:job-hecho", {
      jobId: "job-hecho",
      status: "completed",
      userId: "u1",
      createdAt: new Date(Date.now() - 600_000).toISOString(),
      updatedAt: new Date(Date.now() - 600_000).toISOString(),
    });

    await c.recuperarTrabajosVarados(120_000);

    expect(listas.get(PENDIENTES) ?? [], "reencolo un trabajo YA COMPLETADO").toHaveLength(0);
    expect(listas.get(PROCESANDO) ?? [], "dejo basura en la lista de procesamiento").toHaveLength(0);
  });
});

describe("BLOQUE 6 · el rescate tiene quien lo llame", () => {
  it("arrancar el worker barre la lista de procesamiento", async () => {
    /**
     * La prueba que impide repetir el defecto original con otro nombre.
     *
     * Todo lo de arriba comprueba que `recuperarTrabajosVarados` FUNCIONA. Nada
     * comprobaba que alguien la LLAME. Y ese era exactamente el defecto del
     * orquestador: `leaseUntil` se escribia en cada trabajo y no lo leia nadie.
     *
     * Maquinaria correcta sin llamante es maquinaria que no existe.
     */
    const { startOsWorker, stopOsWorker } = await import("../osWorker");
    const c = QueueClient.getInstance();
    const espia = vi.spyOn(c, "recuperarTrabajosVarados");

    startOsWorker();
    await new Promise((r) => setTimeout(r, 20));
    await stopOsWorker();

    expect(
      espia,
      "arrancar el worker no barre la lista de procesamiento: el rescate no tiene llamante",
    ).toHaveBeenCalled();
    espia.mockRestore();
  });
});
