/**
 * No se le vende nada a quien tiene un problema abierto con lo que ya paga.
 *
 * ── LO QUE HACÍA ────────────────────────────────────────────────────────────
 *
 * `OsUpsellEngine` leía los servicios contratados, el catálogo y el historial,
 * le preguntaba a un modelo qué vender, y lo guardaba. Medido: cero apariciones
 * de «salud», «health», «churn», «riesgo» o «fallo» en todo el módulo.
 *
 * Es decir: a un cliente que lleva tres semanas sin recibir un entregable, el
 * sistema le proponía contratar otro servicio. Es la forma más rápida de
 * perderlo, y encima le confirma que nadie está mirando su cuenta.
 *
 * `SenalesDeCliente` ya distinguía las tres gravedades que hacían falta, y
 * `bloqueante` significa literalmente «el cliente está pagando y no recibe
 * nada». Estaba escrito. No se consultaba.
 *
 * ── Y AHORRA LA LLAMADA AL MODELO ───────────────────────────────────────────
 *
 * La comprobación va ANTES de componer el prompt. Preguntarle a un modelo qué
 * venderle a un cliente al que no se le va a vender nada cuesta dinero y no
 * sirve para nada.
 *
 * COSTE EXTERNO: 0 EUR. El modelo es un doble.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OsUpsellEngine } from "../OsUpsellEngine";

const CLI = "3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607";
const TEN = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const deCliente = vi.fn();

vi.mock("../../../exito/SenalesDeCliente", () => ({
  SenalesDeCliente: class {
    deCliente = deCliente;
  },
}));
vi.mock("../../../cerebro/CerebroDeNegocioService", () => ({
  CerebroDeNegocioService: class {},
}));
vi.mock("../../../portal/CicloDelClienteService", () => ({
  CicloDelClienteService: class {},
}));

/** Base que responde por forma a las consultas del motor. */
function baseCon(opciones: { workspace?: number | null; catalogo?: boolean } = {}) {
  const { workspace = 7, catalogo = true } = opciones;
  return vi.fn(async (sql: string) => {
    const s = String(sql).replace(/\s+/g, " ");
    if (s.includes("FROM os_clients")) {
      return workspace === null ? [] : [{ workspace_id: workspace }];
    }
    if (s.includes("FROM os_service_contracts")) return [{ service_id: "seo_premium" }];
    if (s.includes("FROM os_service_catalog")) {
      return catalogo
        ? [{ service_id: "ads_premium", name: "Ads", description: "campañas" }]
        : [];
    }
    if (s.includes("FROM os_job_results")) return [];
    return [];
  });
}

describe("no se vende a quien le está yendo mal", () => {
  let complete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deCliente.mockReset().mockResolvedValue([]);
    complete = vi.fn().mockResolvedValue(
      JSON.stringify({ serviceId: "ads_premium", reason: "encaja", score: 80 }),
    );
  });

  it("LA REGLA: con un problema BLOQUEANTE abierto no se propone nada", async () => {
    deCliente.mockResolvedValue([
      { tipo: "sin_entregables", gravedad: "bloqueante", workspaceId: 7, clientId: CLI },
    ]);
    const db = baseCon();
    const motor = new OsUpsellEngine({ db: { query: db } as never, llm: { complete } as never });

    expect(await motor.analyzeClient(CLI, TEN)).toBeNull();
  });

  it("y NI SIQUIERA se le pregunta al modelo: eso cuesta dinero", async () => {
    deCliente.mockResolvedValue([
      { tipo: "servicio_bloqueado", gravedad: "bloqueante", workspaceId: 7, clientId: CLI },
    ]);
    const db = baseCon();
    const motor = new OsUpsellEngine({ db: { query: db } as never, llm: { complete } as never });

    await motor.analyzeClient(CLI, TEN);

    expect(complete, "se pagó una llamada para no vender nada").not.toHaveBeenCalled();
  });

  it("EL CONTROL: sin problemas bloqueantes SÍ se propone", async () => {
    // Sin esto, una puerta que cerrara siempre pasaría las pruebas de arriba y
    // habría apagado la venta cruzada entera sin que nadie lo notara.
    deCliente.mockResolvedValue([
      { tipo: "oportunidad_de_expansion", gravedad: "informativa", workspaceId: 7, clientId: CLI },
    ]);
    const db = baseCon();
    const motor = new OsUpsellEngine({ db: { query: db } as never, llm: { complete } as never });

    const s = await motor.analyzeClient(CLI, TEN);

    expect(s, "no propuso nada a un cliente que va bien").not.toBeNull();
    expect(s?.suggestedServiceId).toBe("ads_premium");
  });

  it("una señal de ATENCIÓN no bloquea: es para esta semana, no para hoy", async () => {
    // Las tres gravedades tienen significados operativos distintos y tratarlas
    // igual convierte la puerta en un interruptor de apagado.
    deCliente.mockResolvedValue([
      { tipo: "conexiones_pendientes", gravedad: "atencion", workspaceId: 7, clientId: CLI },
    ]);
    const db = baseCon();
    const motor = new OsUpsellEngine({ db: { query: db } as never, llm: { complete } as never });

    expect(await motor.analyzeClient(CLI, TEN)).not.toBeNull();
  });

  it("FALLA CERRADO: si no se pueden leer las señales, se calla", async () => {
    // Proponerle una venta a un cliente cuya situación no hemos podido
    // comprobar puede costar la relación; no proponérsela cuesta una
    // oportunidad retrasada.
    deCliente.mockRejectedValue(new Error("la base no está"));
    const db = baseCon();
    const motor = new OsUpsellEngine({ db: { query: db } as never, llm: { complete } as never });

    expect(await motor.analyzeClient(CLI, TEN)).toBeNull();
    expect(complete).not.toHaveBeenCalled();
  });

  it("y si el cliente no consta, tampoco: no se puede comprobar cómo le va", async () => {
    const db = baseCon({ workspace: null });
    const motor = new OsUpsellEngine({ db: { query: db } as never, llm: { complete } as never });

    expect(await motor.analyzeClient(CLI, TEN)).toBeNull();
  });
});
