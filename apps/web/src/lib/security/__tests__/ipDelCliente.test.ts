/**
 * Quien es limitado no puede elegir su propia identidad de limite.
 *
 * EL DEFECTO
 * ----------
 * `getClientIp` leia `x-forwarded-for` de IZQUIERDA a derecha y devolvia el
 * primer elemento. Detras de un proxy que ANADE al final —Railway lo hace— ese
 * primer elemento es exactamente el que escribe el cliente:
 *
 *     el atacante manda : X-Forwarded-For: 9.9.9.9
 *     el proxy reenvia  : X-Forwarded-For: 9.9.9.9, <ip real>
 *     getClientIp leia  : 9.9.9.9   <- la que eligio el atacante
 *
 * Como la IP es la CLAVE DEL CUBO, cambiarla en cada peticion da un cubo nuevo
 * cada vez y el limite deja de existir. No hace falta saltarse el middleware:
 * el middleware se ejecuta, cuenta, y cuenta en un sitio distinto cada vez.
 *
 * Es el mismo principio que ya se aplico en `backend/middleware/rate_limit.py`
 * al sacar `X-Workspace-Id` de la clave del cubo: un identificador que elige
 * quien es limitado no puede formar parte de la clave que lo limita.
 *
 * EL CRITERIO YA EXISTIA
 * ----------------------
 * `backend/core/identidad_peticion.py::ip_del_cliente` ya lo hacia bien —de
 * derecha a izquierda, con `TRUSTED_PROXY_HOPS`— desde el lado Python. El lado
 * Next hacia lo contrario. Esto lo iguala, misma variable de entorno.
 */
import { afterEach, describe, expect, it } from "vitest";

import { getClientIp } from "../rateLimit";

/** `getClientIp` solo lee cabeceras: basta con algo que sepa devolverlas. */
function peticion(cabeceras: Record<string, string>): never {
  return { headers: new Headers(cabeceras) } as never;
}

const SALTOS = process.env.TRUSTED_PROXY_HOPS;
afterEach(() => {
  if (SALTOS === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = SALTOS;
});

describe("la IP que se usa como clave de limite", () => {
  it("REPRODUCE: el cliente no consigue elegir su cubo aunque lo pida", () => {
    // Lo que llega al servidor detras de un proxy que anade: lo del cliente
    // primero, lo real despues. La IP real es 203.0.113.7.
    expect(getClientIp(peticion({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" })))
      .toBe("203.0.113.7");
  });

  it("y tampoco inyectando una cadena entera de saltos falsos", () => {
    // Rellenar la cabecera no ayuda: se cuenta desde el extremo del servidor.
    expect(getClientIp(peticion({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 203.0.113.7",
    }))).toBe("203.0.113.7");
  });

  it("dos peticiones con cabecera distinta caen en el MISMO cubo", () => {
    // La prueba que de verdad importa: el limite cuenta en un solo sitio.
    const a = getClientIp(peticion({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }));
    const b = getClientIp(peticion({ "x-forwarded-for": "8.8.8.8, 203.0.113.7" }));
    expect(a).toBe(b);
  });

  it("EL CONTROL: dos clientes DISTINTOS siguen en cubos distintos", () => {
    // Sin esto, un `getClientIp` que devolviera siempre la misma constante
    // aprobaria las tres pruebas de arriba — y limitaria a todo el planeta a un
    // solo cubo compartido. «Nadie pasa» no es proteccion, es una averia.
    const a = getClientIp(peticion({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }));
    const b = getClientIp(peticion({ "x-forwarded-for": "9.9.9.9, 198.51.100.4" }));
    expect(a).not.toBe(b);
  });

  it("con dos saltos confiables se salta el ultimo proxy", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(getClientIp(peticion({
      "x-forwarded-for": "9.9.9.9, 203.0.113.7, 10.0.0.1",
    }))).toBe("203.0.113.7");
  });

  it("`::ffff:1.2.3.4` y `1.2.3.4` son el MISMO cubo", () => {
    // Sin canonizar, el mismo origen tendria dos cubos y el limite valdria el
    // doble solo por escribir la IP de otra forma.
    expect(getClientIp(peticion({ "x-forwarded-for": "::ffff:203.0.113.7" })))
      .toBe(getClientIp(peticion({ "x-forwarded-for": "203.0.113.7" })));
  });

  it("una cabecera con basura no se convierte en cubo", () => {
    // `no-soy-una-ip` como clave sigue siendo una clave: elegible y constante.
    expect(getClientIp(peticion({ "x-forwarded-for": "no-soy-una-ip" })))
      .not.toBe("no-soy-una-ip");
  });

  it("sin ninguna cabecera devuelve un valor estable, no un fallo", () => {
    expect(getClientIp(peticion({}))).toBe("unknown");
  });

  it("cf-connecting-ip solo se usa si NO hay x-forwarded-for", () => {
    // Cloudflare la escribe el borde y el cliente no la controla, pero si hay
    // XFF esa es la que lleva la cadena completa.
    expect(getClientIp(peticion({ "cf-connecting-ip": "203.0.113.9" })))
      .toBe("203.0.113.9");
    expect(getClientIp(peticion({
      "cf-connecting-ip": "9.9.9.9",
      "x-forwarded-for": "1.1.1.1, 203.0.113.7",
    }))).toBe("203.0.113.7");
  });
});
