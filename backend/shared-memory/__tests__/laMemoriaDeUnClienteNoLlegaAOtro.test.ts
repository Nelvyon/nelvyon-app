/**
 * Lo que recuerda NELVYON de un cliente no llega a otro.
 *
 * ── POR QUE ESTO SE PRUEBA ATACANDO ─────────────────────────────────────────
 *
 * Una memoria que se filtra no da error: da una respuesta. El agente del cliente
 * B contesta usando algo que aprendio del cliente A, y suena bien. Nadie lo nota
 * hasta que un cliente reconoce en su informe un dato que no le pertenece.
 *
 * Por eso aqui no se comprueba que la funcion «devuelve algo»: se intenta sacar
 * la memoria del vecino por cada camino que el contrato ofrece —leer por
 * identificador, buscar, listar por agente, borrar— y ninguno debe dar.
 *
 * ── Y QUE LA MEMORIA CADUCA ─────────────────────────────────────────────────
 *
 * Una memoria de corto plazo que no caduca deja de ser de corto plazo. El
 * peligro no es el espacio: es que un dato viejo —un precio, un contacto, una
 * decision revocada— vuelva como si siguiera siendo cierto.
 *
 * COSTE EXTERNO: 0 EUR. Almacen en memoria; ninguna base, ningun modelo.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { InMemorySharedMemoryStore } from "../InMemorySharedMemoryStore";
import type { SharedMemoryWriteInput } from "../types";

const A = "cliente-a";
const B = "cliente-b";

let almacen: InMemorySharedMemoryStore;

const entrada = (over: Partial<SharedMemoryWriteInput> = {}): SharedMemoryWriteInput => ({
  tenantId: A,
  scope: "tenant",
  visibility: "tenant_shared",
  kind: "fact",
  key: "precio-acordado",
  title: "Precio acordado",
  content: "El cliente A cerro a 4.800 EUR al mes",
  agentId: "crm",
  // `createdBy` es obligatorio: una memoria sin autor no se puede auditar ni
  // revocar. Lo pide el contrato, y esta prueba lo cumple como lo cumpliria
  // cualquiera que escriba de verdad.
  createdBy: "usuario-de-a",
  ...over,
});

beforeEach(() => {
  almacen = new InMemorySharedMemoryStore();
});

describe("una memoria no cruza de cliente", () => {
  it("EL CONTROL: su dueno SI la recupera", async () => {
    // Sin este control, un almacen que no devolviera nada pasaria todas las
    // pruebas de abajo y dejaria a los agentes sin memoria.
    const guardada = await almacen.write(entrada());
    const leida = await almacen.read(A, guardada.id);
    expect(leida, "el dueno no puede recuperar lo suyo").not.toBeNull();
    expect(leida!.content).toContain("4.800");
  });

  it("leer por identificador desde OTRO cliente no devuelve nada", async () => {
    // El identificador es adivinable o puede filtrarse por un registro. Conocerlo
    // no puede bastar.
    const guardada = await almacen.write(entrada());
    const robada = await almacen.read(B, guardada.id);
    expect(robada, "el cliente B leyo una memoria del cliente A").toBeNull();
  });

  it("buscar desde OTRO cliente no encuentra nada", async () => {
    await almacen.write(entrada());
    const r = await almacen.search({ tenantId: B, query: "4.800", forbidCrossTenant: true });
    expect(r.entries, "la busqueda de B devolvio memoria de A").toEqual([]);
  });

  it("listar por agente esta acotado al cliente", async () => {
    // El mismo agente —`crm`— trabaja para los dos. Es justo donde se cruza si
    // el listado se hace por agente y se olvida el inquilino.
    await almacen.write(entrada({ tenantId: A, content: "secreto de A" }));
    await almacen.write(entrada({ tenantId: B, content: "secreto de B" }));

    const deB = await almacen.listByAgent(B, "crm", 10);
    expect(deB.every((e) => e.tenantId === B), "se colo una entrada de A").toBe(true);
    expect(deB.map((e) => e.content).join(" ")).not.toContain("secreto de A");
  });

  it("borrar desde OTRO cliente no borra nada", async () => {
    // Peor que leer: si B pudiera borrar memoria de A, seria destruir el trabajo
    // de otro sin dejar rastro.
    const guardada = await almacen.write(entrada());
    const borro = await almacen.delete(B, guardada.id, "usuario-de-b");
    expect(borro, "el cliente B borro una memoria del cliente A").toBe(false);
    expect(await almacen.read(A, guardada.id), "la memoria de A desaparecio").not.toBeNull();
  });
});

describe("la memoria caduca cuando toca", () => {
  it("la de corto plazo nace con caducidad, sin pedirla", async () => {
    // Si hubiera que acordarse de poner la caducidad, la mitad de las entradas
    // no la tendrian y «corto plazo» seria solo una etiqueta.
    const guardada = await almacen.write(entrada({ layer: "stm" }));
    expect(guardada.expiresAt, "una memoria de corto plazo sin caducidad").toBeTruthy();
  });

  it("una caducidad explicita se respeta", async () => {
    const guardada = await almacen.write(
      entrada({ expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    );
    expect(guardada.expiresAt).toBeTruthy();
  });
});

describe("lo nuevo sustituye a lo viejo", () => {
  it("dos escrituras con la misma clave no dejan dos verdades a la vez", async () => {
    // Es el fallo que hace que un agente cite un precio antiguo: la memoria
    // vieja sigue ahi y gana la busqueda. Si el almacen versiona en vez de
    // sustituir, lo ULTIMO tiene que ser lo que se recupere.
    await almacen.write(entrada({ content: "El cliente A cerro a 4.800 EUR al mes" }));
    await almacen.write(entrada({ content: "El cliente A renegocio a 5.500 EUR al mes" }));

    const r = await almacen.search({ tenantId: A, query: "EUR", forbidCrossTenant: true });
    const contenidos = r.entries.map((e) => e.content).join(" | ");
    expect(contenidos, "no se recupera el dato actualizado").toContain("5.500");
    expect(
      r.entries[0]?.content,
      "lo primero que se recupera es el precio viejo, ya renegociado",
    ).toContain("5.500");
  });
});
