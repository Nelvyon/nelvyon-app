/**
 * BLOQUE 3 · ninguna carpeta de pruebas se queda fuera de la puerta.
 *
 * Este es el fallo que mas veces se ha repetido en el proyecto, y el que peor
 * pinta tiene cuando ocurre: la suite no se pone roja, sigue diciendo "passed",
 * y lo unico que cambia es que hay cobertura que no existe.
 *
 * Paso con `backend/auth` —el propio `vitest.config.ts` lo contaba en un
 * comentario— y volvio a pasar con `backend/config`, `backend/http` y
 * `backend/private-ai`. Esa ultima es la empresa IA autonoma entera: sus pruebas
 * estaban escritas y la puerta oficial no las ejecutaba.
 *
 * La causa era la forma del `include`: una LISTA de carpetas. Una lista hay que
 * acordarse de ampliarla, y nadie se acuerda de algo que no falla.
 *
 * Este guardian mira el arbol, no la lista: si existe una carpeta `__tests__`
 * con pruebas dentro y ningun patron del `include` la alcanza, falla.
 *
 * Y vive en `apps/web/src/`, no en `backend/`, A PROPOSITO. La primera version
 * estaba en `backend/qa/__tests__/` y al mutar el `include` para comprobar que
 * caia... no cayo: DESAPARECIO. Estrechar la lista dejaba fuera al propio
 * guardian, y una suite sin el fichero no falla, simplemente no lo ejecuta.
 *
 * `src/**` es la unica ruta que el `include` cubre siempre, porque es la de la
 * aplicacion. Un vigilante no puede estar dentro de lo que vigila.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, sep } from "node:path";

/**
 * Se BUSCA la raiz en vez de contar niveles con `..`.
 *
 * Contar niveles es fragil de una forma silenciosa: si el fichero se mueve una
 * carpeta, `RAIZ` apunta a otro sitio, el barrido encuentra CERO carpetas y el
 * guardian pasa —cero descubiertas sobre cero miradas—. Justo el falso verde
 * que este fichero existe para impedir.
 */
function raizDelProyecto(): string {
  let d = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) return d;
    const padre = dirname(d);
    if (padre === d) break;
    d = padre;
  }
  throw new Error("no se encuentra la raiz del proyecto");
}

const RAIZ = raizDelProyecto();
const CONFIG = join(RAIZ, "apps", "web", "vitest.config.ts");

/** Carpetas `__tests__` bajo `backend` que contienen al menos un `.test.ts`. */
function carpetasConPruebas(dir: string, acc: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch (e) {
    // Un `catch` mudo aqui devolveria cero carpetas ante CUALQUIER problema, y
    // cero carpetas hace pasar el guardian. Solo se silencia lo esperable —una
    // ruta que no existe o que no es carpeta—; lo demas tiene que verse.
    const codigo = (e as NodeJS.ErrnoException)?.code;
    if (codigo === "ENOENT" || codigo === "ENOTDIR") return acc;
    throw e;
  }
  let tienePruebas = false;
  for (const e of entradas) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === ".git") continue;
      carpetasConPruebas(p, acc);
    } else if (e.endsWith(".test.ts")) {
      tienePruebas = true;
    }
  }
  if (tienePruebas && dir.split(sep).includes("__tests__")) {
    acc.push(dir.replace(RAIZ, "").split(String.fromCharCode(92)).join("/"));
  }
  return acc;
}

function patronesDelInclude(): string[] {
  // Se extraen las cadenas que PARECEN un patron de fichero, sin recortar el
  // bloque del array: el propio patron de `src` lleva un `[jt]` dentro y
  // cualquier intento de buscar el cierre por el primer corchete se corta ahi.
  const texto = readFileSync(CONFIG, "utf8");
  const todas = [...texto.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
  return todas.filter((s) => s.includes("*") && (s.includes("__tests__") || s.startsWith("src/")));
}

/** ¿Alcanza alguno de los patrones a esta carpeta? */
function estaCubierta(carpeta: string, patrones: string[]): boolean {
  const ruta = carpeta.replace(/^\//, "");                  // backend/xxx/__tests__
  for (const p of patrones) {
    const limpio = p.replace(/^\.\.\/\.\.\//, "");          // quita el salto a la raíz
    // Un patrón cubre la carpeta si su parte fija es prefijo de ella, o si
    // lleva `**` antes del `__tests__` (comodín de profundidad).
    const fijo = limpio.split("**")[0]!.replace(/\/$/, "");
    if (!fijo) continue;
    if (ruta === fijo || ruta.startsWith(`${fijo}/`)) return true;
    if (limpio.includes("**/__tests__") && ruta.startsWith(fijo)) return true;
  }
  return false;
}

describe("BLOQUE 3 · la puerta no deja carpetas fuera", () => {
  it("EL CONTROL: el barrido encuentra carpetas de pruebas", () => {
    // Cero carpetas y cero descubiertas seria un verde sobre la nada, que es
    // justo el error que este fichero persigue.
    expect(carpetasConPruebas(join(RAIZ, "backend")).length).toBeGreaterThan(15);
  });

  it("EL CONTROL: se leen patrones del include", () => {
    expect(patronesDelInclude().length).toBeGreaterThan(0);
  });

  it("toda carpeta de pruebas de backend esta cubierta por el include", () => {
    const patrones = patronesDelInclude();
    const fuera = carpetasConPruebas(join(RAIZ, "backend"))
      .filter((c) => !estaCubierta(c, patrones));
    expect(fuera, "carpetas con pruebas que la puerta NO ejecuta").toEqual([]);
  });

  it("el detector reconoceria una carpeta descubierta si apareciera", () => {
    // Control positivo: cero carpetas fuera solo vale si el detector detecta.
    expect(estaCubierta("backend/inventada/__tests__", ["../../backend/saas/__tests__/**/*.test.ts"]))
      .toBe(false);
    expect(estaCubierta("backend/saas/__tests__", ["../../backend/saas/__tests__/**/*.test.ts"]))
      .toBe(true);
  });
});
