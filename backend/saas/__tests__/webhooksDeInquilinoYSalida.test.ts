/**
 * BLOQUE 4 · webhooks que el inquilino configura, y a dónde se les deja llegar.
 *
 * Un inquilino da una URL y NELVYON hace el POST **desde dentro de su propia
 * infraestructura**. Eso convierte una casilla de configuración en una petición
 * privilegiada, y es la definición de SSRF.
 *
 * `assertSafeEgressUrl` es la guarda canónica del árbol. Había **tres copias**
 * del mismo control —esta, la del servicio de tarjetas de aprobación y los
 * rangos del modo privado— y tres copias de un control es garantía de que dos se
 * queden atrás: la del servicio de aprobación era justo la débil, la que solo
 * miraba el esquema. Ahora todas apuntan aquí.
 */
import { describe, expect, it } from "vitest";

import { assertSafeEgressUrl } from "../safeEgressUrl";
import { SaasApprovalCardsService } from "../SaasApprovalCardsService";

const permite = (u: string): boolean => {
  try {
    assertSafeEgressUrl(u);
    return true;
  } catch {
    return false;
  }
};

describe("BLOQUE 4 · destinos permitidos para un webhook de inquilino", () => {
  it("EL CONTROL: un destino público y HTTPS se acepta", () => {
    // Sin esto, una guarda que rechazara todo pasaría cada prueba de abajo y
    // dejaría a los clientes sin poder configurar un solo webhook.
    expect(permite("https://hooks.cliente.test/nelvyon")).toBe(true);
    expect(permite("https://api.ejemplo.test:8443/entrada?x=1")).toBe(true);
  });

  it.each([
    ["metadatos de AWS/GCP por IP", "https://169.254.169.254/latest/meta-data/"],
    ["metadatos de Google por nombre", "https://metadata.google.internal/computeMetadata/v1/"],
    ["bucle local", "https://127.0.0.1/interno"],
    ["localhost", "https://localhost/interno"],
    ["subdominio .localhost", "https://api.localhost/interno"],
    ["dominio .local", "https://impresora.local/"],
    ["RFC1918 clase A", "https://10.1.2.3/"],
    ["RFC1918 clase B", "https://172.20.0.1/"],
    ["RFC1918 clase C", "https://192.168.0.1/"],
    ["CGNAT", "https://100.100.0.1/"],
    ["ruta cero", "https://0.0.0.0/"],
    ["IPv6 bucle", "https://[::1]/"],
    ["IPv6 uso local", "https://[fd00::1]/"],
    ["IPv6 link-local", "https://[fe80::1]/"],
  ])("un destino interno (%s) se RECHAZA", (_nombre, url) => {
    // Cada uno de estos es una forma real de decir «llama dentro de casa». El
    // de metadatos es el peor: devuelve credenciales de la nube.
    expect(permite(url)).toBe(false);
  });

  it("un octeto imposible se rechaza en vez de colarse como nombre", () => {
    // `999.1.1.1` no es una IP válida, pero tampoco es un nombre que se deba
    // resolver: aceptarlo abriría la puerta a trucos de normalización.
    expect(permite("https://999.1.1.1/")).toBe(false);
  });

  it("un esquema que no sea HTTPS se rechaza", () => {
    // `http:` viaja en claro con el secreto del webhook dentro.
    for (const u of ["http://cliente.test/", "ftp://cliente.test/", "file:///etc/passwd"]) {
      expect(permite(u), u).toBe(false);
    }
  });

  it("credenciales embebidas en la URL se rechazan", () => {
    // Acaban en los registros, se mandan al destino y sirven para disfrazar el
    // host real ante quien lea la configuración por encima.
    expect(permite("https://usuario:clave@cliente.test/")).toBe(false);
    expect(permite("https://usuario@cliente.test/")).toBe(false);
  });

  it("una URL ilegible se rechaza sin reventar", () => {
    for (const u of ["", "   ", "no-es-una-url", "https://", "http://[::sin-cerrar"]) {
      expect(permite(u), JSON.stringify(u)).toBe(false);
    }
  });

  it("la guarda es UNA: el servicio de aprobación delega en ella", () => {
    // La comprobación que impide que vuelvan a existir tres copias. Si alguien
    // reimplementara la de aprobación, estas dos dejarían de coincidir.
    const casos = [
      "https://hooks.cliente.test/nelvyon",
      "https://169.254.169.254/latest/meta-data/",
      "https://127.0.0.1/interno",
      "http://cliente.test/",
      "https://usuario:clave@cliente.test/",
      "no-es-una-url",
    ];
    for (const u of casos) {
      expect(SaasApprovalCardsService.isSafeWebhookUrl(u), u).toBe(permite(u));
    }
  });

  it("el mensaje de rechazo dice QUÉ falla, sin filtrar el destino interno", () => {
    // Quien configura mal necesita saber por qué; quien sondea no necesita
    // confirmación de qué IPs internas existen.
    try {
      assertSafeEgressUrl("http://cliente.test/");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(String(e)).toMatch(/HTTPS/i);
    }
    try {
      assertSafeEgressUrl("https://10.1.2.3/");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(String(e)).toMatch(/not allowed/i);
      expect(String(e)).not.toContain("10.1.2.3");
    }
  });
});
