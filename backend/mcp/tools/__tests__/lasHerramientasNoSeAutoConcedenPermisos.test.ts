/**
 * BLOQUE 6 · una herramienta no se concede a si misma el permiso que exige.
 *
 * `memory_read` y `memory_write` llamaban al servicio de memoria compartida
 * fabricando el contexto de seguridad:
 *
 *     scopes: ctx.scopes.includes("memory.read") ? ctx.scopes : [...ctx.scopes, "memory.read"]
 *     roles:  ctx.roles.length ? ctx.roles : ["owner"]
 *
 * Es decir: si al llamante le faltaba el ambito, **se lo anadian**; y si venia
 * sin roles, `memory_write` lo trataba como **dueno del inquilino**. Cualquier
 * control que el servicio de memoria hiciera sobre esos campos quedaba anulado
 * desde arriba, porque siempre recibia lo que necesitaba para decir que si.
 *
 * Un permiso que el propio consumidor se autoconcede no es un permiso: es una
 * variable con nombre de permiso. Y aqui lo que se protege es la memoria del
 * inquilino, que es justo donde se mezcla informacion entre clientes si algo
 * falla.
 *
 * El origen es real y no una torpeza: el MCP nombra sus ambitos con dos puntos
 * (`memory:read`) y la memoria compartida con punto (`memory.read`). Hacia falta
 * traducir. Pero traducir es convertir lo que hay, no anadir lo que falta.
 */
import { describe, expect, it, vi } from "vitest";

import { productiveTools } from "../productiveTools";
import type { McpCallContext } from "../../types";

function contexto(over: Partial<McpCallContext> = {}): McpCallContext {
  return {
    tenantId: "t-mem",
    userId: "u1",
    agentId: "a1",
    requestId: "r1",
    traceId: "tr1",
    roles: [],
    scopes: [],
    ...over,
  };
}

function herramienta(name: string) {
  const t = productiveTools.find((x) => x.name === name);
  if (!t) throw new Error(`herramienta desconocida: ${name}`);
  return t;
}

/** Captura el contexto de seguridad con el que se llama a la memoria compartida. */
function espiarMemoriaCompartida() {
  const visto: { search?: unknown; write?: unknown } = {};
  vi.doMock("../../../saas/SaasSharedMemoryService", () => ({
    getSaasSharedMemoryService: () => ({
      search: async (ctx: unknown) => {
        visto.search = ctx;
        return { entries: [], truncated: false };
      },
      write: async (ctx: unknown) => {
        visto.write = ctx;
        return { id: "e1", key: "k", content: "c", layer: "agent" };
      },
    }),
  }));
  vi.doMock("../../../shared-memory/config", () => ({
    isSharedMemoryEnabled: () => true,
  }));
  return visto;
}

describe("BLOQUE 6 · la memoria compartida recibe el contexto REAL", () => {
  it("`memory_read` no anade el ambito que le falta al llamante", async () => {
    vi.resetModules();
    const visto = espiarMemoriaCompartida();
    const { productiveTools: recargadas } = await import("../productiveTools");
    const t = recargadas.find((x) => x.name === "memory_read")!;

    await t.handler({ limit: 1 }, contexto({ scopes: [] }));

    const ctxRecibido = visto.search as { scopes: string[] };
    expect(
      ctxRecibido.scopes,
      "la herramienta se autoconcedio `memory.read`: cualquier control del servicio queda anulado",
    ).not.toContain("memory.read");
    vi.doUnmock("../../../saas/SaasSharedMemoryService");
    vi.doUnmock("../../../shared-memory/config");
  });

  it("`memory_write` no anade el ambito ni asciende a `owner`", async () => {
    vi.resetModules();
    const visto = espiarMemoriaCompartida();
    const { productiveTools: recargadas } = await import("../productiveTools");
    const t = recargadas.find((x) => x.name === "memory_write")!;

    await t.handler({ content: "hola" }, contexto({ roles: [], scopes: [] }));

    const ctxRecibido = visto.write as { scopes: string[]; roles: string[] };
    expect(
      ctxRecibido.scopes,
      "la herramienta se autoconcedio `memory.write`",
    ).not.toContain("memory.write");
    expect(
      ctxRecibido.roles,
      "un contexto sin roles se convirtio en dueno del inquilino",
    ).not.toContain("owner");
    vi.doUnmock("../../../saas/SaasSharedMemoryService");
    vi.doUnmock("../../../shared-memory/config");
  });

  it("EL CONTROL: quien SI tiene el ambito lo conserva traducido", async () => {
    /**
     * Sin esto, una traduccion que borrara todos los ambitos pasaria las dos
     * pruebas de arriba y dejaria la memoria compartida inaccesible para todo
     * el mundo.
     *
     * `memory:read` es el nombre del ambito en MCP; `memory.read` el de la
     * memoria compartida. Traducir el que SI trae el llamante es correcto.
     */
    vi.resetModules();
    const visto = espiarMemoriaCompartida();
    const { productiveTools: recargadas } = await import("../productiveTools");
    const t = recargadas.find((x) => x.name === "memory_read")!;

    await t.handler({ limit: 1 }, contexto({ scopes: ["memory:read"] }));

    const ctxRecibido = visto.search as { scopes: string[] };
    expect(
      ctxRecibido.scopes,
      "el ambito legitimo del llamante no llego traducido a la memoria compartida",
    ).toContain("memory.read");
    vi.doUnmock("../../../saas/SaasSharedMemoryService");
    vi.doUnmock("../../../shared-memory/config");
  });

  it("el inquilino que llega a la memoria es el del contexto, no el de los argumentos", async () => {
    // Si el inquilino saliera de los argumentos, un agente podria leer la
    // memoria de otro cliente pidiendolo por parametro. La politica ya bloquea
    // ese intento, pero la herramienta no debe depender de ello.
    vi.resetModules();
    const visto = espiarMemoriaCompartida();
    const { productiveTools: recargadas } = await import("../productiveTools");
    const t = recargadas.find((x) => x.name === "memory_read")!;

    await t.handler(
      { limit: 1, tenantId: "OTRO-INQUILINO" },
      contexto({ tenantId: "t-mem", scopes: ["memory:read"] }),
    );

    expect((visto.search as { tenantId: string }).tenantId).toBe("t-mem");
    vi.doUnmock("../../../saas/SaasSharedMemoryService");
    vi.doUnmock("../../../shared-memory/config");
  });
});
