/**
 * BLOQUE 7 · la clave de API como credencial.
 *
 * `requirePublicApiContext` es la puerta de la superficie pública: las rutas por
 * las que un cliente automatiza contra NELVYON, sin sesión, sin navegador y sin
 * nadie mirando. Una clave de API es una credencial de las peores de manejar —no
 * caduca sola, vive en ficheros de configuración y en variables de entorno de
 * terceros, y se copia— así que las preguntas son distintas de las de una
 * sesión:
 *
 *   1. ¿Revocar revoca DE VERDAD, o solo lo dice?
 *   2. ¿Caducar caduca?
 *   3. ¿Puede una clave hacer más de lo que le corresponde?
 *   4. ¿Se guarda la clave en algún sitio donde no debería estar?
 *
 * La cuarta es la que destapó algo. `keyId` se calcula como
 * `rawKey.slice(0, 20)` —`nlv_` más DIECISÉIS caracteres hexadecimales de la
 * clave viva— y de ahí viaja a `logUsage(...)`, que lo persiste, y al rastro de
 * auditoría de MCP como identificador de usuario y de clave.
 *
 * El propio servicio ya guarda un `key_prefix` de DOCE caracteres para enseñarlo
 * en la interfaz: la casa ya había decidido cuánta clave es enseñable, y el
 * limitador de uso cortaba ocho caracteres más por su cuenta. No es explotable
 * —quedan 128 bits— pero es un trozo de una credencial viva en los registros,
 * visible para cualquiera que los lea, y más de lo que la propia interfaz
 * enseña. La identidad estable de una clave existe y es su `id`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Fila = {
  id: string;
  tenant_id: string;
  scopes: string[];
  active: boolean;
  revoked_at: string | null;
  expires_at: string | null;
  key_prefix: string;
};

const CLAVE_BUENA = "nlv_" + "a1b2c3d4".repeat(6); // 4 + 48, como las de verdad
const CLAVE_REVOCADA = "nlv_" + "f9e8d7c6".repeat(6);

const FILAS: Record<string, Fila> = {};

vi.mock("../../../../../backend/saas/SaasApiKeysService", () => ({
  getSaasApiKeysService: () => ({
    async verifyKey(raw: string) {
      const f = FILAS[raw];
      if (!f) return null;
      if (!f.active || f.revoked_at) return null;
      if (f.expires_at && new Date(f.expires_at) < new Date()) return null;
      return { tenantId: f.tenant_id, scopes: f.scopes, keyId: f.id, keyPrefix: f.key_prefix };
    },
  }),
}));

vi.mock("../../../../../backend/db/contextoDeInquilino", () => ({
  entrarConInquilino: vi.fn(),
}));

import { requirePublicApiContext } from "../requirePublicApiContext";
import { resetRateLimitForTests } from "../../../../../backend/saas/requirePublicApiContext";

function conClave(raw: string): Request {
  return new Request("https://nelvyon.test/api/public/v1/contacts", {
    headers: { authorization: `Bearer ${raw}` },
  });
}

function fila(over: Partial<Fila> = {}): Fila {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "tenant-A",
    scopes: ["contacts.read"],
    active: true,
    revoked_at: null,
    expires_at: null,
    key_prefix: CLAVE_BUENA.slice(0, 12),
    ...over,
  };
}

beforeEach(() => {
  for (const k of Object.keys(FILAS)) delete FILAS[k];
  FILAS[CLAVE_BUENA] = fila();
  resetRateLimitForTests();
});

afterEach(() => {
  resetRateLimitForTests();
});

describe("BLOQUE 7 · EL CONTROL: una clave buena entra", () => {
  it("con el ámbito correcto se pasa", async () => {
    /**
     * Sin este control, una puerta que rechazara todo pasaría cada ataque de
     * abajo y dejaría inservible toda la API pública — que es por donde los
     * clientes integran NELVYON con lo demás.
     */
    const r = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.read");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ctx.tenantId).toBe("tenant-A");
  });
});

describe("BLOQUE 7 · revocar tiene que revocar", () => {
  it("una clave revocada NO entra", async () => {
    /**
     * Es la promesa que más se rompe en los productos: el botón de revocar
     * marca una fila y la comprobación no la mira. Aquí se comprueba que sí.
     */
    FILAS[CLAVE_REVOCADA] = fila({ revoked_at: new Date().toISOString() });
    const r = await requirePublicApiContext(conClave(CLAVE_REVOCADA), "contacts.read");
    expect(r.ok, "una clave revocada siguio funcionando").toBe(false);
  });

  it("una clave desactivada NO entra", async () => {
    FILAS[CLAVE_REVOCADA] = fila({ active: false });
    expect((await requirePublicApiContext(conClave(CLAVE_REVOCADA), "contacts.read")).ok).toBe(false);
  });

  it("una clave caducada NO entra", async () => {
    FILAS[CLAVE_REVOCADA] = fila({ expires_at: new Date(Date.now() - 1000).toISOString() });
    expect(
      (await requirePublicApiContext(conClave(CLAVE_REVOCADA), "contacts.read")).ok,
      "una clave caducada siguio funcionando",
    ).toBe(false);
  });

  it("una clave que no existe no entra, y tampoco revienta", async () => {
    for (const t of ["", "   ", "nlv_", "nlv_0000", "no-es-una-clave", "null"]) {
      const r = await requirePublicApiContext(conClave(t), "contacts.read");
      expect(r.ok, `colo ${JSON.stringify(t)}`).toBe(false);
    }
  });

  it("sin cabecera, o con otro esquema, no se entra", async () => {
    const sin = new Request("https://nelvyon.test/api/public/v1/contacts");
    expect((await requirePublicApiContext(sin, "contacts.read")).ok).toBe(false);
    const basic = new Request("https://nelvyon.test/api/public/v1/contacts", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect((await requirePublicApiContext(basic, "contacts.read")).ok).toBe(false);
  });
});

describe("BLOQUE 7 · una clave no puede hacer más de lo suyo", () => {
  it("una clave de solo lectura no escribe", async () => {
    const r = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.write");
    expect(r.ok, "una clave de lectura ejecuto una operacion de escritura").toBe(false);
  });

  it("un ámbito que no existe se deniega", async () => {
    // Lo que no está permitido está prohibido — también cuando lo que falta es
    // el propio nombre del permiso. Si un ámbito desconocido se permitiera, una
    // ruta nueva que se equivocara de nombre quedaría abierta de par en par.
    const r = await requirePublicApiContext(conClave(CLAVE_BUENA), "ambito.que.no.existe");
    expect(r.ok).toBe(false);
  });
});

describe("BLOQUE 7 · dónde acaba la clave", () => {
  it("el identificador que se propaga NO contiene un trozo de la clave", async () => {
    /**
     * El hallazgo. `ctx.keyId` viaja a `logUsage(...)`, que lo persiste, y al
     * rastro de auditoría de MCP. Si es una rebanada de la clave viva, NELVYON
     * está guardando parte de una credencial en sus propios registros — y más
     * parte de la que enseña su propia interfaz, que muestra doce caracteres.
     */
    const r = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.read");
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const secreto = CLAVE_BUENA.slice(4); // lo que hay despues del prefijo `nlv_`
    expect(
      r.ctx.keyId.includes(secreto.slice(0, 8)),
      `el identificador propagado lleva un trozo de la clave viva: ${r.ctx.keyId}`,
    ).toBe(false);
    expect(
      CLAVE_BUENA.includes(r.ctx.keyId),
      "el identificador propagado ES un prefijo literal de la clave",
    ).toBe(false);
  });

  it("el identificador es estable y distingue una clave de otra", async () => {
    // No basta con que no sea la clave: tiene que servir para lo que servía,
    // que es contar uso y limitar por clave. Un identificador constante uniría
    // los contadores de todas.
    FILAS[CLAVE_REVOCADA] = fila({ id: "22222222-2222-4222-8222-222222222222" });
    const a = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.read");
    const b = await requirePublicApiContext(conClave(CLAVE_REVOCADA), "contacts.read");
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.ctx.keyId).not.toBe(b.ctx.keyId);
  });
});

describe("BLOQUE 7 · el límite de uso", () => {
  it("pasado el minuto de cuota se responde 429", async () => {
    let ultima = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.read");
    for (let i = 0; i < 70 && ultima.ok; i++) {
      ultima = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.read");
    }
    expect(ultima.ok, "el limite de uso nunca se alcanzo").toBe(false);
    if (!ultima.ok) expect(ultima.response.status).toBe(429);
  });

  it("el gasto de una clave NO consume la cuota de otra", async () => {
    /**
     * Si el limitador agrupara dos claves distintas bajo el mismo cubo, un
     * cliente ruidoso dejaría a otro sin API sin tocarle nada. Es aislamiento
     * entre inquilinos por la puerta de atrás.
     */
    FILAS[CLAVE_REVOCADA] = fila({
      id: "33333333-3333-4333-8333-333333333333",
      tenant_id: "tenant-B",
    });
    let r = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.read");
    for (let i = 0; i < 70 && r.ok; i++) {
      r = await requirePublicApiContext(conClave(CLAVE_BUENA), "contacts.read");
    }
    expect(r.ok).toBe(false); // la primera ya esta agotada

    const otra = await requirePublicApiContext(conClave(CLAVE_REVOCADA), "contacts.read");
    expect(
      otra.ok,
      "agotar la cuota de una clave dejo sin API a la de otro inquilino",
    ).toBe(true);
  });
});
