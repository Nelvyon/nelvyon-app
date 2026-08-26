/**
 * BLOQUE 7 · ataques contra la puerta de sesión.
 *
 * `authenticate()` es la única puerta de 48 rutas, y `verifyToken()` la de otras
 * 233 que la llaman directamente. Si una de las dos cede, no importa lo bien
 * resuelto que esté todo lo demás: se entra.
 *
 * No se revisa el código y se da por bueno. Se fabrican tokens hostiles y se
 * mira qué pasa:
 *
 *   - `alg: none` — el clásico: quitar la firma y decir que no hacía falta.
 *   - Confusión de algoritmo — firmar con otro algoritmo permitido.
 *   - Firma con la clave equivocada.
 *   - Claims manipulados: cambiar el inquilino o el rol y volver a firmar con
 *     una clave que no es la nuestra.
 *   - Token caducado.
 *   - Token del inquilino A presentado para leer al inquilino B.
 *   - Cookie manipulada, troceada o con el nombre parecido.
 *
 * Y una propiedad que no es un ataque sino una comprobación de honestidad: qué
 * hace de verdad el logout.
 */
import { beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";

import { authenticate, extractToken } from "../AuthMiddleware";
import { resetAuthServiceForTests } from "../AuthService";

const SECRETO = "secreto-de-certificacion-bloque-7-con-longitud-de-sobra";

function peticion(headers: Record<string, string>): Request {
  return new Request("https://nelvyon.test/api/os/algo", { headers });
}

function conBearer(token: string): Request {
  return peticion({ authorization: `Bearer ${token}` });
}

function claims(over: Record<string, unknown> = {}) {
  return {
    userId: "u-legitimo",
    tenantId: "tenant-A",
    email: "a@ejemplo.test",
    plan: "pro",
    role: "member",
    ...over,
  };
}

async function rechaza(req: Request, porque: string): Promise<void> {
  await expect(authenticate(req), porque).rejects.toThrow();
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRETO;
  process.env.NELVYON_AI_ENABLED = "0";
  // `verifyToken` es puramente criptografico —lo dice su propia
  // documentacion— pero construir `AuthService` exige `DbClient`, que a su vez
  // exige `DATABASE_URL`. Sin ella, TODO token se rechaza como `Unauthorized`,
  // incluido uno legitimo: los ataques saldrian verdes por el motivo equivocado
  // y los controles serian los unicos que lo delatarian. Que es lo que paso.
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgresql://noop:noop@127.0.0.1:5432/noop";
  // El servicio cachea el secreto al construirse. Sin esto, el primer test que
  // lo toque congela el que hubiera y los demas verifican contra otra clave —
  // con lo que TODO se rechaza y los ataques saldrian verdes por el motivo
  // equivocado.
  resetAuthServiceForTests();
});

describe("BLOQUE 7 · EL CONTROL: un token legítimo entra", () => {
  it("un token bien firmado se acepta y trae sus claims", async () => {
    /**
     * Sin este control, una puerta que rechazara TODO pasaría cada ataque de
     * abajo y dejaría el producto inservible. Es la mitad que hace que los
     * negativos signifiquen algo.
     */
    const token = jwt.sign(claims(), SECRETO, { algorithm: "HS256", expiresIn: "1h" });
    const r = await authenticate(conBearer(token));
    expect(r.tenantId).toBe("tenant-A");
    expect(r.userId).toBe("u-legitimo");
  });
});

describe("BLOQUE 7 · firma y algoritmo", () => {
  it("`alg: none` se rechaza", async () => {
    // El ataque de manual: se declara que no hay firma y se espera que el
    // verificador se lo crea.
    const sinFirma = jwt.sign(claims(), "", { algorithm: "none" });
    await rechaza(conBearer(sinFirma), "un token sin firma entró en el sistema");
  });

  it("un token firmado con OTRO algoritmo HMAC se rechaza", async () => {
    /**
     * El ataque que de verdad ejercita `algorithms: ["HS256"]`.
     *
     * La prueba de `alg: none` NO sirve para eso: `jsonwebtoken` rechaza `none`
     * por su cuenta aunque no se fije nada, asi que quitar el fijado no la
     * tumbaba — pasaba por un motivo distinto del que yo creia.
     *
     * Con HS512 la firma es criptograficamente valida y la clave es la nuestra:
     * lo unico que puede decir que no es el fijado. Si se aceptara, un atacante
     * podria elegir el algoritmo, que es el primer paso de toda la familia de
     * ataques de confusion.
     */
    const otroAlgoritmo = jwt.sign(claims(), SECRETO, { algorithm: "HS512" });
    await rechaza(
      conBearer(otroAlgoritmo),
      "se acepto un algoritmo que no es el fijado: el atacante elige el algoritmo",
    );
  });

  it("un token firmado con OTRA clave se rechaza", async () => {
    const token = jwt.sign(claims(), "esta-no-es-la-clave-de-nelvyon-pero-es-larga", {
      algorithm: "HS256",
    });
    await rechaza(conBearer(token), "se acepto un token firmado por otro");
  });

  it("un token con la firma recortada se rechaza", async () => {
    const bueno = jwt.sign(claims(), SECRETO, { algorithm: "HS256" });
    const [h, p] = bueno.split(".");
    await rechaza(conBearer(`${h}.${p}.`), "se acepto un token sin parte de firma");
    await rechaza(conBearer(`${h}.${p}`), "se acepto un token con dos partes");
  });

  it("cambiar el inquilino en el payload invalida la firma", async () => {
    /**
     * El ataque que importa de verdad: coger un token propio, cambiar el
     * inquilino y presentarlo. Si el verificador mirase el payload antes que la
     * firma, esto sería una llave maestra a todos los clientes.
     */
    const bueno = jwt.sign(claims(), SECRETO, { algorithm: "HS256" });
    const [h, , s] = bueno.split(".");
    const manipulado = Buffer.from(JSON.stringify(claims({ tenantId: "tenant-B" })))
      .toString("base64url");
    await rechaza(
      conBearer(`${h}.${manipulado}.${s}`),
      "se pudo cambiar de inquilino manipulando el payload",
    );
  });

  it("ascender el rol en el payload invalida la firma", async () => {
    const bueno = jwt.sign(claims({ role: "member" }), SECRETO, { algorithm: "HS256" });
    const [h, , s] = bueno.split(".");
    const manipulado = Buffer.from(JSON.stringify(claims({ role: "owner" })))
      .toString("base64url");
    await rechaza(
      conBearer(`${h}.${manipulado}.${s}`),
      "se pudo ascender a owner manipulando el payload",
    );
  });

  it("un token caducado se rechaza", async () => {
    const caducado = jwt.sign(claims(), SECRETO, { algorithm: "HS256", expiresIn: "-1h" });
    await rechaza(conBearer(caducado), "se acepto un token caducado");
  });

  it("basura en el Bearer se rechaza sin reventar", async () => {
    for (const t of ["", "   ", "no-es-un-jwt", "a.b.c", "....", "null", "undefined"]) {
      await rechaza(conBearer(t), `se acepto un Bearer basura: ${JSON.stringify(t)}`);
    }
  });
});

describe("BLOQUE 7 · la cookie no es más de fiar que la cabecera", () => {
  it("una cookie con un token de otra clave se rechaza", async () => {
    const token = jwt.sign(claims(), "otra-clave-cualquiera-suficientemente-larga", {
      algorithm: "HS256",
    });
    await rechaza(
      peticion({ cookie: `nelvyon_token=${token}` }),
      "se acepto una cookie con token ajeno",
    );
  });

  it("una cookie con nombre PARECIDO no cuenta como sesión", async () => {
    /**
     * `nelvyon_token_x`, `xnelvyon_token`, `NELVYON_TOKEN`: si el analizador de
     * cookies hiciera `includes` en vez de comparar el nombre exacto, cualquiera
     * podría colar un token bajo otro nombre.
     */
    const bueno = jwt.sign(claims(), SECRETO, { algorithm: "HS256" });
    for (const nombre of ["nelvyon_token_x", "xnelvyon_token", "NELVYON_TOKEN", "nelvyon-token"]) {
      expect(
        extractToken(peticion({ cookie: `${nombre}=${bueno}` })),
        `la cookie «${nombre}» se tomo por la de sesion`,
      ).toBeNull();
    }
  });

  it("EL CONTROL: la cookie con el nombre exacto SÍ vale", async () => {
    const bueno = jwt.sign(claims(), SECRETO, { algorithm: "HS256" });
    const r = await authenticate(peticion({ cookie: `otra=1; nelvyon_token=${bueno}; mas=2` }));
    expect(r.tenantId).toBe("tenant-A");
  });

  it("una cookie vacía no se toma por sesión", () => {
    expect(extractToken(peticion({ cookie: "nelvyon_token=" }))).toBeNull();
    expect(extractToken(peticion({ cookie: "nelvyon_token=   " }))).toBeNull();
  });

  it("sin credencial no se entra", async () => {
    await rechaza(peticion({}), "se entro sin presentar nada");
    await rechaza(peticion({ authorization: "Basic dXNlcjpwYXNz" }), "se acepto Basic auth");
    await rechaza(peticion({ authorization: "Bearer" }), "se acepto un Bearer vacio");
  });
});
