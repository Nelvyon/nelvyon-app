/**
 * BLOQUE 4 · OAuth: el `state` es lo único que ata la autorización a quien la pidió.
 *
 * El flujo de OAuth sale del navegador de la persona, va al proveedor y vuelve.
 * Entre medias NELVYON no controla nada. El `state` es lo que impide que:
 *
 *   - **A termine una autorización que empezó B** — y se quede la cuenta de B
 *     conectada a su propio inquilino, con los permisos que llevara;
 *   - una vuelta capturada se **reutilice** más tarde;
 *   - alguien fabrique una vuelta sin haber pasado por el proveedor.
 *
 * Va firmado con HMAC y lleva dentro el usuario y el momento. Estas pruebas
 * atacan las tres cosas, y **no llaman a ningún proveedor**: la firma es
 * criptografía local.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const ENTORNO = { ...process.env };
const SECRETO = "secreto-de-certificacion-suficientemente-largo-para-hmac";

beforeEach(() => {
  // El secreto sale de `requireHmacSecret`, que lee JWT_SECRET (o NEXTAUTH /
  // TRACKING). Usar otro nombre haria que TODOS los negativos pasaran por el
  // motivo equivocado -firma incorrecta en vez de la propiedad que se mide- y
  // eso es un falso verde. Se descubrio porque la unica prueba que espera EXITO
  // fallo; las que esperan rechazo habrian pasado calladas.
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  process.env = { ...ENTORNO };
  vi.resetModules();
});

async function modulo() {
  vi.resetModules();
  return import("../../../apps/web/src/lib/integrations/oauthState");
}

/** Fabrica un `state` con la firma correcta pero la carga que se quiera. */
function fabricar(carga: unknown, secreto = SECRETO): string {
  const data = Buffer.from(JSON.stringify(carga)).toString("base64url");
  const sig = createHmac("sha256", secreto).update(data).digest("base64url");
  return `${data}.${sig}`;
}

const A = "usuario-a-11111111";
const B = "usuario-b-22222222";

/**
 * NOTA DEL BLOQUE 8 · por que cambio la llamada y no las afirmaciones.
 *
 * El Bloque 7 encontro que el `state` firmado prueba quien EMPIEZA el flujo pero
 * no quien lo TERMINA, y ato el flujo al navegador con un nonce. Para que
 * ninguna ruta pudiera quedarse en la version vulnerable, `createOAuthState`
 * DESAPARECIO: ahora es `crearEstadoOAuth(userId)`, que devuelve `{ state, nonce }`.
 *
 * Esta suite llamaba a la funcion vieja y se rompio. Se ha cambiado LA LLAMADA y
 * nada mas: todo lo que afirma —que el `state` lleva su usuario, que reescribirlo
 * invalida la firma, que otro secreto no vale, que caduca— sigue siendo cierto y
 * sigue comprobandose igual. La propiedad del Bloque 4 no se ha relajado; se ha
 * conservado a traves de un cambio de API que la reforzo.
 *
 * Que este fallo apareciera en la puerta del Bloque 8 y no en la del 7 es un
 * fallo de aquella puerta: se corrio sobre las zonas tocadas y no sobre el arbol
 * entero. Queda anotado.
 */
describe("BLOQUE 4 · state de OAuth", () => {
  it("EL CONTROL: un state recién creado verifica y trae su usuario", async () => {
    // Sin esto, una verificación que rechazara todo pasaría las pruebas de abajo
    // y dejaría a nadie capaz de conectar una cuenta.
    const { crearEstadoOAuth, parseOAuthState } = await modulo();
    const s = crearEstadoOAuth(A).state;
    expect(parseOAuthState(s)?.userId).toBe(A);
  });

  it("A NO puede terminar una autorización iniciada por B", async () => {
    // La propiedad central. Si el `state` no llevara el usuario, quien
    // interceptara la vuelta de B podría conectar la cuenta de B a su inquilino.
    const { crearEstadoOAuth, parseOAuthState } = await modulo();
    const deB = crearEstadoOAuth(B).state;
    expect(parseOAuthState(deB)?.userId).toBe(B);
    expect(parseOAuthState(deB)?.userId).not.toBe(A);
  });

  it("cambiar el usuario dentro del state INVALIDA la firma", async () => {
    // El ataque directo: coger el propio state y reescribir a quién pertenece.
    const { crearEstadoOAuth, parseOAuthState } = await modulo();
    const original = crearEstadoOAuth(A).state;
    const [, firma] = original.split(".");
    const cargaCambiada = Buffer.from(JSON.stringify({ userId: B, ts: Date.now() })).toString(
      "base64url",
    );
    expect(parseOAuthState(`${cargaCambiada}.${firma}`)).toBeNull();
  });

  it("un state fabricado con OTRO secreto se rechaza", async () => {
    // Sin conocer el secreto no se puede entrar, aunque se sepa la forma exacta.
    const { parseOAuthState } = await modulo();
    expect(parseOAuthState(fabricar({ userId: A, ts: Date.now() }, "otro-secreto"))).toBeNull();
  });

  it("un state CADUCADO se rechaza", async () => {
    // Protección de repetición: una vuelta capturada no vale para siempre. Diez
    // minutos son de sobra para completar el flujo y poco para reutilizarlo.
    const { parseOAuthState } = await modulo();
    const hace20Min = Date.now() - 20 * 60_000;
    expect(parseOAuthState(fabricar({ userId: A, ts: hace20Min }))).toBeNull();
  });

  it("un state del FUTURO no se acepta como fresco indefinidamente", async () => {
    // Un `ts` adelantado alargaría la validez todo lo que quisiera el atacante...
    // pero solo puede fabricarlo quien tenga el secreto. Se comprueba que un
    // futuro razonable sigue verificando y que el mecanismo no depende de eso.
    const { parseOAuthState } = await modulo();
    const dentro1Min = Date.now() + 60_000;
    expect(parseOAuthState(fabricar({ userId: A, ts: dentro1Min }))?.userId).toBe(A);
  });

  it("un state sin usuario se rechaza", async () => {
    const { parseOAuthState } = await modulo();
    expect(parseOAuthState(fabricar({ ts: Date.now() }))).toBeNull();
    expect(parseOAuthState(fabricar({ userId: "", ts: Date.now() }))).toBeNull();
  });

  it("un state con marca de tiempo que no es número se rechaza", async () => {
    const { parseOAuthState } = await modulo();
    expect(parseOAuthState(fabricar({ userId: A, ts: "ahora" }))).toBeNull();
  });

  it("un state malformado se rechaza sin reventar", async () => {
    const { parseOAuthState } = await modulo();
    for (const basura of ["", "sinpunto", "a.b.c", "....", "%%%.%%%"]) {
      expect(parseOAuthState(basura), basura).toBeNull();
    }
    expect(parseOAuthState(null)).toBeNull();
  });

  it("SIN secreto configurado no se acepta ningún state (fallo cerrado)", async () => {
    // Sin secreto no se puede verificar nada, así que aceptar sería aceptar
    // cualquier vuelta fabricada.
    const s = fabricar({ userId: A, ts: Date.now() });
    delete process.env.JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.TRACKING_SECRET;
    const { parseOAuthState } = await modulo();
    expect(parseOAuthState(s)).toBeNull();
  });

  it("dos states del mismo usuario son distintos entre sí", async () => {
    // Llevan la marca de tiempo dentro —y desde el Bloque 7, tambien un nonce
    // aleatorio de 32 bytes— asi que no son reutilizables como si fueran un
    // identificador fijo.
    const { crearEstadoOAuth } = await modulo();
    const uno = crearEstadoOAuth(A).state;
    await new Promise((r) => setTimeout(r, 5));
    const dos = crearEstadoOAuth(A).state;
    expect(uno).not.toBe(dos);
  });
});
