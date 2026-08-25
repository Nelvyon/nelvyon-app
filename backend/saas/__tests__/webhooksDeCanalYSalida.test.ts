/**
 * BLOQUE 4 · webhooks de canal: autenticidad al entrar, SSRF al salir.
 *
 * Dos direcciones, dos riesgos distintos:
 *
 *   - **Al entrar**: si la firma no se comprueba, cualquiera puede hacerse pasar
 *     por Slack o por Meta y disparar lo que el canal dispare.
 *   - **Al salir**: la URL del webhook la configura el INQUILINO. Si no se
 *     filtra, puede apuntarla a `169.254.169.254` -el endpoint de metadatos de
 *     la nube- o a la red interna, y NELVYON hara el POST desde DENTRO de su
 *     propia infraestructura. Eso es SSRF con las credenciales del servidor.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import { SaasApprovalCardsService } from "../SaasApprovalCardsService";

const ENTORNO = { ...process.env };

afterEach(() => {
  process.env = { ...ENTORNO };
});

function firmaDeSlack(secreto: string, cuerpo: string, ts: number): string {
  return `v0=${createHmac("sha256", secreto).update(`v0:${ts}:${cuerpo}`).digest("hex")}`;
}

describe("BLOQUE 4 · firma de Slack al entrar", () => {
  const CUERPO = '{"type":"block_actions","user":{"id":"U1"}}';

  function servicio() {
    return new SaasApprovalCardsService({ query: async () => [] } as never);
  }

  it("EL CONTROL: una firma correcta y reciente se acepta", () => {
    // Sin esto, una verificacion que rechazara todo pasaria las pruebas de
    // abajo y dejaria el canal inservible.
    process.env.SLACK_SIGNING_SECRET = "secreto-de-prueba";
    const ts = Math.floor(Date.now() / 1000);
    expect(
      servicio().verifySlackSignature(CUERPO, String(ts), firmaDeSlack("secreto-de-prueba", CUERPO, ts)),
    ).toBe(true);
  });

  it("una firma INVENTADA se rechaza", () => {
    process.env.SLACK_SIGNING_SECRET = "secreto-de-prueba";
    const ts = Math.floor(Date.now() / 1000);
    expect(servicio().verifySlackSignature(CUERPO, String(ts), "v0=inventada")).toBe(false);
  });

  it("un CUERPO manipulado con la firma del original se rechaza", () => {
    // El ataque real: capturar una interaccion legitima y cambiarle el usuario
    // o la accion antes de reenviarla.
    process.env.SLACK_SIGNING_SECRET = "secreto-de-prueba";
    const ts = Math.floor(Date.now() / 1000);
    const firma = firmaDeSlack("secreto-de-prueba", CUERPO, ts);
    const manipulado = CUERPO.replace('"U1"', '"U_ADMIN"');
    expect(servicio().verifySlackSignature(manipulado, String(ts), firma)).toBe(false);
  });

  it("una peticion VIEJA se rechaza aunque su firma sea correcta", () => {
    // Proteccion de repeticion. Sin ventana de tiempo, una interaccion
    // capturada hace un mes seguiria siendo valida para siempre.
    process.env.SLACK_SIGNING_SECRET = "secreto-de-prueba";
    const hace1Hora = Math.floor(Date.now() / 1000) - 3600;
    const firma = firmaDeSlack("secreto-de-prueba", CUERPO, hace1Hora);
    expect(servicio().verifySlackSignature(CUERPO, String(hace1Hora), firma)).toBe(false);
  });

  it("una peticion del FUTURO tambien se rechaza", () => {
    // El reloj puede ir adelantado en el emisor, pero una hora de margen no es
    // desfase: es una firma fabricada.
    process.env.SLACK_SIGNING_SECRET = "secreto-de-prueba";
    const dentro1Hora = Math.floor(Date.now() / 1000) + 3600;
    const firma = firmaDeSlack("secreto-de-prueba", CUERPO, dentro1Hora);
    expect(servicio().verifySlackSignature(CUERPO, String(dentro1Hora), firma)).toBe(false);
  });

  it("sin secreto configurado NO se acepta nada (fallo cerrado)", () => {
    delete process.env.SLACK_SIGNING_SECRET;
    const ts = Math.floor(Date.now() / 1000);
    expect(servicio().verifySlackSignature(CUERPO, String(ts), firmaDeSlack("x", CUERPO, ts))).toBe(false);
  });

  it("una marca de tiempo ilegible se rechaza", () => {
    process.env.SLACK_SIGNING_SECRET = "secreto-de-prueba";
    expect(servicio().verifySlackSignature(CUERPO, "no-es-un-numero", "v0=abc")).toBe(false);
    expect(servicio().verifySlackSignature(CUERPO, "", "v0=abc")).toBe(false);
  });
});

describe("BLOQUE 4 · SSRF en webhooks salientes", () => {
  const seguro = (u: string) => SaasApprovalCardsService.isSafeWebhookUrl(u);

  it("EL CONTROL: un destino publico y https SI se acepta", () => {
    // Sin esto, una guarda que rechazara todo pasaria las pruebas de abajo y
    // dejaria a los clientes sin poder configurar su webhook.
    expect(seguro("https://hooks.ejemplo.test/servicios/T1/B1/xyz")).toBe(true);
    expect(seguro("https://outlook.office.com/webhook/abc")).toBe(true);
  });

  it.each([
    ["metadatos de la nube", "https://169.254.169.254/latest/meta-data/iam/security-credentials/"],
    ["bucle local", "https://127.0.0.1/admin"],
    ["localhost", "https://localhost:8080/interno"],
    ["red privada 10", "https://10.0.0.5/interno"],
    ["red privada 192.168", "https://192.168.1.1/router"],
    ["red privada 172.16", "https://172.16.0.9/"],
    ["IPv6 de bucle", "https://[::1]/interno"],
    ["IPv6 de uso local", "https://[fd00::1]/interno"],
    ["dominio .local", "https://impresora.local/"],
  ])("un destino INTERNO (%s) se rechaza", (_nombre, url) => {
    // El ataque: un inquilino configura su webhook apuntando dentro de la
    // infraestructura, y NELVYON hace el POST desde ahi. Con el endpoint de
    // metadatos, eso son credenciales de la nube.
    expect(seguro(url)).toBe(false);
  });

  it("un esquema que no es https se rechaza", () => {
    // `http:` viajaria en claro; `file:` y `gopher:` son vectores clasicos.
    for (const u of ["http://ejemplo.test/", "file:///etc/passwd", "gopher://ejemplo.test/"]) {
      expect(seguro(u), u).toBe(false);
    }
  });

  it("una URL con credenciales embebidas se rechaza", () => {
    // `https://usuario:clave@host` filtra la credencial al registro y al
    // proveedor, y sirve para confundir sobre el destino real.
    expect(seguro("https://usuario:clave@ejemplo.test/")).toBe(false);
  });

  it("una URL ilegible se rechaza en vez de reventar", () => {
    expect(seguro("no-es-una-url")).toBe(false);
    expect(seguro("")).toBe(false);
    expect(seguro("   ")).toBe(false);
  });
});
