/**
 * Forma de las sondas de salud.
 *
 * Railway usa `/api/health/live` como healthcheck con
 * `restartPolicyType = ON_FAILURE` y hasta 10 reintentos. Si esa sonda
 * consultara la base de datos, un corte de BD dejaria de ser una degradacion
 * para convertirse en un BUCLE DE REINICIOS: el proceso esta sano, la sonda
 * falla, Railway reinicia, y vuelta a empezar — justo cuando lo que hace falta
 * es que el servicio siga en pie para poder recuperarse.
 *
 * La division correcta ya estaba: `live` responde con el proceso vivo, y
 * `ready` es quien mira BD, auth y variables de produccion, devolviendo 503.
 * Este fichero la fija, porque anadir una comprobacion a `live` PARECE una
 * mejora y es justo lo contrario.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(__dirname, "..");

function fuente(sonda: string): string {
  return readFileSync(join(DIR, sonda, "route.ts"), "utf8");
}

describe("sondas de salud", () => {
  it("la sonda de vida no toca la base de datos", () => {
    const src = fuente("live");
    for (const dependencia of ["checkDatabase", "query(", "prisma", "await fetch("]) {
      expect(src).not.toContain(dependencia);
    }
  });

  it("la sonda de vida no depende de configuracion externa", () => {
    const src = fuente("live");
    expect(src).not.toContain("validateProductionEnv");
    expect(src).toContain("ok: true");
  });

  it("la sonda de preparacion SI comprueba las dependencias", () => {
    // Contraprueba: si nadie las comprueba, acabarian colandose en `live`.
    const src = fuente("ready");
    expect(src).toContain("checkDatabase");
    expect(src).toContain("checkAuthConfig");
  });

  it("la sonda de preparacion responde 503 cuando no esta lista", () => {
    const src = fuente("ready");
    expect(src).toContain("503");
    expect(src).toContain("not_ready");
  });

  it("la preparacion valida el entorno solo en produccion", () => {
    const src = fuente("ready");
    expect(src).toContain("validateProductionEnv");
    expect(src).toContain('NODE_ENV === "production"');
  });

  it("ninguna sonda se cachea", () => {
    // Una sonda cacheada informa del pasado, que es peor que no informar.
    for (const sonda of ["live", "ready"]) {
      expect(fuente(sonda)).toContain("force-dynamic");
    }
  });
});
