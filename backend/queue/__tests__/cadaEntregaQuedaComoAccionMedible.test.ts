/**
 * Cada entrega queda registrada como una acción de la que responder.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `MotorDeResultados` cierra el círculo objetivo → línea base → acción →
 * medición → resultado. Está construido, tiene sus tablas (migración 583) y su
 * batería contra PostgreSQL real.
 *
 * Y no lo importaba NADIE. Cero referencias en todo el repositorio fuera de sus
 * propias pruebas. El motor que decide si NELVYON sirve de algo no recibía ni un
 * dato — así que `veredicto()` devolvía `desconocido` siempre, y con toda la
 * razón: nadie podía demostrar que una mejora viniera de algo que hiciéramos.
 *
 * Un motor de resultados sin acciones registradas no está roto. Está sordo.
 *
 * COSTE EXTERNO: 0 EUR. No toca la base ni llama a ningún modelo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const registrarAccion = vi.fn();
const query = vi.fn();
const processQueuedJob = vi.fn();
const recordOutcome = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query }) },
}));

const registrarEntregable = vi.fn();
vi.mock("../../os-core/registrarEntregable", () => ({
  registrarEntregable: (...a: unknown[]) => registrarEntregable(...a),
}));

vi.mock("../../resultados/MotorDeResultados", () => ({
  MotorDeResultados: class {
    registrarAccion = registrarAccion;
  },
}));

vi.mock("../../os-agents/learning/LearningService", () => ({
  LearningService: class {
    recordOutcome = recordOutcome;
  },
}));

vi.mock("../../os-agents/OsOrchestrator", () => ({
  osOrchestrator: { processQueuedJob: (...a: unknown[]) => processQueuedJob(...a) },
}));

const utilidades = { latir: async () => true, señal: new AbortController().signal };

const CLIENTE = "3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607";

const trabajo = {
  jobId: "job-1",
  serviceId: "contenido_copywriting_premium",
  clientId: CLIENTE,
  tenantId: "ten-1",
  payload: { userId: "usr-1" } as Record<string, unknown>,
  intake: null,
  attempts: 1,
  maxAttempts: 3,
};

const BUENO = {
  texto:
    "La clínica abre de lunes a viernes y atiende urgencias por la tarde. "
    + "Pide cita por teléfono o desde la web y te confirmamos en el mismo día.",
};

async function ejecutar(t: Partial<typeof trabajo> = {}) {
  const { manejadorDeServicioOs } = await import("../manejadorDeServicioOs");
  return manejadorDeServicioOs({ ...trabajo, ...t } as never, utilidades);
}

describe("cada entrega queda como acción medible", () => {
  beforeEach(() => {
    registrarAccion.mockReset().mockResolvedValue({ id: "acc-1" });
    registrarEntregable.mockReset().mockResolvedValue({ registrado: true, deliverableId: "d-1" });
    recordOutcome.mockReset().mockResolvedValue(undefined);
    processQueuedJob.mockReset().mockResolvedValue({ status: "completed", result: BUENO });
    // El cliente existe y pertenece al workspace 7.
    query.mockReset().mockResolvedValue([{ workspace_id: 7 }]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("LA REGLA: una entrega completada registra su acción", async () => {
    const r = await ejecutar();

    expect(r.tipo).toBe("completado");
    expect(registrarAccion, "la entrega no dejó rastro medible").toHaveBeenCalledTimes(1);
  });

  it("y la acción lleva el workspace, el cliente, el servicio y desde cuándo", async () => {
    await ejecutar();

    const a = registrarAccion.mock.calls[0][0];
    expect(a.workspaceId).toBe(7);
    expect(a.clientId).toBe(CLIENTE);
    expect(a.serviceId).toBe("contenido_copywriting_premium");
    expect(a.efectivaDesde, "sin fecha no se puede atribuir nada").toBeInstanceOf(Date);
  });

  it("NO inventa un workspace cuando el cliente no consta", async () => {
    // Meter la acción en el workspace equivocado ensuciaría el veredicto de OTRO
    // cliente. Un dato en el sitio equivocado es peor que ningún dato.
    query.mockResolvedValue([]);

    const r = await ejecutar();

    expect(r.tipo).toBe("completado");
    expect(registrarAccion, "se inventó un workspace").not.toHaveBeenCalled();
  });

  it("un `clientId` que no es uuid no llega siquiera a la consulta", async () => {
    // `os_jobs.client_id` es TEXT. Comparar un texto cualquiera con un uuid
    // revienta la consulta, y un fallo aquí no puede costar una entrega.
    const r = await ejecutar({ clientId: "cliente-de-prueba" });

    expect(r.tipo).toBe("completado");
    expect(query).not.toHaveBeenCalled();
    expect(registrarAccion).not.toHaveBeenCalled();
  });

  it("si el registro FALLA, la entrega del cliente NO se pierde", async () => {
    // El trabajo ya está hecho. Perderlo por no poder anotarlo sería absurdo.
    registrarAccion.mockRejectedValue(new Error("la base no está"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});

    const r = await ejecutar();

    expect(r.tipo, "un fallo de registro tumbó una entrega buena").toBe("completado");
    // Pero deja constancia: un motor que deja de recibir datos y no lo dice es
    // indistinguible de uno que funciona y no encuentra nada.
    expect(aviso, "el fallo se tragó en silencio").toHaveBeenCalled();
  });

  it("y el aviso no filtra la cadena de conexión", async () => {
    registrarAccion.mockRejectedValue(
      new Error("connect ECONNREFUSED postgresql://usuario:SECRETO@host:5432/db"),
    );
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});

    await ejecutar();

    const texto = aviso.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(texto, "el aviso filtró una credencial").not.toContain("SECRETO");
  });

  it("y aparece en la lista de entregables del cliente", async () => {
    // Medido antes: `os_deliverables` solo se escribia desde ficheros de prueba.
    // El portal la lee y produccion no insertaba ni una fila, asi que el cliente
    // no veia nunca lo que se le producia.
    await ejecutar();

    expect(registrarEntregable, "la entrega no llegó a la lista del cliente")
      .toHaveBeenCalledTimes(1);
    const e = registrarEntregable.mock.calls[0][0];
    expect(e.clientId).toBe(CLIENTE);
    expect(e.jobId, "sin jobId no se puede evitar duplicar en un reintento").toBe("job-1");
    expect(e.titulo).toBeTruthy();
  });

  it("y si ESO falla, la entrega tampoco se pierde", async () => {
    registrarEntregable.mockRejectedValue(new Error("la base no está"));
    const r = await ejecutar();
    expect(r.tipo).toBe("completado");
  });

  it("lo que NO se entrega tampoco se registra como acción", async () => {
    // Atribuirse una mejora a partir de una pieza que no pasó calidad es como se
    // construyen los informes de agencia que no significan nada.
    processQueuedJob.mockResolvedValue({ status: "completed", result: {} });

    const r = await ejecutar();

    expect(r.tipo).toBe("esperandoAprobacion");
    expect(registrarAccion, "se registró una acción de algo que no se entregó").not.toHaveBeenCalled();
    expect(registrarEntregable, "se le enseñó al cliente algo que no pasó calidad")
      .not.toHaveBeenCalled();
  });
});
