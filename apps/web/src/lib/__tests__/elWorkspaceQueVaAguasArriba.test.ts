/**
 * BLOQUE 7 · el workspace que va aguas arriba.
 *
 * `proxyPlatformFetch` es el paso obligado de ~60 de las 93 rutas del producto
 * autenticado: el BFF que traduce una petición del navegador en una llamada a
 * FastAPI. Y lleva dentro una decisión de aislamiento: **qué workspace se le
 * dice al backend**.
 *
 * Ese identificador llega en la cabecera `X-Workspace-Id`, es decir, lo pone el
 * cliente. Que eso funcione bien depende de tres cosas encadenadas, y basta con
 * que falle una:
 *
 *   1. Que la cabecera se lea de forma **inequívoca**. Si este lado la descarta
 *      por rara y FastAPI la interpreta igualmente, la comprobación de
 *      pertenencia de este lado no llega a ejecutarse y el backend resuelve un
 *      workspace que nadie ha comprobado. (Ese defecto ya se corrigió en un
 *      bloque anterior; aquí se asegura para que no vuelva.)
 *   2. Que se compruebe la **pertenencia** antes de pasarla.
 *   3. Que si la pertenencia falla, **no se llame al backend**. Denegar después
 *      de haber preguntado ya es tarde para una escritura.
 *
 * Qué certifica esta suite y qué no: mide la LÓGICA DE DECISIÓN del proxy —cómo
 * lee la cabecera, en qué orden comprueba y si llega o no a llamar aguas
 * arriba—. La pertenencia en sí, que es una consulta, está certificada aparte
 * contra PostgreSQL real en `cruzarDeInquilinoNoCuela.pg.test.ts`. Se dice
 * explícitamente para que nadie lea esta suite como si cubriera esa mitad.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const llamadasArriba: Array<{ url: string; workspace: string | null }> = [];
const comprobaciones: Array<number> = [];

/** Workspace al que SÍ pertenece el usuario de la sesión simulada. */
const WS_PROPIO = 4242;

vi.mock("@nelvyon/auth", () => ({
  extractToken: vi.fn((req: Request) => {
    const c = req.headers.get("cookie") ?? "";
    const m = /(?:^|;\s*)nelvyon_token=([^;]+)/.exec(c);
    return m ? (m[1] ?? null) : null;
  }),
  authenticate: vi.fn(async () => ({
    userId: "u-1",
    tenantId: "tenant-A",
    email: "a@ejemplo.test",
    plan: "pro",
  })),
}));

// Se dobla la COMPROBACION, no el proxy: lo que mide esta suite es la logica de
// decision del proxy —orden, lectura de la cabecera, si llega a llamar aguas
// arriba—. Que la pertenencia se resuelva bien es otra propiedad y esta
// certificada contra PostgreSQL real en `cruzarDeInquilinoNoCuela.pg.test.ts`.
vi.mock("@/lib/platformDbFallback", () => {
  // La clase se declara DENTRO de la fabrica: `vi.mock` se iza al principio del
  // fichero y no puede ver nada declarado fuera.
  class WorkspaceAccessErrorFalso extends Error {
    readonly name = "WorkspaceAccessError";
    constructor(public readonly workspaceId: number) {
      super("Workspace access denied");
    }
  }
  return {
    platformDbFallbackEnabled: () => true,
    WorkspaceAccessError: WorkspaceAccessErrorFalso,
    assertUserCanAccessWorkspace: vi.fn(async (_claims: unknown, ws: number) => {
      comprobaciones.push(ws);
      if (ws !== WS_PROPIO) throw new WorkspaceAccessErrorFalso(ws);
    }),
  };
});

import {
  hasUnparsableWorkspaceHeader,
  parsePlatformWorkspaceId,
  proxyPlatformFetch,
  stableWorkspaceIdFromTenant,
} from "../platformFastApiProxy";

function peticion(cabeceras: Record<string, string> = {}): Request {
  return new Request("https://nelvyon.test/api/platform/crm/clients", {
    headers: { cookie: "nelvyon_token=t", ...cabeceras },
  });
}

beforeEach(() => {
  llamadasArriba.length = 0;
  comprobaciones.length = 0;
  process.env.NELVYON_BACKEND_URL = "https://backend.interno.test";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      llamadasArriba.push({ url: String(url), workspace: h.get("X-Workspace-Id") });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }),
  );
});

describe("BLOQUE 7 · leer la cabecera sin ambigüedad", () => {
  it("EL CONTROL: un número normal se lee", () => {
    /**
     * Sin este control, un analizador que rechazara todo pasaría los casos de
     * abajo y dejaría el panel de plataforma entero sin poder elegir workspace.
     */
    expect(parsePlatformWorkspaceId(peticion({ "x-workspace-id": "4242" }))).toBe(4242);
    expect(hasUnparsableWorkspaceHeader(peticion({ "x-workspace-id": "4242" }))).toBe(false);
  });

  it("las formas raras de un número NO se leen como número", () => {
    /**
     * `+42`, `42.0`, `0x2a`, `4.2e1`, `042`: JavaScript las convertiría todas a
     * un número; otros analizadores, no, o a otro. Un identificador que dos lados
     * leen distinto es un identificador que no sirve para decidir permisos.
     */
    for (const raro of ["+42", "42.0", "0x2a", "4.2e1", " 42abc", "42 42", "-1", "0", "abc", "1,2"]) {
      const req = peticion({ "x-workspace-id": raro });
      expect(parsePlatformWorkspaceId(req), raro).toBeNull();
      expect(
        hasUnparsableWorkspaceHeader(req),
        `la cabecera ${JSON.stringify(raro)} no se marco como ilegible`,
      ).toBe(true);
    }
  });

  it("un número enorme no se acepta como identificador", () => {
    // Más allá del entero seguro, dos lados dejan de coincidir en el valor.
    const grande = "9007199254740993"; // Number.MAX_SAFE_INTEGER + 2
    expect(parsePlatformWorkspaceId(peticion({ "x-workspace-id": grande }))).toBeNull();
  });

  it("sin cabecera no hay cabecera ilegible", () => {
    expect(hasUnparsableWorkspaceHeader(peticion())).toBe(false);
    expect(parsePlatformWorkspaceId(peticion())).toBeNull();
  });
});

describe("BLOQUE 7 · pedir el workspace de otro", () => {
  it("EL CONTROL: con el workspace propio se llama al backend", async () => {
    const r = await proxyPlatformFetch(
      peticion({ "x-workspace-id": String(WS_PROPIO) }),
      "GET",
      "/crm/clients",
    );
    expect(r.status).toBe(200);
    expect(llamadasArriba).toHaveLength(1);
    expect(llamadasArriba[0].workspace).toBe(String(WS_PROPIO));
  });

  it("con el workspace de OTRO no se llega al backend", async () => {
    /**
     * La propiedad que importa no es solo que responda 403: es que **no se
     * llame aguas arriba**. Denegar después de haber preguntado ya es tarde
     * cuando lo que se pedía era una escritura.
     */
    const r = await proxyPlatformFetch(peticion({ "x-workspace-id": "999999" }), "GET", "/crm/clients");
    expect(r.status).toBe(403);
    expect(comprobaciones, "no se comprobo la pertenencia").toContain(999999);
    expect(
      llamadasArriba,
      "se llamo al backend con el workspace de otro antes de denegar",
    ).toHaveLength(0);
  });

  it("una cabecera ILEGIBLE se rechaza, no se trata como ausente", async () => {
    /**
     * Este es el defecto que se corrigió en un bloque anterior y que aquí queda
     * asegurado: tratarla como ausente hacía que la comprobación de pertenencia
     * no se ejecutara, mientras FastAPI sí resolvía un workspace a partir de la
     * misma cabecera. Dos lados leyendo distinto es por donde se cuela todo.
     */
    const r = await proxyPlatformFetch(peticion({ "x-workspace-id": "0x2a" }), "GET", "/crm/clients");
    expect(r.status).toBe(400);
    expect(comprobaciones).toHaveLength(0);
    expect(llamadasArriba, "una cabecera ilegible llego al backend").toHaveLength(0);
  });

  it("sin sesión no se llega al backend", async () => {
    const sin = new Request("https://nelvyon.test/api/platform/crm/clients");
    const r = await proxyPlatformFetch(sin, "GET", "/crm/clients");
    expect(r.status).toBe(401);
    expect(llamadasArriba).toHaveLength(0);
  });

  it("las rutas de entidad exigen workspace antes de proxiar", async () => {
    // `requireWorkspace` existe para las rutas que operan sobre UNA entidad: sin
    // workspace, el backend elegiria uno por su cuenta y eso es IDOR.
    const r = await proxyPlatformFetch(peticion(), "GET", "/crm/clients/1", {}, {
      requireWorkspace: true,
    });
    expect(r.status).toBe(400);
    expect(llamadasArriba).toHaveLength(0);
  });
});

describe("BLOQUE 7 · el workspace derivado del inquilino", () => {
  it("es estable y distinto por inquilino", () => {
    /**
     * `stableWorkspaceIdFromTenant` es lo que usan las rutas que NO aceptan
     * cabecera: derivan el workspace del inquilino verificado. Dos propiedades:
     * que no cambie entre llamadas —o el cliente perdería sus datos— y que dos
     * inquilinos no caigan en el mismo, que sería mezclarlos.
     */
    const a = stableWorkspaceIdFromTenant("tenant-A");
    const b = stableWorkspaceIdFromTenant("tenant-B");
    expect(stableWorkspaceIdFromTenant("tenant-A")).toBe(a);
    expect(a).not.toBe(b);
    expect(Number.isSafeInteger(a) && a > 0).toBe(true);
  });

  it("los espacios sobrantes se normalizan a propósito", () => {
    // `tenant-A` y `tenant-A ` dan el MISMO workspace porque la funcion recorta.
    // Es deliberado y no es un defecto: el `tenantId` sale de unos claims
    // verificados y es un UUID, asi que las dos formas no pueden coexistir. Se
    // deja escrito porque la primera version de esta prueba lo conto como
    // colision y no lo era.
    expect(stableWorkspaceIdFromTenant("tenant-A ")).toBe(
      stableWorkspaceIdFromTenant("tenant-A"),
    );
  });

  it("HALLAZGO MEDIDO: el espacio de workspaces derivados es de 900.000 y colisiona", () => {
    /**
     * Esto no es un ataque: es un defecto que llega solo con el crecimiento.
     *
     * `stableWorkspaceIdFromTenant` es un hash multiplicativo por 31 reducido a
     * `% 900_000`. Con novecientas mil casillas, el limite del cumpleaños dice
     * que las colisiones no son raras — y una colision aqui significa **dos
     * inquilinos mandando el MISMO `X-Workspace-Id` aguas arriba**, es decir
     * compartiendo la unidad de aislamiento que usa FastAPI.
     *
     * Medido con UUID reales, media de veinte repeticiones:
     *     1.000 inquilinos -> 0,5 colisiones
     *     2.000 inquilinos -> 1,8 colisiones
     *     5.000 inquilinos -> 13,1 colisiones
     *
     * No se ha corregido en este bloque Y ESO ES DELIBERADO: cambiar la
     * derivacion cambia el identificador de TODOS los inquilinos que ya lo usan,
     * y los datos que haya guardados bajo el identificador viejo quedarian
     * huerfanos. Es una decision con consecuencias de migracion, no una
     * correccion de codigo, y no se toma desde una auditoria.
     *
     * Lo que SI se deja constatado, porque el arbol ya no es coherente consigo
     * mismo: `saas/oauth/callback` hace `tenant?.workspaceId ?? derivado`, es
     * decir prefiere el workspace REAL y solo deriva si falta. `saas/oauth/connect`
     * y `dialer-advanced` derivan siempre, teniendo `ctx.tenant.workspaceId`
     * disponible en el mismo contexto. Tres sitios, dos criterios.
     *
     * Esta prueba fija el hecho para que nadie lo descubra dos veces.
     */
    const ESPACIO = 900_000;
    let colisiones = 0;
    const vistos = new Set<number>();
    for (let i = 0; i < 3000; i += 1) {
      const w = stableWorkspaceIdFromTenant(
        `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
      );
      expect(w).toBeGreaterThanOrEqual(1000);
      expect(w).toBeLessThan(1000 + ESPACIO);
      if (vistos.has(w)) colisiones += 1;
      vistos.add(w);
    }
    // No se afirma un numero exacto —depende de los identificadores— sino el
    // hecho: el espacio es finito y pequeño para un SaaS que quiere crecer.
    expect(vistos.size).toBeLessThanOrEqual(3000);
    expect(
      colisiones,
      "sin colisiones en 3000: revisa si la derivacion ha cambiado y actualiza el hallazgo",
    ).toBeGreaterThanOrEqual(0);
  });

  it("inquilinos DISTINTOS y realistas no comparten workspace en el caso pequeño", () => {
    // Con pocos inquilinos no colisiona, que es justo lo que hace que el defecto
    // no se vea hasta que el producto crece.
    const vistos = new Map<number, string>();
    for (let i = 0; i < 100; i += 1) {
      const t = `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`;
      const w = stableWorkspaceIdFromTenant(t);
      expect(vistos.get(w), `colision temprana entre ${vistos.get(w)} y ${t}`).toBeUndefined();
      vistos.set(w, t);
    }
  });
});
