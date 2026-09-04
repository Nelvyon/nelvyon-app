/**
 * Nada llega al cliente sin haber pasado por calidad.
 *
 * ── EL HUECO QUE CIERRA, Y ERA EL MAYOR DE LA SESIÓN ────────────────────────
 *
 * `MotorDeCalidad` tiene 82 comprobaciones en 18 disciplinas.
 * `mapaDeServicio.json` dice qué disciplina juzga cada servicio. Las dos cosas
 * estaban construidas, probadas y documentadas.
 *
 * Y no se tocaban:
 *
 *   · el único módulo que llamaba al motor era `PuenteDeEjecucion`, y
 *     `PuenteDeEjecucion` no tiene NI UN consumidor;
 *   · `qaDe` sólo lo leía una prueba;
 *   · la vía real —`manejadorDeServicioOs` → `OsOrchestrator`— no menciona la
 *     calidad en ninguna línea.
 *
 * O sea: todo lo entregado hasta hoy salió sin pasar por calidad ni una vez. No
 * porque el motor fallara, sino porque nadie lo llamaba. Es la misma clase de
 * fallo que dejó a 67 agentes sin cerrar el bucle de aprendizaje, y aquí a
 * mayor escala: no faltaba una línea en muchos sitios, faltaba el cable entero.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Que la puerta DISCRIMINE. Una puerta que retuviera todo sería tan inútil como
 * ninguna —y peor, porque llenaría de ruido la bandeja de revisión y se dejaría
 * de mirar—. Así que se comprueba tanto que retiene lo malo como que deja pasar
 * lo bueno.
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
  osOrchestrator: { processQueuedJob: (...a: unknown[]) => processQueuedJob(...a) },
}));

const utilidades = { latir: async () => true, señal: new AbortController().signal };

/** Un trabajo de un servicio que SÍ tiene disciplina declarada en el mapa. */
const trabajo = {
  jobId: "job-1",
  serviceId: "contenido_copywriting_premium",
  clientId: "cli-1",
  tenantId: "ten-1",
  payload: { userId: "usr-1", sector: "health" } as Record<string, unknown>,
  intake: null,
  attempts: 1,
  maxAttempts: 3,
};

/** Una entrega correcta y comprobable. */
const BUENO = {
  texto:
    "La clínica abre de lunes a viernes y atiende urgencias por la tarde. "
    + "Pide cita por teléfono o desde la web y te confirmamos en el mismo día.",
};

async function ejecutar(t: Partial<typeof trabajo> = {}) {
  const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");
  return manejadorDeServicioOs({ ...trabajo, ...t } as never, utilidades);
}

describe("nada se entrega sin pasar por calidad", () => {
  beforeEach(() => {
    recordOutcome.mockReset().mockResolvedValue(undefined);
    processQueuedJob.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("LA REGLA: un entregable vacío NO se cierra como completado", async () => {
    processQueuedJob.mockResolvedValue({ status: "completed", result: {} });

    const r = await ejecutar();

    expect(r.tipo, "se entregó un resultado vacío como trabajo hecho").toBe("esperandoAprobacion");
    expect((r as { motivo: string }).motivo).toMatch(/calidad/i);
  });

  it("y el motivo dice QUÉ disciplina lo suspendió y por qué", async () => {
    // «No cumple los criterios» no permite arreglar nada. Quien lo lea tiene que
    // saber qué rehacer.
    processQueuedJob.mockResolvedValue({ status: "completed", result: {} });

    const r = await ejecutar();

    expect((r as { motivo: string }).motivo).toMatch(/contenido/);
  });

  it("EL CONTROL: una entrega correcta SÍ pasa", async () => {
    // Sin esto, una puerta que retuviera siempre pasaría todas las pruebas de
    // arriba y habría parado la entrega entera sin que nadie lo notara.
    processQueuedJob.mockResolvedValue({ status: "completed", result: BUENO });

    const r = await ejecutar();

    expect(r.tipo, "se retuvo una entrega correcta").toBe("completado");
  });

  it("una pieza en el idioma equivocado se retiene", async () => {
    // Es la comprobación que no existía: 82 comprobaciones y ninguna miraba el
    // idioma. Una landing impecable en español para un cliente francés pasaba
    // absolutamente todo.
    processQueuedJob.mockResolvedValue({
      status: "completed",
      result: {
        texto:
          "We are a dental clinic in the city centre and we have been taking care of our "
          + "patients smiles for more than twenty years. Our team combines the experience of "
          + "the best professionals with the most advanced technology available today.",
      },
    });

    const r = await ejecutar({ payload: { userId: "usr-1", idioma: "es" } });

    expect(r.tipo).toBe("esperandoAprobacion");
    // El motivo dice el idioma pedido y el que llegó, que es más útil que la
    // palabra «idioma».
    expect((r as { motivo: string }).motivo).toMatch(/«es».*«en»/);
  });

  // ── LA CONSTANCIA ─────────────────────────────────────────────────────────

  it("un entregable APROBADO lleva constancia de que se revisó", async () => {
    // Antes solo quedaba rastro de lo que suspendia —el motivo va a
    // `waiting_reason`— y un entregable aprobado era indistinguible de uno que
    // nadie miro. La pregunta que se hace despues nunca es «por que se retuvo»:
    // es «esto lo reviso alguien, y con que».
    processQueuedJob.mockResolvedValue({ status: "completed", result: BUENO });

    const r = await ejecutar();
    const entregado = (r as { resultado: Record<string, unknown> }).resultado;
    const calidad = entregado.calidad as Record<string, unknown>;

    expect(calidad, "se entregó sin decir que había pasado por calidad").toBeDefined();
    expect(calidad.dominio).toBe("contenido");
    expect(calidad.revisadoPor).toBe("qa:contenido_copywriting_premium");
    expect(calidad.veredicto).toMatch(/^PASS/);
  });

  it("y dice lo que NO se pudo comprobar, no solo lo que pasó", async () => {
    // Un aprobado con media rúbrica sin ejecutar no es lo mismo que uno
    // completo, y quien lo lea después tiene derecho a distinguirlos.
    processQueuedJob.mockResolvedValue({ status: "completed", result: BUENO });

    const r = await ejecutar();
    const calidad = (r as { resultado: Record<string, unknown> }).resultado
      .calidad as Record<string, unknown>;

    expect(Array.isArray(calidad.noComprobado)).toBe(true);
  });

  it("el rastro NO pisa lo que produjo el agente", async () => {
    processQueuedJob.mockResolvedValue({ status: "completed", result: BUENO });

    const r = await ejecutar();
    const entregado = (r as { resultado: Record<string, unknown> }).resultado;

    expect(entregado.texto, "se perdió contenido al adjuntar el rastro").toBe(BUENO.texto);
  });

  it("lo que suspende calidad TAMPOCO se aprende", async () => {
    // Aprender de trabajo que no ha pasado calidad enseña a repetir lo que no
    // vale, y encima con la confianza que da un patrón con muchas muestras.
    processQueuedJob.mockResolvedValue({ status: "completed", result: {} });

    await ejecutar();

    expect(recordOutcome, "se aprendió de una pieza suspendida").not.toHaveBeenCalled();
  });

  it("un servicio SIN disciplina declarada no se juzga con la rúbrica de otro", async () => {
    // Inventarle una disciplina sería peor que no juzgarlo: lo mediría con el
    // criterio equivocado y el veredicto no significaría nada.
    processQueuedJob.mockResolvedValue({ status: "completed", result: {} });

    const r = await ejecutar({ serviceId: "servicio_que_no_existe_en_el_mapa" });

    expect(r.tipo).toBe("completado");
  });

  it("si el motor de calidad REVIENTA, se retiene: no saber no es valer", async () => {
    // Fallar abierto aquí significaría entregar sin haber mirado, que es
    // exactamente el estado del que se viene.
    processQueuedJob.mockResolvedValue({ status: "completed", result: BUENO });
    const { MotorDeCalidad } = await import("../../calidad/MotorDeCalidad");
    vi.spyOn(MotorDeCalidad.prototype, "evaluar").mockImplementation(() => {
      throw new Error("el motor se cayó");
    });

    const r = await ejecutar();

    expect(r.tipo, "se entregó sin poder comprobar la calidad").toBe("esperandoAprobacion");
    expect((r as { motivo: string }).motivo).toMatch(/no se pudo revisar/i);
  });

  it("el productor no se juzga a sí mismo", async () => {
    // El motor lanza si el evaluador es el autor. Que el revisor lleve `qa:`
    // delante es lo que garantiza que no puedan coincidir nunca.
    processQueuedJob.mockResolvedValue({ status: "completed", result: BUENO });
    const { MotorDeCalidad } = await import("../../calidad/MotorDeCalidad");
    const espia = vi.spyOn(MotorDeCalidad.prototype, "evaluar");

    await ejecutar();

    const [pieza, evaluador] = espia.mock.calls[0];
    expect(evaluador).not.toBe(pieza.autor);
    expect(evaluador).toMatch(/^qa:/);
  });
});
