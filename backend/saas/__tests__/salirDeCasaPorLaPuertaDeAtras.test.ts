/**
 * BLOQUE 7 · salir de casa por la puerta de atrás.
 *
 * `assertSafeEgressUrl` es la guarda canónica de salida: la que decide a dónde
 * puede NELVYON hacer una petición cuando la dirección la elige un inquilino
 * —webhooks salientes, hooks de Teams, endpoints de SSO—. Es la buena de las
 * tres copias que había en el árbol, y las otras dos se borraron para delegar en
 * ella. Eso la convierte en un punto único: lo que se le escape se le escapa a
 * todo el producto.
 *
 * Lo que ya hacía bien, y aquí se asegura para que no se pierda: exige HTTPS,
 * rechaza credenciales en la URL, y bloquea `localhost`, RFC1918, `127/8`,
 * `169.254/16` (metadatos de la nube), `100.64/10` (CGNAT), ULA y link-local.
 *
 * Lo que se le escapaba, medido y no supuesto:
 *
 *   - **IPv6 con IPv4 dentro.** `https://[::ffff:127.0.0.1]/` — Node lo
 *     normaliza a `[::ffff:7f00:1]`, y la comprobación de IPv6 solo miraba `::1`,
 *     `::`, `fc`, `fd` y `fe80`. Ni `7f00:1` ni `a9fe:a9fe` empiezan por
 *     ninguno de esos, así que pasaban: loopback, metadatos de instancia y red
 *     privada, los tres alcanzables.
 *   - **El punto final del DNS.** `https://localhost./` — el DNS trata
 *     `localhost.` y `localhost` como el mismo nombre; la lista no.
 *
 * Las formas decimal, hexadecimal, octal y corta de IPv4 (`2130706433`,
 * `0x7f000001`, `0177.0.0.1`, `127.1`) SÍ estaban cubiertas, pero no por la
 * lista: las normaliza el propio analizador de URL de Node a `127.0.0.1` antes
 * de que la guarda las vea. Se aseguran igualmente, porque esa cobertura es
 * prestada y podría cambiar con una versión.
 */
import { describe, expect, it } from "vitest";

import { assertSafeEgressUrl, isSafeEgressUrl } from "../safeEgressUrl";

describe("BLOQUE 7 · EL CONTROL: las salidas legítimas siguen valiendo", () => {
  it("un webhook normal de un cliente se acepta", () => {
    /**
     * Sin este control, una guarda que rechazara todo pasaría cada ataque de
     * abajo y dejaría a los clientes sin webhooks salientes, sin Teams y sin SSO
     * — media integración del producto.
     */
    for (const bueno of [
      "https://hooks.slack.com/services/T0/B0/xxx",
      "https://outlook.office.com/webhook/abc",
      "https://api.cliente.com/nelvyon",
      "https://8.8.8.8/hook",
      "https://[2606:4700:4700::1111]/hook",
    ]) {
      expect(isSafeEgressUrl(bueno), bueno).toBe(true);
    }
  });
});

describe("BLOQUE 7 · lo que ya estaba cerrado", () => {
  const cerrados = [
    ["esquema", "http://api.cliente.com/hook"],
    ["esquema raro", "ftp://api.cliente.com/hook"],
    ["fichero local", "file:///etc/passwd"],
    ["credenciales en la URL", "https://usuario:clave@api.cliente.com/hook"],
    ["localhost", "https://localhost/hook"],
    ["loopback", "https://127.0.0.1/hook"],
    ["cero", "https://0.0.0.0/hook"],
    ["metadatos de la nube", "https://169.254.169.254/latest/meta-data/"],
    ["metadatos de Google", "https://metadata.google.internal/computeMetadata/v1/"],
    ["red privada 10", "https://10.0.0.5/admin"],
    ["red privada 172", "https://172.16.0.1/admin"],
    ["red privada 192", "https://192.168.1.1/admin"],
    ["CGNAT", "https://100.64.0.1/admin"],
    ["dominio .local", "https://impresora.local/"],
    ["subdominio .localhost", "https://api.localhost/"],
    ["IPv6 loopback", "https://[::1]/hook"],
    ["IPv6 loopback largo", "https://[0:0:0:0:0:0:0:1]/hook"],
    ["IPv6 ULA", "https://[fd00::1]/hook"],
    ["IPv6 link-local", "https://[fe80::1]/hook"],
  ] as const;

  for (const [nombre, url] of cerrados) {
    it(`sigue bloqueado: ${nombre}`, () => {
      expect(() => assertSafeEgressUrl(url), url).toThrow();
    });
  }
});

describe("BLOQUE 7 · IPv4 disfrazado de IPv4", () => {
  it("las formas decimal, hexadecimal, octal y corta no cuelan", () => {
    // Cobertura PRESTADA: quien las normaliza es el analizador de URL de Node,
    // no la guarda. Se aseguran para enterarnos si un dia deja de hacerlo.
    for (const url of [
      "https://2130706433/",      // 127.0.0.1 en decimal
      "https://0x7f000001/",      // en hexadecimal
      "https://0177.0.0.1/",      // primer octeto en octal
      "https://127.1/",           // forma corta
      "https://0/",               // 0.0.0.0
    ]) {
      expect(() => assertSafeEgressUrl(url), url).toThrow();
    }
  });
});

describe("BLOQUE 7 · IPv6 con una IPv4 dentro", () => {
  const disfraces = [
    ["loopback mapeado", "https://[::ffff:127.0.0.1]/"],
    ["loopback mapeado en hex", "https://[::ffff:7f00:1]/"],
    ["metadatos mapeados", "https://[::ffff:169.254.169.254]/latest/meta-data/"],
    ["metadatos mapeados en hex", "https://[::ffff:a9fe:a9fe]/"],
    ["red privada mapeada", "https://[::ffff:10.0.0.1]/admin"],
    ["red privada mapeada en hex", "https://[::ffff:a00:1]/admin"],
    ["192.168 mapeada", "https://[::ffff:192.168.1.1]/"],
    ["CGNAT mapeada", "https://[::ffff:100.64.0.1]/"],
    ["IPv4 compatible (obsoleta)", "https://[::127.0.0.1]/"],
    ["NAT64 well-known", "https://[64:ff9b::127.0.0.1]/"],
  ] as const;

  for (const [nombre, url] of disfraces) {
    it(`no se sale por ${nombre}`, () => {
      /**
       * El ataque. Un inquilino configura su webhook con una de estas y NELVYON
       * hace el POST desde DENTRO de su propia infraestructura, contra el
       * endpoint de metadatos de la instancia o contra un servicio interno que
       * no está expuesto.
       */
      expect(
        () => assertSafeEgressUrl(url),
        `se acepto una salida a ${url}: alcanza la red interna desde dentro`,
      ).toThrow();
    });
  }

  it("una IPv6 pública de verdad SÍ vale", () => {
    // La corrección tiene que distinguir, no prohibir IPv6.
    expect(isSafeEgressUrl("https://[2001:4860:4860::8888]/hook")).toBe(true);
    expect(isSafeEgressUrl("https://[::ffff:8.8.8.8]/hook")).toBe(true);
  });
});

describe("BLOQUE 7 · el punto final del DNS", () => {
  it("`localhost.` es `localhost`", () => {
    /**
     * El DNS trata el punto final como «nombre absoluto» y resuelve igual. La
     * lista de nombres bloqueados comparaba la cadena tal cual, así que
     * `localhost.` no estaba en ella.
     */
    expect(() => assertSafeEgressUrl("https://localhost./hook")).toThrow();
    expect(() => assertSafeEgressUrl("https://api.localhost./hook")).toThrow();
    expect(() => assertSafeEgressUrl("https://impresora.local./")).toThrow();
    expect(() => assertSafeEgressUrl("https://metadata.google.internal./")).toThrow();
  });
});

describe("BLOQUE 7 · lo que esta guarda NO puede resolver", () => {
  it("un nombre público que resuelve a una IP interna sigue pasando", () => {
    /**
     * Residuo aceptado y escrito, no escondido: `assertSafeEgressUrl` mira la
     * CADENA de la URL. Un dominio público cuyo registro A apunte a 10.0.0.5
     * —o que cambie entre la comprobación y la conexión, que es la reconexión de
     * DNS clásica— no se puede detectar aquí.
     *
     * Cerrarlo de verdad exige resolver el nombre y comprobar la IP en el
     * momento de conectar, con un agente que vuelva a comprobar tras cada
     * redirección. Eso es trabajo de la capa de red, no de una función pura, y
     * se deja anotado para que nadie lea esta suite como si cubriera esa parte.
     */
    expect(isSafeEgressUrl("https://interno.ejemplo.com/hook")).toBe(true);
  });
});
