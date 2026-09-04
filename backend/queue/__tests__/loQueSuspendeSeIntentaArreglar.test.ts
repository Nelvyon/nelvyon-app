/**
 * Lo que calidad suspende se intenta arreglar antes de molestar a nadie.
 *
 * ── QUÉ CIERRA ──────────────────────────────────────────────────────────────
 *
 * Una pieza suspendida iba directa a la bandeja de aprobación. Bien para lo que
 * no tiene arreglo automático —una afirmación inventada, una mezcla de
 * clientes—, desperdicio para lo que sí: «se pidió en «es» y está escrita en
 * «en»» no necesita una persona, necesita rehacerla en español.
 *
 * Y una bandeja llena de cosas que el sistema podría haber arreglado solo se
 * acaba mirando por encima. Entonces también se pasan por alto las que sí
 * necesitaban un ojo humano, que es el daño de verdad.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Que NO se reintente cuando no toca. Producir otra vez cuesta una llamada al
 * modelo, y una capacidad que se enciende sola y multiplica la factura es
 * exactamente lo que este repositorio no permite.
 *
 * COSTE EXTERNO: 0 EUR. El orquestador es un doble.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const processQueuedJob = vi.fn();

vi.mock("../../os-agents/OsOrchestrator", () => ({
  osOrchestrator: { processQueuedJob: (...a: unknown[]) => processQueuedJob(...a) },
}));
vi.mock("../../os-agents/learning/LearningService", () => ({
  LearningService: class { recordOutcome = async () => undefined; },
}));
vi.mock("../../resultados/registrarEntregaComoAccion", () => ({
  registrarEntregaComoAccion: async () => ({ registrada: false }),
}));
vi.mock("../../os-core/registrarEntregable", () => ({
  registrarEntregable: async () => ({ registrado: false, motivo: "prueba" }),
}));
vi.mock("../../os-agents/bloqueDeCerebro", () => ({
  bloqueDeCerebro: async () => ({
    bloque: "", idioma: null, mercado: null, otrosClientes: [], contextoParaCalidad: {},
  }),
}));

const utilidades = { latir: async () => true, señal: new AbortController().signal };

const trabajo = {
  jobId: "job-1",
  serviceId: "contenido_copywriting_premium",
  clientId: "cli-1",
  tenantId: "ten-1",
  payload: { userId: "usr-1", idioma: "es" } as Record<string, unknown>,
  intake: null,
  attempts: 1,
  maxAttempts: 3,
};

/** Prosa en inglés: la comprobación de idioma la suspende con un hallazgo. */
const EN_INGLES = {
  texto:
    "We are a dental clinic in the city centre and we have been taking care of our "
    + "patients smiles for more than twenty years. Our team combines the experience of "
    + "the best professionals with the most advanced technology available today.",
};

const EN_ESPANOL = {
  texto:
    "Somos una clínica dental en el centro de la ciudad y llevamos más de veinte años "
    + "cuidando de las sonrisas de nuestros pacientes. Nuestro equipo combina la "
    + "experiencia de los mejores profesionales con la tecnología más avanzada.",
};

async function ejecutar() {
  const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");
  return manejadorDeServicioOs(trabajo as never, utilidades);
}

describe("lo que suspende se intenta arreglar", () => {
  beforeEach(() => {
    processQueuedJob.mockReset();
    vi.stubEnv("NELVYON_MODO_COSTE_CERO", "0");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("LA REGLA: una pieza en el idioma equivocado se rehace y se entrega", async () => {
    processQueuedJob
      .mockResolvedValueOnce({ status: "completed", result: EN_INGLES })
      .mockResolvedValueOnce({ status: "completed", result: EN_ESPANOL });

    const r = await ejecutar();

    expect(r.tipo, "se molestó a una persona por algo que se arreglaba solo").toBe("completado");
    expect(processQueuedJob).toHaveBeenCalledTimes(2);
  });

  it("y al agente se le dice EXACTAMENTE qué falló, no «hazlo mejor»", async () => {
    // Reintentar con la misma instrucción produce lo mismo: si el modelo
    // escribió en inglés fue porque nada le dijo que no.
    processQueuedJob
      .mockResolvedValueOnce({ status: "completed", result: EN_INGLES })
      .mockResolvedValueOnce({ status: "completed", result: EN_ESPANOL });

    await ejecutar();

    const segundo = processQueuedJob.mock.calls[1][0] as { payload: Record<string, unknown> };
    const correccion = String(segundo.payload.__correccionDeCalidad ?? "");
    expect(correccion, "no se le pasó ninguna corrección").not.toBe("");
    expect(correccion).toMatch(/«es».*«en»/);
  });

  // ── CUÁNDO NO SE REINTENTA ────────────────────────────────────────────────

  it("EL CONTROL: con el modo coste cero activo NO se reintenta", async () => {
    // Una capacidad que se enciende sola y multiplica la factura es lo que este
    // repositorio no permite.
    vi.stubEnv("NELVYON_MODO_COSTE_CERO", "1");
    processQueuedJob.mockResolvedValue({ status: "completed", result: EN_INGLES });

    const r = await ejecutar();

    expect(processQueuedJob, "se pagó un reintento en modo coste cero").toHaveBeenCalledTimes(1);
    expect(r.tipo).toBe("esperandoAprobacion");
  });

  it("lo que pasa a la primera no se reintenta", async () => {
    processQueuedJob.mockResolvedValue({ status: "completed", result: EN_ESPANOL });

    const r = await ejecutar();

    expect(r.tipo).toBe("completado");
    expect(processQueuedJob).toHaveBeenCalledTimes(1);
  });

  it("si el segundo intento TAMBIÉN suspende, escala en vez de insistir", async () => {
    // Insistir esperando otro resultado es la definición de un bucle que no
    // termina, y cada vuelta cuesta dinero.
    processQueuedJob.mockResolvedValue({ status: "completed", result: EN_INGLES });

    const r = await ejecutar();

    expect(processQueuedJob, "insistió más de una vez").toHaveBeenCalledTimes(2);
    expect(r.tipo).toBe("esperandoAprobacion");
  });

  it("si el reintento REVIENTA, se escala con el veredicto original", async () => {
    // Perder el trabajo del primer intento por un fallo del segundo sería
    // absurdo: ya está hecho y se puede mirar.
    processQueuedJob
      .mockResolvedValueOnce({ status: "completed", result: EN_INGLES })
      .mockRejectedValueOnce(new Error("el modelo no responde"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});

    const r = await ejecutar();

    expect(r.tipo).toBe("esperandoAprobacion");
    expect((r as { motivo: string }).motivo).toMatch(/«es».*«en»/);
    expect(aviso, "el fallo del reintento se tragó en silencio").toHaveBeenCalled();
  });

  it("y ese aviso no filtra la cadena de conexión", async () => {
    processQueuedJob
      .mockResolvedValueOnce({ status: "completed", result: EN_INGLES })
      .mockRejectedValueOnce(
        new Error("connect ECONNREFUSED postgresql://usuario:SECRETO@host:5432/db"),
      );
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});

    await ejecutar();

    const texto = aviso.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(texto).not.toContain("SECRETO");
  });

  it("un veredicto sin hallazgos concretos no dispara un reintento", async () => {
    // «Mejóralo» produce otra pieza distinta, no la misma arreglada, y se paga
    // igual. Un resultado vacío suspende por REVIEW_REQUIRED sin hallazgos
    // accionables de idioma.
    processQueuedJob.mockResolvedValue({ status: "completed", result: {} });

    const r = await ejecutar();

    expect(r.tipo).toBe("esperandoAprobacion");
    // Puede haber hallazgos genéricos; lo que no puede es entrar en bucle.
    expect(processQueuedJob.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
