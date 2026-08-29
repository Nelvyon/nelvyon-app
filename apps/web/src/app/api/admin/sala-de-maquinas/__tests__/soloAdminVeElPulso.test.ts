/**
 * SÓLO UN ADMINISTRADOR VE EL PULSO.
 *
 * Esta ruta atraviesa inquilinos a propósito: enseña lo que está parado en
 * TODOS los clientes a la vez, que es justamente su utilidad. Y eso la
 * convierte en la clase de ruta que, mal protegida, entrega el mapa entero del
 * negocio a cualquiera con una cuenta.
 *
 * Las tres pruebas que importan:
 *
 *   · sin sesión                   → 401
 *   · con sesión pero sin ser admin → 403   ← la que de verdad protege
 *   · siendo admin                  → 200   ← sin esto, una ruta que deniega
 *                                             siempre pasaría las otras dos
 *
 * La segunda es la que separa un panel interno de una filtración. Una ruta
 * autorizada sólo por «pertenece a algún workspace» dejaría pasar a cualquier
 * cliente, y desde dentro vería lo que se atasca en los negocios de todos los
 * demás.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const autenticar = vi.fn();
const esAdmin = vi.fn();
const pulso = vi.fn();

vi.mock("@nelvyon/auth", () => ({
  authenticate: (req: Request) => autenticar(req),
}));

vi.mock("@nelvyon/admin", () => ({
  getNelvyonAdminService: () => ({ isUserAdmin: (id: string) => esAdmin(id) }),
}));

vi.mock("@nelvyon/os-agents", () => ({
  OsAgentError: class OsAgentError extends Error {},
}));

vi.mock("@/../../backend/db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: async () => [] }) },
}));

vi.mock("@/../../backend/operacion/SalaDeMaquinas", () => ({
  SalaDeMaquinas: class {
    async pulso() {
      return pulso();
    }
  },
}));

const PULSO_VACIO = {
  medidoEn: new Date().toISOString(),
  atascos: [],
  porTipo: {},
  enMovimiento: { trabajosCompletadosUltimas24h: 0, entregablesPublicadosUltimas24h: 0 },
  noMedido: [],
};

async function llamar() {
  const { GET } = await import("../route");
  return GET(new Request("https://nelvyon.test/api/admin/sala-de-maquinas"));
}

describe("sólo un administrador ve el pulso", () => {
  beforeEach(() => {
    vi.resetModules();
    autenticar.mockReset();
    esAdmin.mockReset();
    pulso.mockReset();
    pulso.mockResolvedValue(PULSO_VACIO);
  });

  it("sin sesión: 401, y NO se llega a consultar nada", async () => {
    const { OsAgentError } = await import("@nelvyon/os-agents");
    autenticar.mockRejectedValue(new OsAgentError("Unauthorized"));

    const r = await llamar();
    expect(r.status).toBe(401);
    expect(pulso, "se midió el pulso antes de comprobar quién preguntaba").not.toHaveBeenCalled();
  });

  it("CON SESIÓN PERO SIN SER ADMIN: 403", async () => {
    // La prueba que de verdad protege. Un cliente autenticado NO puede ver lo
    // que se atasca en los negocios de los demás.
    autenticar.mockResolvedValue({ userId: "u-cliente" });
    esAdmin.mockResolvedValue(false);

    const r = await llamar();
    expect(r.status).toBe(403);
    expect(
      pulso,
      "un usuario no administrador ha llegado a ver datos de todos los inquilinos",
    ).not.toHaveBeenCalled();
  });

  it("EL CONTROL POSITIVO: siendo admin, 200 y el pulso", async () => {
    // Sin esta prueba, una ruta que denegara SIEMPRE pasaría las dos de arriba
    // y parecería impecable.
    autenticar.mockResolvedValue({ userId: "u-admin" });
    esAdmin.mockResolvedValue(true);

    const r = await llamar();
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ atascos: [], porTipo: {} });
  });

  it("si la medición falla: 503, NUNCA un 200 con el panel vacío", async () => {
    // Un panel que dice «no hay nada parado» porque la consulta reventó es peor
    // que un panel caído: el caído se ve, el que miente tranquiliza.
    autenticar.mockResolvedValue({ userId: "u-admin" });
    esAdmin.mockResolvedValue(true);
    pulso.mockRejectedValue(new Error("la base no responde"));

    const r = await llamar();
    expect(r.status).toBe(503);
    const cuerpo = await r.json();
    expect(cuerpo).not.toHaveProperty("atascos");
  });
});
