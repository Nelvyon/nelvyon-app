/**
 * EL DUEÑO DE UN WORKSPACE SE CUENTA UNA VEZ, NO DOS.
 *
 * CÓMO SE ENCONTRÓ. `platformDbFallback.ts` salió en la lista de módulos con
 * muchos dependientes y ninguna prueba: 35 importadores. Al leerlo apareció
 * esto en `mapWorkspaceRow`:
 *
 *     members_count: membersCount + 1
 *
 * EL «+ 1» ERA UNA COMPENSACIÓN QUE SOBREVIVIÓ A SU CAUSA. Se escribió cuando
 * el dueño NO aparecía en `workspace_members`. Aquel defecto está contado en
 * `backend/tests/test_autoservicio_fundador_ausente.py`: la creación de
 * workspace devolvía `role: "owner", members_count: 1` y nunca escribía la
 * pertenencia, así que con RLS activo el dueño se quedaba fuera de su propio
 * espacio. Se arregló —`dbCreateWorkspace` ya inserta al dueño como miembro
 * activo— pero el `+ 1` se quedó, y pasó a contar al dueño dos veces.
 *
 * CONTRA QUÉ SE COMPROBÓ. No contra una opinión: contra la implementación que
 * manda. `_count_workspace_members` en `backend/routers/billing_usage.py`
 * cuenta las filas de `workspace_members` y no le suma nada — y ésa es la que
 * gobierna los límites de plan. El mismo concepto se estaba calculando de dos
 * formas que se llevaban uno.
 *
 * LO QUE ESTAS PRUEBAS FIJAN: que las dos rutas digan el mismo número, y que
 * un workspace recién creado diga uno y no cero.
 *
 * COSTE EXTERNO: 0 €. La base va doblada; no se abre ninguna conexión.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Las consultas que se han hecho, para poder comprobar qué se preguntó. */
const consultas: Array<{ sql: string; params: unknown[] }> = [];

/** Filas que devolverá la base doblada, por orden de llamada. */
let respuestas: Array<Array<Record<string, unknown>>> = [];

vi.mock("../../../../../backend/db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        consultas.push({ sql, params });
        return respuestas.shift() ?? [];
      }),
    }),
  },
}));

vi.mock("next/server", () => ({
  NextResponse: { json: (b: unknown, i?: { status?: number }) => ({ body: b, status: i?.status }) },
}));

const CLAIMS = {
  userId: "u-1",
  email: "a@ejemplo.test",
  tenantId: "t-1",
  plan: "starter",
} as never;

beforeEach(() => {
  consultas.length = 0;
  respuestas = [];
});

describe("un workspace con un solo miembro dice UNO", () => {
  it("LA REGLA: el recuento es el que devuelve la base, sin sumarle nada", async () => {
    const { dbListWorkspaces } = await import("../platformDbFallback");
    respuestas = [
      // los workspaces propios
      [{ id: 7, name: "Acme", status: "active" }],
      // countMembers(7): sólo el dueño
      [{ count: "1" }],
      // las membresías en workspaces de otros: ninguna
      [],
    ];
    const lista = await dbListWorkspaces(CLAIMS);
    expect(lista).toHaveLength(1);
    expect(lista[0].members_count, "el dueño se está contando dos veces").toBe(1);
  });

  it("con tres miembros dice tres", async () => {
    const { dbListWorkspaces } = await import("../platformDbFallback");
    respuestas = [[{ id: 7, name: "Acme", status: "active" }], [{ count: "3" }], []];
    const lista = await dbListWorkspaces(CLAIMS);
    expect(lista[0].members_count).toBe(3);
  });

  it("EL CONTROL: cuenta lo que dice la base, no un número fijo", async () => {
    // Sin esto, devolver siempre 1 pasaría la primera prueba.
    const { dbListWorkspaces } = await import("../platformDbFallback");
    respuestas = [[{ id: 9, name: "Otra", status: "active" }], [{ count: "12" }], []];
    const lista = await dbListWorkspaces(CLAIMS);
    expect(lista[0].members_count).toBe(12);
  });
});

describe("un workspace recién creado", () => {
  it("dice UNO: el dueño acaba de insertarse como miembro", async () => {
    // Y no cero, que es lo que saldría si se quitara el «+ 1» sin mirar los
    // sitios donde el «+ 1» era el que ponía al dueño.
    const { dbCreateWorkspace } = await import("../platformDbFallback");
    respuestas = [
      [{ id: 11, name: "Nuevo", status: "active" }], // INSERT INTO workspaces
      [], // INSERT INTO workspace_members
    ];
    const ws = await dbCreateWorkspace(CLAIMS, { name: "Nuevo" });
    expect(ws.members_count).toBe(1);
    expect(ws.role).toBe("owner");
  });

  it("y de verdad inserta la pertenencia del dueño", async () => {
    /**
     * Ésta es la que impide repetir el defecto original. Si alguien quitara el
     * INSERT en `workspace_members`, el recuento seguiría diciendo 1 —porque se
     * pasa a mano— y la mentira volvería exactamente igual que la primera vez:
     * el dueño fuera de su propio espacio en cuanto RLS mira esa tabla.
     */
    const { dbCreateWorkspace } = await import("../platformDbFallback");
    respuestas = [[{ id: 11, name: "Nuevo", status: "active" }], []];
    await dbCreateWorkspace(CLAIMS, { name: "Nuevo" });

    const inserta = consultas.find((c) => /INSERT INTO workspace_members/i.test(c.sql));
    expect(inserta, "no se inserta al dueño en workspace_members").toBeDefined();
    expect(inserta!.sql).toMatch(/'owner'/);
    expect(inserta!.sql).toMatch(/'active'/);
    expect(inserta!.params).toContain("u-1");
  });
});

describe("el recuento sólo mira miembros activos", () => {
  it("la consulta filtra por status activo", () => {
    // Contar los `pending` inflaría el número que ve el cliente y el que se
    // compara contra el límite del plan.
    return (async () => {
      const { dbListWorkspaces } = await import("../platformDbFallback");
      respuestas = [[{ id: 7, name: "Acme", status: "active" }], [{ count: "1" }], []];
      await dbListWorkspaces(CLAIMS);
      const cuenta = consultas.find((c) => /COUNT\(\*\)[\s\S]*workspace_members/i.test(c.sql));
      expect(cuenta, "no se encuentra la consulta de recuento").toBeDefined();
      expect(cuenta!.sql).toMatch(/status\s*=\s*'active'/);
    })();
  });
});
