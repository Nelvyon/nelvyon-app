/**
 * DOS PRUEBAS NO COMPARTEN INQUILINO.
 *
 * DE DÓNDE SALE ESTO. El recorrido multiservicio empezó a fallar sólo en la
 * suite completa, y sólo en uno de los trece servicios. Aislado pasaba. La
 * causa: `elCerebroNoSeInventaNada` y `todosLosServiciosPorElMismoCableado`
 * declaraban el mismo `workspace_id`, y los dos borran `os_client_brain` de su
 * inquilino en `beforeEach`. Corriendo en paralelo, uno vaciaba el cerebro que
 * el otro acababa de rellenar.
 *
 * POR QUÉ MERECE UNA PRUEBA PROPIA. Porque un fallo intermitente es peor que
 * uno franco: enseña a reintentar en vez de a mirar. Y porque la siguiente
 * colisión llegará igual —alguien copiará un fichero de pruebas y le cambiará
 * el nombre pero no las constantes—, y entonces se perderán otra vez dos horas
 * en encontrarla.
 *
 * CÓMO SE COMPRUEBA. El inventario SALE DEL ÁRBOL: se recorren los ficheros
 * `*.pg.test.ts` y se leen sus constantes de inquilino. Un fichero nuevo entra
 * solo. Una lista escrita a mano se quedaría vieja el primer día.
 *
 * LO QUE NO PROHÍBE. Que un fichero use varios inquilinos —hace falta para
 * probar el aislamiento— ni que dos ficheros compartan tabla. Sólo persigue lo
 * que produce interferencia: el mismo inquilino en dos ficheros distintos.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..", "..");

/** Los ficheros de prueba contra PostgreSQL real, recorriendo el árbol. */
function pruebasContraPostgres(dir: string): string[] {
  const fuera: string[] = [];
  const recorrer = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        recorrer(p);
      } else if (e.name.endsWith(".pg.test.ts")) {
        fuera.push(p);
      }
    }
  };
  recorrer(dir);
  return fuera.sort();
}

/**
 * Los inquilinos que declara un fichero.
 *
 * Se buscan constantes de nivel superior cuyo nombre habla de workspace y cuyo
 * valor es un número. Deliberadamente estrecho: si el patrón no reconoce una
 * forma nueva, el fichero no aporta inquilinos y la prueba deja de protegerlo —
 * de ahí el control positivo de abajo, que exige que se encuentren bastantes.
 */
function inquilinosDe(fichero: string): number[] {
  const texto = fs.readFileSync(fichero, "utf8").replace(/\r\n/g, "\n");
  const encontrados: number[] = [];
  const re = /^const\s+(WS|WS_[A-Z_]+|WORKSPACE[A-Z_]*)\s*=\s*(\d+)\s*;/gm;
  for (const m of texto.matchAll(re)) {
    const n = Number(m[2]);
    // Los inquilinos de juguete (1, 42) los usa medio árbol para casos que no
    // tocan la base. Sólo interesan los identificadores de escenario reales.
    if (n >= 1000) encontrados.push(n);
  }
  return [...new Set(encontrados)];
}

describe("dos pruebas no comparten inquilino", () => {
  const ficheros = pruebasContraPostgres(path.join(RAIZ, "backend"));
  const porInquilino = new Map<number, string[]>();

  for (const f of ficheros) {
    for (const ws of inquilinosDe(f)) {
      const rel = path.relative(RAIZ, f).replace(/\\/g, "/");
      porInquilino.set(ws, [...(porInquilino.get(ws) ?? []), rel]);
    }
  }

  it("hay ficheros y hay inquilinos: el barrido mira algo", () => {
    // Sin esto, un cambio de nombres dejaría la comprobación mirando el vacío y
    // pasando siempre. Un guardián que no mira es peor que ninguno.
    expect(ficheros.length, "no se encuentran pruebas .pg.test.ts").toBeGreaterThan(10);
    expect(
      porInquilino.size,
      "no se ha reconocido ni un inquilino: el patrón ya no casa con cómo se declaran",
    ).toBeGreaterThan(10);
  });

  it("ningún workspace aparece en dos ficheros distintos", () => {
    const compartidos = [...porInquilino.entries()]
      .filter(([, fs_]) => new Set(fs_).size > 1)
      .map(([ws, fs_]) => `${ws} → ${[...new Set(fs_)].join(" y ")}`);

    expect(
      compartidos,
      "Estos ficheros comparten inquilino. Corriendo en paralelo se borran los " +
      "datos entre ellos, y el resultado es una prueba que falla a veces — que " +
      "enseña a reintentar en vez de a mirar. Dale a cada fichero un workspace suyo.",
    ).toEqual([]);
  });
});
