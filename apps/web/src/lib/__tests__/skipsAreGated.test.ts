/**
 * Ningun test esta desactivado; los que no corren estan PUERTAS a infraestructura.
 *
 * La suite reporta 42 tests y 4 ficheros como "skipped", y esa cifra no dice
 * por si sola si falta cobertura o si sobra infraestructura. Al revisarlos uno
 * a uno, todos resultan condicionados a que exista una base PostgreSQL:
 *
 *   ErpDomainSnapshotStore   DATABASE_URL
 *   migration523.pg          MIG523_TEST_DATABASE_URL
 *   rls                      RUN_SUPABASE_RLS
 *   rlsIsolation.pg          LOCAL_AI_TEST_DATABASE_URL
 *   localAiPhase2            LOCAL_AI_DATABASE_URL / RUN_LOCAL_AI_INTEGRATION
 *
 * Tres de ellos son de seguridad —aislamiento RLS y constraints de la migracion
 * 523—, lo que confirma por que los bloques de PostgreSQL no pueden certificarse
 * mientras Docker no responda: sus pruebas existen y estan escritas, pero no hay
 * donde ejecutarlas.
 *
 * Este guard vigila la FORMA: un `describe.skip(` sin condicion es un test
 * apagado, y eso si seria perdida de cobertura disfrazada de skip.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..", "..", "..", "..", "..");

function ficherosDeTest(dir: string, acc: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const e of entradas) {
    if (e === "node_modules" || e === ".next" || e === ".git") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) ficherosDeTest(p, acc);
    else if (/\.(test|spec)\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}

/** `describe.skip(` al principio de linea: apagado, no condicionado. */
const SKIP_INCONDICIONAL = /^\s*(describe|it|test)\.skip\s*\(/m;

describe("skips", () => {
  it("el barrido encuentra ficheros de test", () => {
    // Sin esto, una ruta mal formada daria cero y pareceria limpio.
    const ficheros = [
      ...ficherosDeTest(join(RAIZ, "apps", "web", "src")),
      ...ficherosDeTest(join(RAIZ, "backend")),
    ];
    expect(ficheros.length).toBeGreaterThan(100);
  });

  it("ningun test esta apagado incondicionalmente", () => {
    const culpables: string[] = [];
    for (const base of [join(RAIZ, "apps", "web", "src"), join(RAIZ, "backend")]) {
      for (const f of ficherosDeTest(base)) {
        if (SKIP_INCONDICIONAL.test(readFileSync(f, "utf8"))) {
          culpables.push(f.replace(RAIZ, "").split(String.fromCharCode(92)).join("/"));
        }
      }
    }
    expect(culpables).toEqual([]);
  });

  it("el detector reconoceria un skip apagado si apareciera", () => {
    // Positivo conocido: cero culpables solo vale si el patron detecta.
    expect(SKIP_INCONDICIONAL.test('describe.skip("algo", () => {})')).toBe(true);
    expect(SKIP_INCONDICIONAL.test('(hasDb ? describe : describe.skip)("x", () => {})')).toBe(false);
  });
});
