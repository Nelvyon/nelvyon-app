#!/usr/bin/env node
/**
 * QUÉ MÓDULOS SOSTIENEN MUCHO Y NO LOS PRUEBA NADIE. **SOLO LECTURA.**
 *
 * DE DÓNDE SALE ESTA HERRAMIENTA. `agentLanguage.ts` decidía en qué idioma se
 * le entrega el trabajo a un cliente. Tenía un defecto que mandaba a los
 * alemanes su entregable en inglés, y llevaba ahí desde siempre. La razón de
 * que sobreviviera no fue que el defecto fuera sutil —lo delataban diez frases—
 * sino que **ese fichero no tenía ni una sola prueba**.
 *
 * Así que la pregunta útil no es «¿cuánta cobertura tenemos?», que es un
 * porcentaje que sube regando de pruebas lo fácil. Es:
 *
 *     ¿de qué módulos depende medio sistema sin que nadie los compruebe?
 *
 * Ahí es donde vive el próximo fallo de esta clase.
 *
 * CÓMO SE MIDE:
 *
 *   IMPORTADORES .. cuántos ficheros lo importan. Es el radio de daño: si se
 *                   equivoca, cuánta gente se equivoca con él.
 *   PRUEBAS ....... cuántos ficheros de prueba lo importan, directamente o a
 *                   través del `index` de su carpeta.
 *   RIESGO ........ importadores de los que NADIE prueba.
 *
 * POR QUÉ MIRA EL `index` TAMBIÉN. Media base de código importa
 * `@nelvyon/os-agents` en vez del fichero suelto. Contar sólo la ruta exacta
 * diría que casi nada está probado, y un informe que exagera se ignora igual
 * que uno que se queda corto.
 *
 * LO QUE NO ES. No mide cobertura de líneas: un fichero puede estar importado
 * por una prueba que no ejercita nada suyo. Es un mapa de dónde mirar, no un
 * certificado. Dice dónde es probable que haya algo sin comprobar; confirmarlo
 * es leer el fichero.
 *
 * COSTE: 0 €. Lee ficheros.
 *
 * USO
 *   node scripts/donde-vive-el-proximo-fallo.mjs
 *   node scripts/donde-vive-el-proximo-fallo.mjs --json
 *   node scripts/donde-vive-el-proximo-fallo.mjs --min 5
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();

/** El inventario sale del árbol: una lista a mano se queda corta y no avisa. */
export function ficherosDeCodigo(raiz = RAIZ) {
  try {
    return execFileSync("git", ["ls-files", "backend/**/*.ts", "apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"], {
      cwd: raiz,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\n")
      .filter(Boolean)
      .filter((f) => !f.endsWith(".d.ts"));
  } catch {
    return [];
  }
}

export const esPrueba = (f) => /__tests__|\.test\.tsx?$|\.spec\.tsx?$/.test(f);

/** Los módulos que un fichero importa, tal como los escribe. */
function especificadores(texto) {
  const limpio = texto.replace(/\r\n/g, "\n");
  const fuera = [];
  for (const m of limpio.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)) fuera.push(m[1]);
  for (const m of limpio.matchAll(/^\s*export\s[^;]*?from\s+["']([^"']+)["']/gm)) fuera.push(m[1]);
  for (const m of limpio.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) fuera.push(m[1]);
  return fuera;
}

/**
 * A qué fichero del repositorio apunta un especificador.
 *
 * Se resuelven las rutas relativas y los alias del proyecto. Lo que apunte a
 * `node_modules` se descarta: no es nuestro y no vamos a probarlo.
 */
function resolver(desde, spec, existentes) {
  let base = null;
  if (spec.startsWith(".")) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(desde), spec));
  } else if (spec.startsWith("@/")) {
    base = path.posix.join("apps/web/src", spec.slice(2));
  } else if (spec.startsWith("@nelvyon/")) {
    base = path.posix.join("backend", spec.slice("@nelvyon/".length));
  } else {
    return null;
  }
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existentes.has(cand)) return cand;
  }
  return null;
}

export function analizar(raiz = RAIZ) {
  const ficheros = ficherosDeCodigo(raiz);
  const existentes = new Set(ficheros.map((f) => f.replace(/\\/g, "/")));

  const importadores = new Map(); // fichero -> Set de quien lo importa
  const importadoresDePrueba = new Map();
  const anota = (destino, origen) => {
    if (!importadores.has(destino)) importadores.set(destino, new Set());
    importadores.get(destino).add(origen);
    if (esPrueba(origen)) {
      if (!importadoresDePrueba.has(destino)) importadoresDePrueba.set(destino, new Set());
      importadoresDePrueba.get(destino).add(origen);
    }
  };

  for (const f of ficheros) {
    const abs = path.join(raiz, f);
    if (!fs.existsSync(abs)) continue;
    const rel = f.replace(/\\/g, "/");
    for (const spec of especificadores(fs.readFileSync(abs, "utf8"))) {
      const destino = resolver(rel, spec, existentes);
      if (destino && destino !== rel) anota(destino, rel);
    }
  }

  // Un `index` que reexporta cuenta como puente: si una prueba importa el
  // índice, lo que el índice reexporta queda alcanzado.
  const reexporta = new Map();
  for (const f of ficheros) {
    if (!/\/index\.tsx?$/.test(f)) continue;
    const abs = path.join(raiz, f);
    if (!fs.existsSync(abs)) continue;
    const rel = f.replace(/\\/g, "/");
    const hijos = especificadores(fs.readFileSync(abs, "utf8"))
      .map((s) => resolver(rel, s, existentes))
      .filter(Boolean);
    reexporta.set(rel, hijos);
  }
  for (const [indice, hijos] of reexporta) {
    for (const prueba of importadoresDePrueba.get(indice) ?? []) {
      for (const hijo of hijos) {
        if (!importadoresDePrueba.has(hijo)) importadoresDePrueba.set(hijo, new Set());
        importadoresDePrueba.get(hijo).add(`${prueba} (via ${path.posix.basename(indice)})`);
      }
    }
  }

  const filas = ficheros
    .map((f) => f.replace(/\\/g, "/"))
    .filter((f) => !esPrueba(f))
    .map((f) => ({
      fichero: f,
      importadores: (importadores.get(f) ?? new Set()).size,
      pruebas: (importadoresDePrueba.get(f) ?? new Set()).size,
    }))
    .map((r) => ({ ...r, riesgo: r.pruebas === 0 ? r.importadores : 0 }))
    .sort((a, b) => b.riesgo - a.riesgo || b.importadores - a.importadores);

  return { total: ficheros.length, filas };
}

function main() {
  const comoJson = process.argv.includes("--json");
  const i = process.argv.indexOf("--min");
  const minimo = i >= 0 ? Number(process.argv[i + 1]) : 4;

  const { total, filas } = analizar();
  if (total === 0) {
    console.log("NO SE HA LEIDO NINGUN FICHERO. Eso no es un PASS.");
    process.exit(3);
  }
  const enRiesgo = filas.filter((f) => f.riesgo >= minimo);

  if (comoJson) {
    console.log(JSON.stringify({ total, minimo, enRiesgo }, null, 2));
    process.exit(0);
  }

  console.log("DONDE VIVE EL PROXIMO FALLO\n");
  console.log(`  ficheros de codigo analizados : ${total}`);
  console.log(`  sin ninguna prueba que los importe, con ${minimo}+ dependientes: ${enRiesgo.length}\n`);
  console.log(`  ${"importadores".padStart(12)}  fichero`);
  for (const f of enRiesgo.slice(0, 40)) {
    console.log(`  ${String(f.importadores).padStart(12)}  ${f.fichero}`);
  }
  if (enRiesgo.length > 40) console.log(`  ... y ${enRiesgo.length - 40} mas`);
  console.log("");
  console.log("Esto no dice que esten mal. Dice donde nadie ha mirado.");
}

const invocadoDirectamente =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invocadoDirectamente) main();
