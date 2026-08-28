/**
 * NOTA DE UBICACIÓN. Este test prueba `src/pages/api/os/ws.ts` pero NO puede
 * vivir a su lado. Next.js trata TODO fichero bajo `pages/api` como una ruta
 * de API y le exige un `export default` handler, incluidos los de `__tests__`.
 * Con el test ahí, `next build` fallaba con TS2344 en `.next/types/validator.ts`
 * y el árbol entero era indesplegable. Lo vigila `puerta-de-build.mjs`.
 */
/**
 * BLOQUE 7 · el canal en vivo de otro inquilino.
 *
 * `/api/os/ws` levanta el WebSocket por el que el panel de ejecución recibe los
 * eventos de sus trabajos en tiempo real. El navegador se conecta así:
 *
 *     wss://app.nelvyon.com/api/os/ws?clientId=${tenantId}
 *
 * El `clientId` **es el identificador del inquilino** —lo pasa el propio
 * frontend— y la subida de conexión lo cogía de la barra de direcciones y lo
 * registraba. Sin cookie, sin token, sin comprobar nada.
 *
 * Dos cosas salían de ahí, y la segunda es peor que la primera:
 *
 *   1. Quien conociera el id de un inquilino recibía TODOS sus eventos de
 *      ejecución: qué agentes corre, qué entregables produce, cuándo.
 *   2. `registerClient` **cierra la conexión anterior** del mismo `clientId`.
 *      Así que el atacante no solo escucha: echa a la víctima de su propio canal
 *      y se queda con él.
 *
 * Todo eso sin cuenta en NELVYON.
 *
 * Para poder certificarlo hubo que sacar la decisión del oyente de `upgrade` a
 * una función propia. Una defensa que no se puede llamar desde una prueba es una
 * defensa que no se puede certificar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const SECRETO = "secreto-de-certificacion-bloque-7-con-longitud-de-sobra";

vi.mock("@nelvyon/os-agents", () => ({
  getWsNotifierSingleton: () => ({ registerClient: vi.fn(), unregisterClient: vi.fn() }),
  initOsNotifier: vi.fn(),
  osEventBus: {},
  OsAgentError: class extends Error {},
}));

import { resolverClienteDeWs } from "@/pages/api/os/ws";

const TENANT_A = "aaaaaaaa-1111-4111-8111-111111111111";
const TENANT_B = "bbbbbbbb-2222-4222-8222-222222222222";

function token(tenantId: string, over: Record<string, unknown> = {}): string {
  return jwt.sign(
    { userId: "u-1", tenantId, email: "a@ejemplo.test", plan: "pro", ...over },
    SECRETO,
    { algorithm: "HS256", expiresIn: "1h" },
  );
}

function url(clientId: string): string {
  return `/api/os/ws?clientId=${encodeURIComponent(clientId)}`;
}

beforeEach(async () => {
  process.env.JWT_SECRET = SECRETO;
  process.env.NELVYON_AI_ENABLED = "0";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgresql://noop:noop@127.0.0.1:5432/noop";
  // El servicio cachea el secreto al construirse, y hay que reiniciarlo POR EL
  // MISMO ESPECIFICADOR que usa el codigo bajo prueba.
  //
  // `ws.ts` hace `await import("@nelvyon/auth")`. Reiniciar por la ruta relativa
  // `backend/auth/AuthService` puede tocar OTRA instancia del modulo, con lo que
  // el singleton que de verdad se usa conserva el secreto que cacheo primero — y
  // el control positivo pasa o falla segun que fichero del worker cargara antes.
  // Aparecio como un fallo intermitente en una de cuatro ejecuciones completas.
  const { resetAuthServiceForTests } = await import("@nelvyon/auth");
  resetAuthServiceForTests();
});

describe("BLOQUE 7 · EL CONTROL: el panel legítimo se conecta", () => {
  it("con su cookie y su propio inquilino, la conexión se acepta", async () => {
    /**
     * Sin este control, una comprobación que rechazara todo pasaría cada ataque
     * de abajo y dejaría el panel de ejecución sin eventos en vivo — una avería
     * silenciosa, porque la página seguiría cargando.
     */
    const r = await resolverClienteDeWs(url(TENANT_A), `nelvyon_token=${token(TENANT_A)}`);
    expect(r.ok, "ok" in r ? "" : (r as { motivo: string }).motivo).toBe(true);
    if (r.ok) expect(r.clientId).toBe(TENANT_A);
  });
});

describe("BLOQUE 7 · escuchar el canal de otro", () => {
  it("SIN cookie no se conecta, aunque el `clientId` exista", async () => {
    /**
     * El ataque tal cual: `wss://.../api/os/ws?clientId=<inquilino-de-la-victima>`
     * desde cualquier sitio. Es una línea de JavaScript.
     */
    const r = await resolverClienteDeWs(url(TENANT_B), undefined);
    expect(r.ok, "un anonimo se suscribio al canal en vivo de un inquilino").toBe(false);
  });

  it("con la cookie de A no se escucha el canal de B", async () => {
    // Autenticado, pero de otro inquilino: es el mismo cruce que en el panel,
    // por una puerta distinta.
    const r = await resolverClienteDeWs(url(TENANT_B), `nelvyon_token=${token(TENANT_A)}`);
    expect(r.ok, "el inquilino A se suscribio al canal de B").toBe(false);
  });

  it("un token de otra clave no vale", async () => {
    const ajeno = jwt.sign({ userId: "u", tenantId: TENANT_B }, "otra-clave-cualquiera-larga", {
      algorithm: "HS256",
    });
    const r = await resolverClienteDeWs(url(TENANT_B), `nelvyon_token=${ajeno}`);
    expect(r.ok, "se acepto un token firmado por otro").toBe(false);
  });

  it("un token caducado no vale", async () => {
    const viejo = jwt.sign({ userId: "u", tenantId: TENANT_A }, SECRETO, {
      algorithm: "HS256",
      expiresIn: "-1h",
    });
    const r = await resolverClienteDeWs(url(TENANT_A), `nelvyon_token=${viejo}`);
    expect(r.ok, "se acepto un token caducado").toBe(false);
  });

  it("una cookie con nombre parecido no cuenta como sesión", async () => {
    // El mismo defecto que se buscó en la puerta de sesión: comparar el nombre
    // de la cookie con `includes` deja colar un token bajo otro nombre.
    for (const nombre of ["nelvyon_token_x", "xnelvyon_token", "NELVYON_TOKEN", "nelvyon-token"]) {
      const r = await resolverClienteDeWs(url(TENANT_A), `${nombre}=${token(TENANT_A)}`);
      expect(r.ok, `la cookie «${nombre}» se tomo por la de sesion`).toBe(false);
    }
  });

  it("sin `clientId`, o con basura, no se conecta", async () => {
    for (const c of ["", "   ", "undefined", "null"]) {
      const r = await resolverClienteDeWs(url(c), `nelvyon_token=${token(TENANT_A)}`);
      expect(r.ok, `colo un clientId ${JSON.stringify(c)}`).toBe(false);
    }
    const sinParam = await resolverClienteDeWs("/api/os/ws", `nelvyon_token=${token(TENANT_A)}`);
    expect(sinParam.ok).toBe(false);
  });

  it("una URL que no es la del canal no se atiende", async () => {
    const r = await resolverClienteDeWs("/api/otra/cosa?clientId=" + TENANT_A, `nelvyon_token=${token(TENANT_A)}`);
    expect(r.ok).toBe(false);
  });
});

describe("BLOQUE 7 · echar a la víctima de su propio canal", () => {
  it("un desconocido no puede provocar el cierre de la conexión de otro", async () => {
    /**
     * `registerClient` cierra la conexión anterior del mismo `clientId`. Mientras
     * la subida de conexión no comprobara nada, cualquiera podía conectarse con
     * el inquilino de la víctima y dejarla sin eventos en vivo — sabotaje que
     * además parece una avería del producto.
     *
     * Que la resolución falle es lo que impide llegar a `registerClient`.
     */
    const intentos = [
      await resolverClienteDeWs(url(TENANT_A), undefined),
      await resolverClienteDeWs(url(TENANT_A), "otra=1"),
      await resolverClienteDeWs(url(TENANT_A), `nelvyon_token=`),
      await resolverClienteDeWs(url(TENANT_A), `nelvyon_token=basura`),
    ];
    for (const r of intentos) {
      expect(r.ok, "un intento sin sesion valida llego a registrar el cliente").toBe(false);
    }
  });
});
