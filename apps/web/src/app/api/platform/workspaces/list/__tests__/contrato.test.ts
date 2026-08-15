import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Contrato de `GET /api/platform/workspaces/list`.
 *
 * EL FALLO QUE ESTO IMPIDE
 * ------------------------
 * En producción la ruta devolvía 503 «No se pudo cargar el workspace» con un
 * usuario válido y el API sano. La causa era doble:
 *
 * 1. El API estaba limitando por error a los usuarios autenticados (defecto del
 *    limitador, corregido aparte) y respondía 429.
 * 2. Esta ruta no contemplaba el 429: `upstreamFailed()` lo considera falso, así
 *    que no intentaba el respaldo y caía al `return 503` final.
 *
 * Un 429 traducido a 503 no es un detalle: dice «el servicio está caído» cuando
 * lo cierto es «espera unos segundos», y manda a diagnosticar una avería
 * inexistente. Eso fue justo lo que pasó.
 *
 * Y quedaba un segundo defecto de contrato: un usuario que legítimamente no
 * tiene ningún workspace también recibía 503, porque la lista vacía sin
 * autocreación caía en la misma rama.
 *
 * LA LISTA VACÍA NO ES MAQUILLAJE
 * -------------------------------
 * `[]` se devuelve SOLO cuando el upstream contestó 200 con un array —o sea,
 * cuando sabemos que el usuario no tiene ninguno— y la autocreación falló por
 * una razón del cliente. Si el upstream falla de verdad, se sigue respondiendo
 * 503. Los dos casos se comprueban por separado más abajo.
 */

const claims = { userId: "u-1", email: "u@nelvyon.test", tenantId: "t-1" };

// Se sustituye la autenticacion en su origen (`@nelvyon/auth`) y no
// `requirePlatformClaims`: asi la ruta ejerce el codigo real de la frontera de
// autorizacion, que es parte de lo que se quiere certificar. Mockear la capa
// intermedia dejaria sin probar precisamente el `catch` que convertia cualquier
// error en 503.
vi.mock("@nelvyon/auth", () => ({
  authenticate: vi.fn(async () => claims),
}));

// `platformBffAuth` arrastra el servicio de administracion, que al cargarse
// intenta abrir conexion. Sin sustituirlo, el simple `import` de la ruta se
// quedaba colgado cinco segundos y el test moria por tiempo sin llegar a
// ejercitar nada.
vi.mock("@nelvyon/admin", () => ({
  getNelvyonAdminService: () => ({}),
}));

vi.mock("@/lib/platformFastApiProxy", () => ({
  platformApiBase: () => "http://api.interno",
  readSessionToken: vi.fn(async () => "un-token"),
}));

const dbListWorkspaces = vi.fn(async () => [] as unknown[]);
vi.mock("@/lib/platformDbFallback", () => ({
  dbListWorkspaces: (...a: unknown[]) => dbListWorkspaces(...(a as [])),
  platformDbFallbackEnabled: () => true,
}));

type Respuesta = { status: number; cuerpo?: unknown; cabeceras?: Record<string, string> };

/** Cola de respuestas del upstream, en el orden en que la ruta las pide. */
let cola: Respuesta[] = [];

function respuesta({ status, cuerpo, cabeceras }: Respuesta): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json", ...(cabeceras ?? {}) },
  });
}

beforeEach(() => {
  cola = [];
  dbListWorkspaces.mockResolvedValue([]);
  vi.stubGlobal("fetch", vi.fn(async () => {
    const siguiente = cola.shift();
    if (!siguiente) throw new Error("el upstream recibió más llamadas de las previstas");
    return respuesta(siguiente);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** El modulo se carga UNA vez, fuera del reloj de los tests.
 *
 * Cargarlo dentro del primer test lo hacia superar los cinco segundos y morir
 * por tiempo; peor aun, sus llamadas quedaban en vuelo y vaciaban la cola de
 * respuestas del test SIGUIENTE, que fallaba por una causa que no era la suya.
 */
let GET: (req: Request) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("../route"));
}, 120_000);

async function pedir() {
  return GET(new Request("http://web.local/api/platform/workspaces/list"));
}

describe("workspaces/list — contrato", () => {
  it("devuelve los workspaces del usuario", async () => {
    cola = [{ status: 200, cuerpo: [{ id: 3, name: "Mío" }] }];
    const res = await pedir();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 3, name: "Mío" }]);
  });

  it("propaga el límite de peticiones como 429, no como 503", async () => {
    // EL fallo de producción. Antes esto devolvía 503.
    cola = [{ status: 429, cabeceras: { "retry-after": "42" } }];
    const res = await pedir();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("propaga el 429 aunque llegue al crear", async () => {
    cola = [
      { status: 200, cuerpo: [] },
      { status: 429, cabeceras: { "retry-after": "7" } },
    ];
    const res = await pedir();
    expect(res.status).toBe(429);
  });

  it("un usuario sin workspaces recibe lista vacía, no 503", async () => {
    cola = [
      { status: 200, cuerpo: [] },
      { status: 400, cuerpo: { detail: "plan sin cupo" } },
      { status: 200, cuerpo: [] },
    ];
    const res = await pedir();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("mantiene el 503 cuando el upstream falla de verdad", async () => {
    // Control negativo del caso anterior: si `[]` se devolviera siempre, este
    // test pasaría igual y la corrección estaría ocultando una caída real.
    cola = [
      { status: 502 },
      { status: 502 },
      { status: 502 },
    ];
    const res = await pedir();
    expect(res.status).toBe(503);
  });

  it("usa el respaldo de base cuando el upstream cae y hay datos", async () => {
    dbListWorkspaces.mockResolvedValue([{ id: 9, name: "Desde base" }]);
    cola = [{ status: 500 }, { status: 500 }, { status: 500 }];
    const res = await pedir();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 9, name: "Desde base" }]);
  });

  it("sin sesión responde 401", async () => {
    cola = [{ status: 401 }];
    const res = await pedir();
    expect(res.status).toBe(401);
  });

  it("no filtra detalle interno en el 503", async () => {
    cola = [{ status: 500 }, { status: 500 }, { status: 500 }];
    const res = await pedir();
    const texto = JSON.stringify(await res.json()).toLowerCase();
    for (const rastro of ["stack", "sqlalchemy", "http://api.interno", "traceback", ".ts:"]) {
      expect(texto).not.toContain(rastro);
    }
  });
});
