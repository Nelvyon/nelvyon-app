/**
 * BLOQUE 6 · el demonio del orquestador, bajo adversidad.
 *
 * `OrchestratorDaemon` es un bucle que corre solo cada 2 segundos, reclama
 * trabajos y los ejecuta. Ese es exactamente el tipo de pieza que funciona
 * perfectamente mientras nadie la molesta y falla en cuanto hay un reinicio,
 * dos instancias o un tick que tarda mas de la cuenta.
 *
 * Lo que se comprueba aqui no es que el camino feliz funcione —eso ya lo
 * cubren otras suites— sino las cuatro cosas que rompen un sistema autonomo:
 *
 *   1. Un reinicio NO puede saltarse una aprobacion humana.
 *   2. Un trabajo abandonado tiene que poder recuperarlo otro, y solo cuando
 *      de verdad esta abandonado.
 *   3. Dos ticks solapados NO pueden ejecutar el mismo trabajo dos veces.
 *   4. La senal de «vivo» tiene que poder ponerse a falso.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrchestratorJob } from "../contracts";
import { OrchestratorDaemon } from "../daemon";
import { recoverJobsAfterRestart } from "../persistentStore";
import { InMemoryAgentOrchestrator } from "../runtime";

function trabajo(over: Partial<OrchestratorJob> = {}): OrchestratorJob {
  return {
    jobId: over.jobId ?? `j-${Math.random().toString(36).slice(2, 10)}`,
    tenantId: "t-cert",
    agentId: "seo",
    correlationId: "c",
    traceId: "tr",
    state: "queued",
    priority: 1,
    payload: { input: "x" },
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    lastError: null,
    parentJobId: null,
    ...over,
  };
}

beforeEach(() => {
  process.env.NELVYON_ORCHESTRATOR_ENABLED = "1";
  process.env.NELVYON_AI_ENABLED = "0";
});

// ── 1 · un reinicio no ejecuta lo que esperaba a un humano ───────────────────

describe("BLOQUE 6 · reiniciar no se salta una aprobacion humana", () => {
  it("EL CONTROL: un trabajo que estaba corriendo SI vuelve a la cola", () => {
    // Sin esto, una recuperacion que no recuperase nada pasaria la prueba de
    // abajo y dejaria todo trabajo interrumpido muerto para siempre.
    const mapa = new Map<string, OrchestratorJob>();
    const j = trabajo({ jobId: "corriendo", state: "running", startedAt: new Date().toISOString() });
    mapa.set(j.jobId, j);

    expect(recoverJobsAfterRestart(mapa)).toBe(1);
    expect(mapa.get("corriendo")!.state).toBe("queued");
  });

  it("un trabajo esperando APROBACION no se reencola al reiniciar", () => {
    /**
     * El defecto. `waiting_approval` lleva un `approvalId` en su evento: es una
     * puerta humana de verdad, la que decide si una accion sensible se ejecuta.
     *
     * `recoverJobsAfterRestart` la reencolaba junto a `running` y
     * `waiting_tool`, asi que el demonio la cogia en el siguiente tick y la
     * ejecutaba. Un reinicio —un despliegue, un reinicio de contenedor,
     * cualquier cosa— convertia «esperando a que un humano diga que si» en
     * «hazlo». Y sin dejar rastro de que se salto nada.
     */
    const mapa = new Map<string, OrchestratorJob>();
    const j = trabajo({
      jobId: "pide-permiso",
      state: "waiting_approval",
      payload: { input: "borrar todo", approvalId: "ap-1" },
    });
    mapa.set(j.jobId, j);

    recoverJobsAfterRestart(mapa);

    expect(
      mapa.get("pide-permiso")!.state,
      "un reinicio convirtio una espera de aprobacion humana en trabajo ejecutable",
    ).toBe("waiting_approval");
  });

  it("un trabajo esperando una HERRAMIENTA si vuelve a la cola", () => {
    // `waiting_tool` no es una decision humana: es una llamada que se quedo a
    // medias. Reencolarla es correcto, y distinguirla de la aprobacion es
    // justamente el punto.
    const mapa = new Map<string, OrchestratorJob>();
    mapa.set("herramienta", trabajo({ jobId: "herramienta", state: "waiting_tool" }));
    recoverJobsAfterRestart(mapa);
    expect(mapa.get("herramienta")!.state).toBe("queued");
  });
});

// ── 2 · el trabajo abandonado se recupera, y solo si lo esta ─────────────────

describe("BLOQUE 6 · un lease vencido se recupera; uno vivo no se toca", () => {
  it("un trabajo con lease VENCIDO vuelve a estar disponible", () => {
    /**
     * El demonio escribia `leaseUntil` y `heartbeatAt` en cada trabajo y
     * **nadie los leia jamas**. Si el proceso moria a mitad de un trabajo, ese
     * trabajo se quedaba en `running` para siempre: ninguna otra instancia lo
     * recogia, y el unico que lo desbloqueaba era un reinicio completo.
     *
     * Un lease que nadie comprueba no es un lease: es un comentario.
     */
    const orch = new InMemoryAgentOrchestrator();
    const j = trabajo({
      jobId: "abandonado",
      state: "running",
      payload: {
        input: "x",
        leaseOwner: "orch-daemon-muerto",
        leaseUntil: new Date(Date.now() - 60_000).toISOString(),
        heartbeatAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    orch.upsertJob(j);

    const recuperados = orch.recuperarLeasesVencidos();

    expect(recuperados, "nadie recupero un trabajo con el lease vencido").toBe(1);
    expect(orch.drainQueuedJobs(10).map((x) => x.jobId)).toContain("abandonado");
  });

  it("EL CONTROL: un lease VIVO de otra instancia no se toca", () => {
    // Sin esto, una recuperacion que arrasara con todo pasaria la prueba de
    // arriba y mataria el trabajo en vuelo de la otra instancia — que es
    // exactamente el defecto que el Bloque 4 corrigio en `OsQueueWorker`.
    const orch = new InMemoryAgentOrchestrator();
    orch.upsertJob(
      trabajo({
        jobId: "en-vuelo",
        state: "running",
        payload: {
          input: "x",
          leaseOwner: "orch-daemon-vivo",
          leaseUntil: new Date(Date.now() + 60_000).toISOString(),
          heartbeatAt: new Date().toISOString(),
        },
      }),
    );

    expect(orch.recuperarLeasesVencidos()).toBe(0);
    expect(orch.drainQueuedJobs(10).map((x) => x.jobId)).not.toContain("en-vuelo");
  });
});

// ── 3 · dos ticks solapados no ejecutan el mismo trabajo dos veces ───────────

describe("BLOQUE 6 · el mismo trabajo no se ejecuta dos veces", () => {
  it("dos ticks a la vez reparten los trabajos, no los duplican", async () => {
    /**
     * `setInterval` dispara cada 2 s **sin esperar** a que el tick anterior
     * termine. Si un tick tarda mas que eso —cuatro trabajos con un ejecutor
     * detras: nada raro— hay dos ticks vivos a la vez en el MISMO proceso.
     *
     * Y `drainQueuedJobs` no reclamaba: devolvia los trabajos todavia en
     * `queued`, y era el llamante quien luego los ponia en `running`. Entre una
     * cosa y otra, el segundo tick veia los mismos trabajos y los cogia tambien.
     *
     * La invariante que lo caza no depende de como se planifiquen las promesas:
     * **la suma de trabajos procesados no puede superar los que habia**.
     */
    const orch = new InMemoryAgentOrchestrator();
    for (let i = 0; i < 4; i++) orch.upsertJob(trabajo({ jobId: `j${i}` }));

    const demonio = new OrchestratorDaemon(orch, {
      pollIntervalMs: 10_000,
      healthDir: null,
      maxJobsPerTick: 4,
    });
    demonio.start();

    const [a, b] = await Promise.all([demonio.tick(), demonio.tick()]);
    await demonio.stop();

    expect(
      a.processed + b.processed,
      `dos ticks procesaron ${a.processed + b.processed} de 4 trabajos: alguno salio dos veces`,
    ).toBeLessThanOrEqual(4);
  });

  it("ningun trabajo acumula mas intentos de los que se ejecutaron", async () => {
    /**
     * Otra cara del mismo defecto, y la que se ve en los datos: si dos ticks
     * cogen el mismo trabajo, `attempts` sube dos veces por una sola ejecucion
     * y el trabajo llega a `dead_letter` sin haberse intentado tantas veces.
     *
     * Con UN solo trabajo esta prueba no discriminaba: el primer tick lo pasa a
     * `running` y los otros dos ya no lo ven, asi que salia verde tambien con
     * el defecto puesto. Hacen falta varios trabajos para que el segundo tick
     * llegue a drenar mientras el primero sigue en su `await` — que es el hueco
     * exacto por el que se colaba.
     */
    const orch = new InMemoryAgentOrchestrator();
    for (let i = 0; i < 4; i++) orch.upsertJob(trabajo({ jobId: `k${i}` }));

    const demonio = new OrchestratorDaemon(orch, {
      pollIntervalMs: 10_000,
      healthDir: null,
      maxJobsPerTick: 4,
    });
    demonio.start();
    await Promise.all([demonio.tick(), demonio.tick(), demonio.tick()]);
    await demonio.stop();

    const excedidos = orch
      .listJobs("t-cert", 20)
      .filter((x) => x.attempts > 1)
      .map((x) => `${x.jobId}:${x.attempts}`);
    expect(excedidos, "hay trabajos con mas intentos que ejecuciones").toEqual([]);
  });
});

// ── 4 · la senal de vivo tiene que poder ser falsa ───────────────────────────

describe("BLOQUE 6 · `live` representa actividad real", () => {
  it("deja de estar vivo si hace demasiado que no hay tick", async () => {
    /**
     * `live` era `running && lastTickAt !== null`, y `lastTickAt` no se borra
     * nunca. O sea: en cuanto hay UN tick, `live` se queda en verdadero para
     * siempre, aunque el bucle se haya parado o el proceso este atascado.
     *
     * Una senal de vida que no puede ser falsa no es una senal de vida: es una
     * constante. Y esta se publica en `/api/saas/ai-agents`, de modo que quien
     * la mire creera que hay un demonio trabajando cuando puede llevar horas
     * congelado.
     */
    vi.useFakeTimers();
    try {
      const orch = new InMemoryAgentOrchestrator();
      const demonio = new OrchestratorDaemon(orch, {
        pollIntervalMs: 1000,
        healthDir: null,
      });
      demonio.start();
      await demonio.tick();
      expect(demonio.health().live, "no esta vivo justo despues de un tick").toBe(true);

      // Muchísimo mas que el intervalo de sondeo: el bucle esta parado.
      vi.setSystemTime(new Date(Date.now() + 300_000));

      expect(
        demonio.health().live,
        "sigue diciendo que esta vivo cinco minutos despues del ultimo tick",
      ).toBe(false);
      await demonio.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
