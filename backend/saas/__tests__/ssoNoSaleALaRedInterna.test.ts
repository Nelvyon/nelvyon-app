/**
 * Un inquilino no puede hacer que NELVYON llame a su propia red interna.
 *
 * EL DEFECTO
 * ----------
 * `saas_sso_configs.issuer` y `metadata_url` los elige el INQUILINO, y el
 * servidor hace peticiones a los dos durante el login: un `POST` al endpoint de
 * token y una descarga del JWKS.
 *
 * La unica validacion era `if (!input.issuer.trim())` — que no estuviera vacio.
 *
 * Con `issuer = http://169.254.169.254`, el callback de SSO hacia un POST al
 * endpoint de metadatos de la nube. Y lo peor: devolvia **200 caracteres del
 * cuerpo de la respuesta** en su 502, asi que no era solo provocar la peticion:
 * era LEER el resultado. Misma clase que la SSRF de lectura que ya aparecio en
 * `webhook_deliveries.response_body`.
 *
 * POR QUE SE VALIDA DOS VECES
 * ----------------------------
 * Al guardar y otra vez justo antes de conectar. Entre una cosa y otra pueden
 * pasar semanas, y repuntar el DNS de un dominio propio hacia `127.0.0.1` es el
 * ataque clasico contra un guard que solo valida al registrar. `webhook_service`
 * ya lo hacia asi; esto lo iguala.
 *
 * EL GUARDIA YA EXISTIA
 * ---------------------
 * `safeEgressUrl.ts` estaba escrito y probado, y lo usaba UN solo servicio. El
 * defecto no era falta de herramienta: era no haberla aplicado aqui.
 */
import { describe, expect, it, vi } from "vitest";

import { assertSafeEgressUrl, isSafeEgressUrl } from "../safeEgressUrl";

/** Lo que un inquilino podria poner para alcanzar la red interna. */
const DESTINOS_PROHIBIDOS = [
  ["metadatos de la nube (AWS/GCP/Azure)", "http://169.254.169.254/latest/meta-data/"],
  ["metadatos de Google por nombre", "https://metadata.google.internal/computeMetadata/v1/"],
  ["la propia maquina", "https://localhost:8000/token"],
  ["loopback por IP", "https://127.0.0.1/token"],
  ["red privada RFC1918 (10/8)", "https://10.0.0.5/token"],
  ["red privada RFC1918 (172.16/12)", "https://172.20.1.1/token"],
  ["red privada RFC1918 (192.168/16)", "https://192.168.1.1/token"],
  ["CGNAT (100.64/10) — malla Tailscale", "https://100.100.0.1/token"],
  ["IPv6 loopback", "https://[::1]/token"],
  ["IPv6 link-local", "https://[fe80::1]/token"],
  ["IPv6 ULA", "https://[fd00::1]/token"],
  ["dominio .local (mDNS)", "https://postgres.local/token"],
  ["sufijo .localhost", "https://api.localhost/token"],
  ["esquema no HTTPS", "http://ejemplo.com/token"],
  ["URL con credenciales", "https://usuario:clave@ejemplo.com/token"],
  ["esquema file://", "file:///etc/passwd"],
  ["esquema gopher://", "gopher://127.0.0.1:11211/"],
] as const;

describe("guardia de salida", () => {
  it.each(DESTINOS_PROHIBIDOS)("rechaza %s", (_nombre, url) => {
    expect(isSafeEgressUrl(url)).toBe(false);
    expect(() => assertSafeEgressUrl(url)).toThrow();
  });

  it("EL CONTROL: un proveedor de identidad legitimo SI pasa", () => {
    // Sin esto, un guardia que rechazara TODO aprobaria las 17 pruebas de arriba
    // y romperia el SSO de todos los clientes. «Nadie puede salir» no es
    // proteccion, es una averia.
    for (const bueno of [
      "https://login.microsoftonline.com/tenant/oauth2/v2.0/token",
      "https://accounts.google.com/o/oauth2/token",
      "https://empresa.okta.com/oauth2/v1/token",
    ]) {
      expect(isSafeEgressUrl(bueno)).toBe(true);
    }
  });
});

describe("configuracion de SSO", () => {
  /**
   * El codigo del fallo, no solo «que fallo».
   *
   * La primera version de estas dos pruebas usaba `.rejects.toThrow()`. Sin el
   * guardia, `upsertConfig` sigue adelante hasta la CONEXION y tambien lanza
   * —ECONNREFUSED—, asi que pasaban igual con la validacion quitada: la mutacion
   * no las tumbaba y eran un falso verde.
   *
   * Lo que distingue «lo rechazo el guardia» de «se rompio mas adelante» es el
   * tipo y el codigo del error, no que haya error.
   */
  async function codigoDeFallo(config: Record<string, unknown>): Promise<string> {
    const { SaasSsoService, SaasSsoError } = await import("../SaasSsoService");
    const svc = new SaasSsoService({ query: vi.fn(async () => []) } as never);
    try {
      await svc.upsertConfig("t1", config as never);
      return "sin fallo";
    } catch (e) {
      if (e instanceof SaasSsoError) return (e as { code?: string }).code ?? "SIN_CODIGO";
      return `otro: ${(e as Error).message.slice(0, 40)}`;
    }
  }

  it("no se puede guardar un issuer que apunte a la red interna", async () => {
    expect(await codigoDeFallo({
      provider: "oidc",
      issuer: "http://169.254.169.254",
      clientId: "c", clientSecret: "s",
    })).toBe("VALIDATION");
  });

  it("tampoco un metadataUrl interno", async () => {
    expect(await codigoDeFallo({
      provider: "oidc",
      issuer: "https://accounts.google.com",
      metadataUrl: "https://127.0.0.1/.well-known/jwks.json",
      clientId: "c", clientSecret: "s",
    })).toBe("VALIDATION");
  });

  it("EL CONTROL: una configuracion legitima NO la rechaza el guardia", async () => {
    // Sin este control, un guardia que rechazara TODO aprobaria las dos pruebas
    // de arriba y romperia el SSO de todos los clientes sin que nada lo dijera.
    //
    // Se comprueba lo que importa —que la validacion no la rechaza— mirando el
    // TIPO de fallo, no montando una base: `SaasSsoService` construye su propio
    // cliente ademas del inyectado, asi que llega hasta la conexion. Que falle
    // por la CONEXION y no por VALIDATION es exactamente la prueba de que el
    // guardia la dejo pasar.
    const { SaasSsoService, SaasSsoError } = await import("../SaasSsoService");
    const svc = new SaasSsoService({ query: vi.fn(async () => []) } as never);

    let error: unknown;
    try {
      await svc.upsertConfig("t1", {
        provider: "oidc",
        issuer: "https://accounts.google.com",
        clientId: "c", clientSecret: "s",
      } as never);
    } catch (e) {
      error = e;
    }
    const esValidacion = error instanceof SaasSsoError
      && (error as { code?: string }).code === "VALIDATION";
    expect(esValidacion).toBe(false);
  });
});
