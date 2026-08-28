/**
 * BLOQUE 7 · terminar el flujo de OAuth de otro.
 *
 * Cinco proveedores (Google, Meta, LinkedIn, TikTok, Snapchat) tienen la misma
 * pareja de rutas: una que arranca el flujo y otra que lo recoge. La que arranca
 * exige sesión y firma un `state` con el `userId`. La que recoge **no exige
 * nada**: coge `state` de la URL, comprueba la firma, y guarda los tokens del
 * proveedor a nombre de `parsed.userId`.
 *
 * El `state` está bien hecho —HMAC-SHA256, comparación en tiempo constante,
 * caducidad de diez minutos— y por eso nadie puede fabricar uno con el `userId`
 * de otro. Pero eso responde a la pregunta equivocada. El `state` firmado prueba
 * **quién empezó** el flujo. No prueba **quién lo está terminando**.
 *
 * El ataque, que es de manual y tiene treinta años:
 *
 *   1. El atacante entra en SU cuenta de NELVYON y arranca el flujo. Obtiene una
 *      URL de consentimiento de Google que lleva SU `state`, firmado y válido.
 *   2. Le manda esa URL a la víctima.
 *   3. La víctima, que está en su Google, aprueba.
 *   4. Google redirige al callback de NELVYON con el `code` de LA VÍCTIMA y el
 *      `state` DEL ATACANTE.
 *   5. NELVYON canjea el código —obtiene los tokens de Google de la víctima— y
 *      los guarda bajo `parsed.userId`, que es **el atacante**.
 *
 * Resultado: la cuenta de Google Ads de la víctima queda conectada dentro de la
 * cuenta NELVYON del atacante, que puede gastar su presupuesto publicitario.
 *
 * Lo que falta no es más firma: es atar el flujo al NAVEGADOR que lo empezó. Y
 * no vale con exigir sesión en el callback, aunque sería lo primero que uno
 * piensa: la cookie de sesión de NELVYON es `sameSite: "strict"` y **no viaja**
 * en el redirect que llega desde Google. Exigirla ahí rompería los cinco flujos
 * legítimos. Hace falta una cookie propia, `lax`, puesta al arrancar.
 */
import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MAX_AGE_NONCE_SEG,
  NONCE_COOKIE,
  crearEstadoOAuth,
  parseOAuthState,
  verificarNonceDelNavegador,
} from "../oauthState";

const SECRETO = "secreto-hmac-de-certificacion-bloque-7-con-longitud-de-sobra";
const previo = { ...process.env };

beforeEach(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  process.env = { ...previo };
});

/** El callback tal y como llega desde el proveedor: una GET con cookies. */
function callback(state: string, cookie?: string): Request {
  return new Request(
    `https://nelvyon.test/api/oauth/google/callback?code=abc&state=${encodeURIComponent(state)}`,
    cookie ? { headers: { cookie } } : undefined,
  );
}

describe("BLOQUE 7 · EL CONTROL: el flujo normal sigue funcionando", () => {
  it("quien empieza el flujo lo termina", () => {
    /**
     * Sin este control, una comprobación que rechazara todo pasaría el ataque de
     * abajo y dejaría a los cinco proveedores imposibles de conectar — que es
     * media funcionalidad de publicidad del producto.
     */
    const { state, nonce } = crearEstadoOAuth("u-legitimo");
    const parsed = parseOAuthState(state);
    expect(parsed?.userId).toBe("u-legitimo");
    expect(
      verificarNonceDelNavegador(callback(state, `${NONCE_COOKIE}=${nonce}`), parsed!),
      "el flujo legitimo se rechazo",
    ).toBe(true);
  });

  it("la cookie del nonce vive poco y no la lee el navegador", () => {
    // Larga no sirve de nada y amplía la ventana; legible por JavaScript la
    // pondría al alcance de cualquier XSS.
    expect(MAX_AGE_NONCE_SEG).toBeLessThanOrEqual(15 * 60);
    expect(MAX_AGE_NONCE_SEG).toBeGreaterThan(0);
  });
});

describe("BLOQUE 7 · el navegador de la víctima no lleva el nonce del atacante", () => {
  it("SIN la cookie, un `state` perfectamente firmado NO vale", () => {
    /**
     * El ataque. El `state` es auténtico —lo emitió NELVYON para el atacante,
     * la firma verifica y no ha caducado— pero llega desde un navegador que
     * nunca arrancó ese flujo, así que no lleva la cookie.
     */
    const { state } = crearEstadoOAuth("u-atacante");
    const parsed = parseOAuthState(state);
    expect(parsed?.userId).toBe("u-atacante"); // la firma es buena, no es eso
    expect(
      verificarNonceDelNavegador(callback(state), parsed!),
      "se completo un flujo de OAuth desde un navegador que no lo empezo",
    ).toBe(false);
  });

  it("con OTRA cookie tampoco", () => {
    const { state } = crearEstadoOAuth("u-atacante");
    const { nonce: otro } = crearEstadoOAuth("u-atacante");
    const parsed = parseOAuthState(state);
    expect(
      verificarNonceDelNavegador(callback(state, `${NONCE_COOKIE}=${otro}`), parsed!),
      "valio el nonce de otro flujo distinto",
    ).toBe(false);
  });

  it("una cookie vacía, en blanco o con nombre parecido no cuenta", () => {
    const { state, nonce } = crearEstadoOAuth("u-atacante");
    const parsed = parseOAuthState(state);
    for (const c of [
      `${NONCE_COOKIE}=`,
      `${NONCE_COOKIE}=   `,
      `${NONCE_COOKIE}x=${nonce}`,
      `x${NONCE_COOKIE}=${nonce}`,
      `otra=${nonce}`,
    ]) {
      expect(
        verificarNonceDelNavegador(callback(state, c), parsed!),
        `colo la cookie ${JSON.stringify(c)}`,
      ).toBe(false);
    }
  });

  it("un prefijo del nonce no vale", () => {
    // Si la comparación aceptara prefijos, el nonce se reconstruiría a trozos.
    const { state, nonce } = crearEstadoOAuth("u-atacante");
    const parsed = parseOAuthState(state);
    for (let i = 1; i < nonce.length; i += 7) {
      expect(
        verificarNonceDelNavegador(
          callback(state, `${NONCE_COOKIE}=${nonce.slice(0, i)}`),
          parsed!,
        ),
        `colo un prefijo de ${i}`,
      ).toBe(false);
    }
  });
});

describe("BLOQUE 7 · lo que el `state` ya hacía bien y no se puede perder", () => {
  it("un `state` sin firma o con firma ajena se rechaza", () => {
    const { state } = crearEstadoOAuth("u-legitimo");
    const [data] = state.split(".");
    expect(parseOAuthState(`${data}.firma-inventada`)).toBeNull();
    expect(parseOAuthState(data)).toBeNull();
    expect(parseOAuthState("")).toBeNull();
    expect(parseOAuthState(null)).toBeNull();
  });

  it("cambiar el `userId` invalida la firma", () => {
    /**
     * La dirección contraria del ataque: si la carga se pudiera reescribir, el
     * atacante pondría el `userId` de la víctima y le colgaría SU cuenta de
     * Google — que es la otra mitad del mismo problema.
     */
    const { state } = crearEstadoOAuth("u-legitimo");
    const [, sig] = state.split(".");
    const otra = Buffer.from(
      JSON.stringify({ userId: "u-victima", ts: Date.now(), nonce: "x" }),
    ).toString("base64url");
    expect(parseOAuthState(`${otra}.${sig}`)).toBeNull();
  });

  it("un `state` de hace media hora se rechaza", () => {
    const viejo = Buffer.from(
      JSON.stringify({ userId: "u", ts: Date.now() - 30 * 60 * 1000, nonce: "x" }),
    ).toString("base64url");
    // Firmado DE VERDAD con la clave real: lo único caducado es el tiempo.
    const sig = createHmac("sha256", SECRETO).update(viejo).digest("base64url");
    expect(parseOAuthState(`${viejo}.${sig}`)).toBeNull();
  });

  it("sin clave configurada no se firma ni se acepta nada", () => {
    delete process.env.JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.TRACKING_SECRET;
    expect(() => crearEstadoOAuth("u")).toThrow();
    expect(parseOAuthState("a.b")).toBeNull();
  });
});
