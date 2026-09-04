/**
 * Todo trabajo terminado deja rastro del que aprender. Y sólo el terminado.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `LearningService.recordOutcome` es la entrada del bucle de aprendizaje: sin
 * outcomes no hay patrones que analizar, y `analyzePatternsForAgent` mira sobre
 * nada.
 *
 * Estaba cableado AGENTE POR AGENTE. Medido: de los 244 agentes de sectores que
 * producen con modelo, 67 no lo llamaban — seis sectores enteros (`b2b`,
 * `hospitality`, `influencers`, `realestate`, `sports`, `youtubers`) trabajaban
 * sin dejar nada de lo que aprender.
 *
 * Y el agente 68 lo habría olvidado igual. Pedirle a cada autor que se acuerde
 * de una línea es exactamente cómo se pierde una capacidad entera en silencio:
 * nada falla, ninguna prueba se pone roja, y el sistema simplemente deja de
 * mejorar.
 *
 * ── LA PARTE DELICADA ───────────────────────────────────────────────────────
 *
 * El registro va DESPUÉS de la puerta de aprobación. Un resultado que necesita
 * que lo mire una persona todavía no es un outcome del que aprender: aprender
 * de trabajo sin validar es cómo se enseña a repetir un error, y encima con la
 * confianza que da un patrón con muchas muestras.
 *
 * Eso es lo que más se comprueba aquí.
 *
 * COSTE EXTERNO: 0 EUR. No llama a ningún modelo ni toca la base.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordOutcome = vi.fn();
const processQueuedJob = vi.fn();

vi.mock("../../os-agents/learning/LearningService", () => ({
  LearningService: class {
    recordOutcome = recordOutcome;
  },
}));

vi.mock("../../os-agents/OsOrchestrator", () => ({
  osOrchestrator: {
    processQueuedJob: (...args: unknown[]) => processQueuedJob(...args),
  },
}));

/** Lo que el trabajador entrega junto al trabajo: latido y senal de aborto. */
const utilidades = {
  latir: async () => true,
  señal: new AbortController().signal,
};

const trabajo = {
  jobId: "job-1",
  serviceId: "seo_premium",
  clientId: "cli-1",
  tenantId: "ten-1",
  payload: { userId: "usr-1", sector: "health" } as Record<string, unknown>,
  intake: null,
  attempts: 1,
  maxAttempts: 3,
};

describe("el bucle de aprendizaje se cierra en el manejador, no en cada agente", () => {
  beforeEach(() => {
    recordOutcome.mockReset().mockResolvedValue(undefined);
    processQueuedJob.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("LA REGLA: un trabajo completado registra su outcome", async () => {
    processQueuedJob.mockResolvedValue({ status: "completed", result: { texto: "hecho" } });
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    const r = await manejadorDeServicioOs(trabajo as never, utilidades);

    expect(r.tipo).toBe("completado");
    expect(recordOutcome, "un trabajo terminado no dejó rastro del que aprender")
      .toHaveBeenCalledTimes(1);
  });

  it("y lo registra con el sujeto, el servicio y el sector correctos", async () => {
    processQueuedJob.mockResolvedValue({ status: "completed", result: { texto: "hecho" } });
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    await manejadorDeServicioOs(trabajo as never, utilidades);

    const [userId, agentId, sector, entrada, salida] = recordOutcome.mock.calls[0];
    expect(userId).toBe("usr-1");
    expect(agentId).toBe("seo_premium");
    expect(sector, "el sector se perdió: los aprendizajes se agruparían mal").toBe("health");
    expect(entrada).toBe(trabajo.payload);
    // Lo que produjo el agente llega intacto…
    expect(salida).toMatchObject({ texto: "hecho" });
    // …y con la constancia de con qué se aprobó. Saber si una pieza paso limpia
    // o con avisos es justo lo que interesa aprender de ella.
    expect((salida as { calidad?: unknown }).calidad, "se aprendió sin saber cómo pasó calidad")
      .toBeDefined();
  });

  it("sin `userId` en el payload cae al cliente, no a una cadena vacía", async () => {
    // Un outcome sin sujeto no se puede atribuir a nadie y ensucia el aprendizaje
    // de todos los demás.
    // El resultado tiene que ser entregable: uno vacío lo retiene ahora la
    // puerta de calidad, que es justo lo que debe hacer con un entregable vacío.
    processQueuedJob.mockResolvedValue({ status: "completed", result: { texto: "hecho" } });
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    await manejadorDeServicioOs({ ...trabajo, payload: { sector: "health" } } as never, utilidades);

    expect(recordOutcome.mock.calls[0][0]).toBe("cli-1");
  });

  it("LA PARTE DELICADA: lo que espera aprobación NO se aprende", async () => {
    // Aprender de trabajo que nadie ha validado es cómo se enseña a repetir un
    // error, y encima con la confianza que da un patrón con muchas muestras.
    processQueuedJob.mockResolvedValue({
      status: "completed",
      result: { provenance: { outcome: "mock", provider: "none", model: "none" } },
    });
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    const r = await manejadorDeServicioOs(trabajo as never, utilidades);

    expect(r.tipo, "un resultado degradado se cerró como completado").toBe("esperandoAprobacion");
    expect(recordOutcome, "se aprendió de un resultado que nadie ha aprobado")
      .not.toHaveBeenCalled();
  });

  it("lo que el orquestador OMITE tampoco se aprende", async () => {
    processQueuedJob.mockResolvedValue({ status: "skipped", skipped: true, message: "no tocaba" });
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    const r = await manejadorDeServicioOs(trabajo as never, utilidades);

    expect(r.tipo).toBe("esperandoAprobacion");
    expect(recordOutcome).not.toHaveBeenCalled();
  });

  it("lo que FALLA tampoco: no hay outcome de un trabajo que no se hizo", async () => {
    processQueuedJob.mockResolvedValue({ status: "failed", message: "reventó" });
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    await expect(manejadorDeServicioOs(trabajo as never, utilidades)).rejects.toThrow();
    expect(recordOutcome).not.toHaveBeenCalled();
  });

  it("si el registro falla, el trabajo del cliente NO se pierde", async () => {
    // El aprendizaje es secundario respecto a la entrega. Perder un trabajo ya
    // hecho por no poder anotarlo sería absurdo.
    processQueuedJob.mockResolvedValue({ status: "completed", result: { texto: "hecho" } });
    recordOutcome.mockRejectedValue(new Error("la base no está"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    const r = await manejadorDeServicioOs(trabajo as never, utilidades);

    expect(r.tipo, "un fallo de aprendizaje tumbó una entrega buena").toBe("completado");
    // Pero DEJA CONSTANCIA: un bucle que deja de recibir datos y no lo dice es
    // indistinguible de uno que funciona y no encuentra patrones.
    expect(aviso, "el fallo de registro se tragó en silencio").toHaveBeenCalled();
  });

  it("y el aviso no filtra la cadena de conexión", async () => {
    processQueuedJob.mockResolvedValue({ status: "completed", result: { texto: "hecho" } });
    recordOutcome.mockRejectedValue(
      new Error("connect ECONNREFUSED postgresql://usuario:SECRETO@host:5432/db"),
    );
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");

    await manejadorDeServicioOs(trabajo as never, utilidades);

    const texto = aviso.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(texto, "el aviso de aprendizaje filtró una credencial").not.toContain("SECRETO");
  });
});
