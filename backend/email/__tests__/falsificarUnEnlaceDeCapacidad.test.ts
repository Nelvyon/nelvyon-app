/**
 * BLOQUE 7 · falsificar un enlace de capacidad.
 *
 * Hay una familia de URLs de NELVYON que no llevan sesión detrás y aun así hacen
 * cosas: el píxel de apertura, el redirector de clics, la baja de una campaña y
 * la aprobación de un entregable con un clic. Quien tenga el enlace, puede. No
 * hay contraseña que revocar ni sesión que cerrar: **el enlace ES la
 * credencial**.
 *
 * Eso los convierte en la superficie más expuesta del producto —viajan por
 * correo, pasan por servidores intermedios, quedan en historiales y en los
 * registros de los escáneres antivirus— y hace que las preguntas que importan
 * sean distintas de las de una sesión:
 *
 *   1. ¿Se puede fabricar uno sin la clave?
 *   2. ¿Se puede coger uno bueno y cambiarle a quién apunta?
 *   3. ¿Sirve un enlace para algo distinto de para lo que se emitió? Un píxel de
 *      apertura lo ve cualquier cliente de correo; si valiera para dar de baja,
 *      la baja la provocaría el propio hecho de abrir el correo.
 *   4. ¿Caduca?
 *   5. ¿Se pueden confundir DOS familias que comparten la misma clave? Porque la
 *      comparten: `requireHmacSecret` cae a `JWT_SECRET`, que es también el de
 *      las sesiones.
 *
 * La quinta es la que más fácilmente se rompería sola en el futuro, y por eso se
 * asegura aquí con su razón escrita.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import jwt from "jsonwebtoken";

import { signTrackingToken, verifyTrackingToken } from "../trackingToken";
import {
  signPortalApprovalToken,
  verifyPortalApprovalToken,
} from "../../saas/PortalApprovalTokenService";
import { requireHmacSecret } from "../../saas/hmacSecret";

const SECRETO = "secreto-hmac-de-certificacion-bloque-7-con-longitud-de-sobra";

const previo = { ...process.env };

beforeEach(() => {
  process.env.TRACKING_SECRET = SECRETO;
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  process.env = { ...previo };
});

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");

const rastreo = (t: "o" | "c" | "u", extra: Record<string, unknown> = {}) =>
  signTrackingToken({ tid: "tenant-A", cid: "camp-1", rid: "contacto-1", t, ...extra });

describe("BLOQUE 7 · EL CONTROL: los enlaces buenos funcionan", () => {
  it("un token de rastreo recién emitido verifica y trae su carga", () => {
    /**
     * Sin este control, un verificador que rechazara todo pasaría cada ataque de
     * abajo y dejaría a los clientes sin métricas de campaña y sin poder darse
     * de baja — que es además un problema legal, no solo de producto.
     */
    const r = verifyTrackingToken(rastreo("c", { url: "https://cliente.test/oferta" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.tid).toBe("tenant-A");
      expect(r.payload.t).toBe("c");
    }
  });

  it("un token de aprobación recién emitido verifica", () => {
    const r = verifyPortalApprovalToken(
      signPortalApprovalToken({ did: "d-1", wid: 42, cid: "cli-1", act: "approve" }),
    );
    expect(r.ok).toBe(true);
  });
});

describe("BLOQUE 7 · fabricar uno sin la clave", () => {
  it("una firma inventada no cuela", () => {
    const bueno = rastreo("u");
    const [data] = bueno.split(".");
    for (const falsa of ["", "x", "a".repeat(43), Buffer.alloc(32).toString("base64url")]) {
      const r = verifyTrackingToken(`${data}.${falsa}`);
      expect(r.ok, `colo una firma inventada: ${JSON.stringify(falsa)}`).toBe(false);
    }
  });

  it("firmar con OTRA clave no cuela", () => {
    /**
     * El atacante conoce el formato entero —está a la vista en cada correo— así
     * que puede construir la carga perfecta. Lo único que no tiene es la clave.
     */
    const data = b64({
      tid: "tenant-A",
      cid: "camp-1",
      rid: "contacto-1",
      t: "u",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const sig = createHmac("sha256", "esta-clave-no-es-la-de-nelvyon-pero-es-larga")
      .update(data)
      .digest("base64url");
    expect(verifyTrackingToken(`${data}.${sig}`).ok).toBe(false);
  });

  it("basura estructural no revienta ni pasa", () => {
    for (const t of ["", ".", "..", "a.b.c", "sinpunto", "a.", ".b", "null", "%%%%.%%%%"]) {
      expect(verifyTrackingToken(t).ok, JSON.stringify(t)).toBe(false);
      expect(verifyPortalApprovalToken(t).ok, JSON.stringify(t)).toBe(false);
    }
  });
});

describe("BLOQUE 7 · cambiarle a quién apunta", () => {
  it("cambiar el inquilino invalida la firma", () => {
    /**
     * El ataque que de verdad importa en una familia de tokens que llevan el
     * inquilino DENTRO: si la carga se pudiera reescribir, un enlace de baja
     * propio serviría para dar de baja a los contactos de otro cliente.
     */
    const [, sig] = rastreo("u").split(".");
    const otra = b64({
      tid: "tenant-DE-LA-VICTIMA",
      cid: "camp-1",
      rid: "contacto-1",
      t: "u",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(
      verifyTrackingToken(`${otra}.${sig}`).ok,
      "se pudo reapuntar el enlace a otro inquilino",
    ).toBe(false);
  });

  it("cambiar el entregable de un token de aprobación invalida la firma", () => {
    const [, sig] = signPortalApprovalToken({
      did: "d-mio",
      wid: 42,
      cid: "cli-1",
      act: "approve",
    }).split(".");
    const otra = b64({
      did: "d-de-otro-cliente",
      wid: 42,
      cid: "cli-1",
      act: "approve",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(
      verifyPortalApprovalToken(`${otra}.${sig}`).ok,
      "se pudo aprobar el entregable de otro reescribiendo el token",
    ).toBe(false);
  });

  it("alargar la caducidad invalida la firma", () => {
    const t = rastreo("o");
    const [data, sig] = t.split(".");
    const carga = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Record<string, unknown>;
    carga.exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3650;
    expect(verifyTrackingToken(`${b64(carga)}.${sig}`).ok).toBe(false);
  });
});

describe("BLOQUE 7 · caducar de verdad", () => {
  it("un token caducado se rechaza aunque la firma sea BUENA", () => {
    /**
     * Se firma de verdad con la clave real y una caducidad en el pasado: si la
     * comprobación de `exp` no existiera, esto pasaría con firma impecable. Un
     * enlace de correo vive para siempre en el buzón de quien lo recibió.
     */
    const data = b64({
      tid: "tenant-A",
      cid: "camp-1",
      rid: "contacto-1",
      t: "u",
      exp: Math.floor(Date.now() / 1000) - 1,
    });
    const sig = createHmac("sha256", SECRETO).update(data).digest("base64url");
    const r = verifyTrackingToken(`${data}.${sig}`);
    expect(r.ok, "se acepto un token caducado con firma valida").toBe(false);
    if (!r.ok) expect(r.error).toBe("expired");
  });
});

describe("BLOQUE 7 · un enlace para su cosa y no para otra", () => {
  it("el ámbito viaja firmado y no se puede cambiar", () => {
    /**
     * El píxel de apertura lo carga solo el cliente de correo, y su URL queda en
     * cualquier registro por el que pase el mensaje. Si ese mismo token valiera
     * para dar de baja, abrir el correo daría de baja al lector.
     *
     * Las rutas comprueban `t` ("o", "c", "u") y aquí se asegura que `t` no se
     * puede reescribir sin romper la firma.
     */
    const abrir = rastreo("o");
    const [data, sig] = abrir.split(".");
    const carga = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Record<string, unknown>;
    carga.t = "u";
    expect(
      verifyTrackingToken(`${b64(carga)}.${sig}`).ok,
      "un token de apertura se convirtio en uno de baja",
    ).toBe(false);

    // Y el token de apertura legítimo sigue diciendo que es de apertura.
    const r = verifyTrackingToken(abrir);
    expect(r.ok && r.payload.t).toBe("o");
  });
});

describe("BLOQUE 7 · dos familias, una sola clave", () => {
  it("un token de sesión (JWT) no vale como token de capacidad", () => {
    /**
     * `requireHmacSecret` cae a `JWT_SECRET`, que es el mismo con el que se
     * firman las sesiones. Compartir clave entre dos formatos es como nacen los
     * ataques de confusión.
     *
     * Aquí no cuela, y conviene dejar escrito POR QUÉ, porque la razón es
     * estructural y un cambio inocente podría borrarla: un JWT tiene TRES partes
     * y estos tokens exigen exactamente DOS.
     *
     * SE COMPRUEBA EL MOTIVO, no solo el resultado. La primera versión de esta
     * prueba solo miraba `ok === false`, y una mutación que admitía tokens de
     * tres partes **no la tumbaba**: el JWT seguía cayendo, pero por otro sitio
     * —`JSON.parse` de una cadena que lleva un punto dentro produce basura— y no
     * por el recuento de partes que el comentario decía estar asegurando.
     *
     * Es la diferencia entre una defensa y una casualidad. Con el motivo
     * afirmado, la prueba mide la barrera de la que habla: si el JWT deja de
     * rechazarse como `malformed`, la mutación cae. Y no es una distinción
     * academica: cuando el HMAC se calcula sobre `cabecera.carga`, la firma del
     * JWT ES la firma que este verificador esperaría — la unica cosa que separa
     * las dos familias en ese escenario es el recuento.
     */
    const sesion = jwt.sign({ userId: "u", tenantId: "t" }, SECRETO, { algorithm: "HS256" });
    expect(sesion.split(".")).toHaveLength(3);
    const rt = verifyTrackingToken(sesion);
    expect(rt.ok, "un JWT de sesion verifico como token de rastreo").toBe(false);
    if (!rt.ok) {
      expect(
        rt.error,
        "el JWT se rechazo, pero NO por el recuento de partes: la barrera que se dice asegurar no actuo",
      ).toBe("malformed");
    }
    const rp = verifyPortalApprovalToken(sesion);
    expect(rp.ok).toBe(false);
    if (!rp.ok) expect(rp.error).toBe("malformed");
  });

  it("un token de capacidad no se puede reciclar como JWT de sesión", () => {
    /**
     * La dirección contraria, que es la peligrosa: si un token de rastreo
     * —observable en cualquier correo— se pudiera reformar en un JWT válido,
     * cualquier destinatario de una campaña tendría una sesión.
     *
     * No se puede, y la razón también es estructural: lo que se firma aquí es
     * UNA cadena base64url, y la salida base64url **nunca contiene un punto**,
     * mientras que lo que firma un JWT es `cabecera.carga` — con punto. Los dos
     * espacios de mensajes firmados son disjuntos.
     */
    const t = rastreo("c", { url: "https://cliente.test/x" });
    const [data, sig] = t.split(".");
    expect(data).not.toContain(".");
    expect(() => jwt.verify(`${data}.${sig}`, SECRETO)).toThrow();
    // Y montarlo como si fuera un JWT de dos partes tampoco:
    expect(() => jwt.verify(t, SECRETO)).toThrow();
  });

  it("un token de rastreo no verifica como token de aprobación", () => {
    // Misma clave, misma forma de DOS partes: aquí la firma SÍ verifica. Lo que
    // separa a las dos familias es que la carga no trae `did`/`wid`, así que la
    // ruta de aprobación no encuentra entregable y cierra. Queda anotado como lo
    // que es —separación por contenido, no por criptografía— para que nadie
    // suponga que hay una barrera que no existe.
    const t = rastreo("c", { url: "https://x.test" });
    const r = verifyPortalApprovalToken(t);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.did, "la carga de rastreo no puede aportar un entregable").toBeUndefined();
      expect(r.payload.wid).toBeUndefined();
    }
  });
});

describe("BLOQUE 7 · la clave, en cerrado", () => {
  it("sin ninguna clave no se firma nada", () => {
    delete process.env.TRACKING_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    expect(() => requireHmacSecret({ preferTracking: true })).toThrow();
    expect(() => signTrackingToken({ tid: "a", cid: "b", rid: "c", t: "o" })).toThrow();
  });

  it("una clave corta se rechaza en vez de usarse", () => {
    /**
     * Una clave de ocho caracteres se busca por fuerza bruta sin despeinarse, y
     * con ella se fabrican enlaces de baja y de aprobación para cualquier
     * inquilino. Aceptarla «porque hay algo puesto» sería peor que no tener
     * ninguna, porque parecería que está protegido.
     */
    delete process.env.TRACKING_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    process.env.JWT_SECRET = "corta123";
    expect(() => requireHmacSecret({ preferTracking: true })).toThrow(/at least 32/);
  });
});
