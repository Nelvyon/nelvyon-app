/**
 * Aislamiento de proveedor de Ads en el lado Node.
 *
 * El lado Python tenia el defecto y ya se cerro: `google_ads_service.py`,
 * `meta_ads_service.py`, `snapchat_ads_service.py` y `tiktok_ads_service.py`
 * leen una CUENTA publicitaria de variables de entorno globales, de modo que
 * cualquier workspace acababa operando la cuenta corporativa de NELVYON. Se
 * resolvio con `core/ads_integration.py`, que falla cerrado.
 *
 * Este fichero certifica que el lado Node NO tiene ese defecto, y lo fija.
 *
 * Lo que se midio: ninguna superficie Node lee `GOOGLE_ADS_CUSTOMER_ID`,
 * `META_AD_ACCOUNT_ID`, `SNAPCHAT_AD_ACCOUNT_ID` ni `TIKTOK_ADVERTISER_ID`.
 * `GoogleAdsExecutor` resuelve credencial con `oauth.getConnection(userId,
 * "google")` y lanza "Google account not connected" cuando no hay: es el patron
 * correcto, sin fallback. El `developer-token` que si es global identifica al
 * CLIENTE de la API de Google, no a una cuenta de anuncios, y por eso no cuenta.
 *
 * `connectorRegistry.ts` NOMBRA `GOOGLE_ADS_CUSTOMER_ID` en `envKeys`, pero eso
 * es metadatos del catalogo de conectores, no una lectura. El detector distingue
 * ambas cosas: busca `process.env.X`, no la aparicion del nombre.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Identificadores de CUENTA publicitaria. Nunca deben salir del entorno. */
const CUENTAS_CORPORATIVAS = [
  "GOOGLE_ADS_CUSTOMER_ID",
  "META_AD_ACCOUNT_ID",
  "SNAPCHAT_AD_ACCOUNT_ID",
  "TIKTOK_ADVERTISER_ID",
];

/**
 * Credenciales de APLICACION: identifican a NELVYON como cliente de la API,
 * no una cuenta sobre la que operar. Son globales por definicion y correctas.
 */
const CREDENCIALES_DE_APLICACION = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_OAUTH_CLIENT_ID",
  "META_APP_ID",
  "TIKTOK_APP_ID",
];

const RAIZ = join(__dirname, "..", "..", "..", "..", "..");

function ficherosTs(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada === ".next" || entrada === "dist") continue;
    const p = join(dir, entrada);
    const st = statSync(p);
    if (st.isDirectory()) ficherosTs(p, acc);
    else if (/\.tsx?$/.test(entrada) && !/__tests__/.test(p)) acc.push(p);
  }
  return acc;
}

function lecturasDeEntorno(patrones: string[]): Array<[string, string]> {
  const hallazgos: Array<[string, string]> = [];
  const re = new RegExp(`process\\.env\\.(${patrones.join("|")})\\b`);
  for (const base of ["apps/web/src", "backend/integrations", "backend/os-agents"]) {
    let ficheros: string[];
    try {
      ficheros = ficherosTs(join(RAIZ, base));
    } catch {
      continue; // ruta ausente: lo detecta el test de vitalidad
    }
    for (const f of ficheros) {
      const m = re.exec(readFileSync(f, "utf8"));
      if (m) hallazgos.push([f.replace(RAIZ, "").replace(/\\/g, "/"), m[1]]);
    }
  }
  return hallazgos;
}

describe("aislamiento de proveedor de Ads (lado Node)", () => {
  it("el barrido llega de verdad al codigo", () => {
    // Sin esto, una ruta mal formada daria cero hallazgos y pareceria limpio.
    const ficheros = ficherosTs(join(RAIZ, "backend/integrations"));
    expect(ficheros.length).toBeGreaterThan(10);
    expect(ficheros.some((f) => f.includes("GoogleAdsExecutor"))).toBe(true);
  });

  it("el detector esta vivo: encuentra las credenciales de aplicacion", () => {
    // Contraprueba del test siguiente. Si el regex estuviese roto, "cero
    // cuentas corporativas" no probaria nada; aqui SI debe encontrar algo.
    const encontradas = lecturasDeEntorno(CREDENCIALES_DE_APLICACION);
    expect(encontradas.length).toBeGreaterThan(0);
  });

  it("ninguna superficie Node lee una cuenta publicitaria corporativa", () => {
    const hallazgos = lecturasDeEntorno(CUENTAS_CORPORATIVAS);
    expect(hallazgos).toEqual([]);
  });

  it("GoogleAdsExecutor resuelve la credencial del propio usuario y falla cerrado", () => {
    const src = readFileSync(
      join(RAIZ, "backend/integrations/google/GoogleAdsExecutor.ts"),
      "utf8",
    );
    expect(src).toContain('this.oauth.getConnection(userId, "google")');
    expect(src).toContain('throw new Error("Google account not connected")');
    // Lo que no puede aparecer: una cuenta de reserva cuando no hay conexion.
    for (const cuenta of CUENTAS_CORPORATIVAS) {
      expect(src).not.toContain(cuenta);
    }
  });
});
