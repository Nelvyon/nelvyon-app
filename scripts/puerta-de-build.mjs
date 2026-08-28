#!/usr/bin/env node
/**
 * LA PUERTA DE BUILD.
 *
 * Por qué existe, con la evidencia delante. El árbol quedó certificado en el
 * Bloque 10 con 12.000 pruebas en verde y `next build` ROTO. No es una
 * casualidad: ninguna puerta lo ejecutaba. `pnpm gate` era
 * `typecheck && lint && test:smoke && test:bot-evals`, y Vitest ejecuta sin
 * empaquetar, así que una clase entera de fallos —los que sólo aparecen al
 * empaquetar o al validar rutas— era invisible para las 12.000.
 *
 * El resultado medido: producción se quedó en `f62916af` del 22 de agosto con
 * 159 commits sin desplegar, y los dos defectos que lo impedían los habían
 * introducido los propios commits de cierre de los Bloques 7 y 10.
 *
 * Esta puerta hace dos cosas, en este orden deliberado:
 *
 *   1. COMPROBACIONES ESTRUCTURALES (segundos). Cada una corresponde a un
 *      defecto que YA ocurrió. Son rápidas y dicen exactamente qué fichero y
 *      qué hacer, en vez de un error de TypeScript en un fichero generado.
 *   2. EL BUILD DE VERDAD (minutos). Porque una comprobación estructural sólo
 *      cubre lo que ya pasó, y la razón de la puerta es lo que aún no ha pasado.
 *
 * Las estructurales van primero para no gastar cinco minutos en descubrir algo
 * que se sabe en dos segundos. Pero pasarlas NO sustituye al build: sin el
 * paso 2 esta puerta sería otra checklist.
 *
 * USO
 *   node scripts/puerta-de-build.mjs              # estructurales + build real
 *   node scripts/puerta-de-build.mjs --solo-rapido  # sólo estructurales
 *
 * SALIDA
 *   0  el árbol compila y no tiene ninguno de los defectos conocidos
 *   1  alguna comprobación estructural ha fallado
 *   2  las estructurales pasan pero `next build` falla
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps", "web");
const SRC = path.join(WEB, "src");

const SOLO_RAPIDO = process.argv.includes("--solo-rapido");

const fallos = [];
const pasadas = [];

function comprueba(nombre, fn) {
  let r;
  try {
    r = fn();
  } catch (err) {
    r = { ok: false, detalle: `la comprobación reventó: ${err?.message ?? err}` };
  }
  if (r.ok) pasadas.push({ nombre, detalle: r.detalle });
  else fallos.push({ nombre, detalle: r.detalle, arreglo: r.arreglo });
}

/** Ficheros bajo un directorio, sin `node_modules` ni `.next`. */
function ficheros(dir, filtro) {
  const salida = [];
  const andar = (d) => {
    let entradas;
    try {
      entradas = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (filtro(e.name, p)) salida.push(p);
    }
  };
  andar(dir);
  return salida;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

// ═════════════════════════════════════════════════════════════════════════════
// 1 · Estructurales: un defecto real cada una
// ═════════════════════════════════════════════════════════════════════════════

/**
 * DEFECTO 1, ocurrido. Next.js trata TODO fichero bajo `pages/api` como una
 * ruta de API y le exige un `export default` handler — incluidos los que están
 * en `__tests__`. Un test ahí dentro rompe `next build` con un TS2344 dentro de
 * `.next/types/validator.ts`, un fichero generado que nadie escribió y que no
 * dice qué hacer. Vitest, en cambio, lo ejecuta tan contento.
 *
 * Ocurrió con `src/pages/api/os/__tests__/elCanalEnVivoDeOtroInquilino.test.ts`.
 */
comprueba("ningún test vive bajo pages/api", () => {
  const dirPages = path.join(SRC, "pages", "api");
  if (!fs.existsSync(dirPages)) return { ok: true, detalle: "no hay pages/api" };
  const tests = ficheros(dirPages, (n) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(n));
  if (tests.length === 0) {
    return { ok: true, detalle: "0 ficheros de prueba bajo src/pages/api" };
  }
  return {
    ok: false,
    detalle: `${tests.length} fichero(s) de prueba bajo src/pages/api: ${tests.map(rel).join(", ")}`,
    arreglo:
      "muévelos fuera de pages/api (p. ej. src/__tests__/pages-api/) e importa la ruta con el alias @/",
  };
});

/**
 * DEFECTO 2, ocurrido. `next build` ejecuta ESLint sobre TODO lo que hay bajo
 * `src`, tests incluidos, y falla el build entero con un error de estilo. Un
 * `require()` en un test tumbó el build sin que ninguna prueba se pusiera roja.
 *
 * Ocurrió con `src/lib/integrations/__tests__/terminarElFlujoDeOtro.test.ts`.
 *
 * Esto NO reimplementa ESLint: comprueba la regla concreta que ya rompió el
 * build. El paso 2 sigue ejecutando el lint de verdad.
 */
comprueba("ningún require() de estilo CommonJS en src", () => {
  const fuentes = ficheros(SRC, (n) => /\.[cm]?[jt]sx?$/.test(n));
  const malos = [];
  for (const f of fuentes) {
    const texto = fs.readFileSync(f, "utf8");
    // Sin comentarios: una regla que casa dentro de un comentario mide el
    // comentario, no el código.
    const limpio = texto
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    if (/(?:^|[^.\w])require\s*\(\s*["']/.test(limpio)) malos.push(f);
  }
  if (malos.length === 0) return { ok: true, detalle: `0 en ${fuentes.length} ficheros` };
  return {
    ok: false,
    detalle: `${malos.length} fichero(s) con require(): ${malos.slice(0, 5).map(rel).join(", ")}`,
    arreglo: "usa un import de nivel superior; @typescript-eslint/no-require-imports rompe el build",
  };
});

/**
 * DEFECTO 3, ocurrido, y el más caro de los tres. Veintinueve servicios de
 * `backend/` obtenían la conexión así:
 *
 *   const { DbClient } = require("../db/DbClient") as { ... };
 *   _instance = new Servicio(DbClient.getInstance());
 *
 * En el bundle de servidor de Next, ese `require` devuelve un objeto sin
 * `DbClient`, así que la desestructuración da `undefined` y la llamada revienta
 * con `Cannot read properties of undefined (reading 'getInstance')`. Siete
 * rutas de `/api/saas` devolvían 500 a cualquier inquilino nuevo por esto, y no
 * lo veía nadie: Vitest ejecuta sin empaquetar, así que el mismo código pasa
 * doce mil pruebas y falla al desplegarse.
 *
 * Los servicios que SÍ funcionan usan un import estático de nivel superior.
 * `DbClient` sólo importa `pg` y dos módulos puros: no hay ciclo que romper, así
 * que el `require` perezoso nunca estuvo justificado.
 *
 * La regla se limita a `db/DbClient` a propósito. Otros `require` perezosos del
 * árbol pueden estar rompiendo ciclos reales entre servicios; prohibirlos todos
 * aquí sería una regla que no se puede cumplir, y una regla así se acaba
 * desactivando entera.
 */
comprueba("ningún require() perezoso de DbClient en backend", () => {
  const dirBackend = path.join(ROOT, "backend");
  const fuentes = ficheros(dirBackend, (n) => n.endsWith(".ts") && !n.includes(".test."));
  const malos = [];
  for (const f of fuentes) {
    if (f.includes(`${path.sep}__tests__${path.sep}`)) continue;
    const texto = fs.readFileSync(f, "utf8");
    const limpio = texto
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    if (/require\s*\(\s*["'][^"']*db\/DbClient["']/.test(limpio)) malos.push(f);
  }
  if (malos.length === 0) {
    return { ok: true, detalle: `0 en ${fuentes.length} ficheros de backend` };
  }
  return {
    ok: false,
    detalle: `${malos.length} servicio(s) piden DbClient con require(): ${malos.slice(0, 5).map(rel).join(", ")}`,
    arreglo: 'usa `import { DbClient } from "../db/DbClient"` — el require devuelve undefined en el bundle',
  };
});

/**
 * DEFECTO 4, la causa raíz de que los otros llegaran a certificarse.
 * Comprueba que el guion `gate` invoque de verdad a esta puerta. Sin esto, la
 * puerta existe y nadie la llama, que es exactamente donde estábamos.
 */
comprueba("el guion `gate` invoca esta puerta", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(WEB, "package.json"), "utf8"));
  const gate = String(pkg.scripts?.gate ?? "");
  if (gate.includes("puerta-de-build") || gate.includes("gate:build")) {
    return { ok: true, detalle: gate };
  }
  return {
    ok: false,
    detalle: `apps/web package.json → scripts.gate = "${gate}"`,
    arreglo: "añade `gate:build` a la cadena de `gate`",
  };
});

/**
 * DEFECTO 5, latente. El `typecheck` del repo (`tsc --noEmit`) lee
 * `.next/types/validator.ts`, que sólo existe DESPUÉS de un build. Ejecutado
 * sobre un árbol limpio mide menos de lo que cree medir, y ejecutado sobre un
 * `.next` viejo mide un árbol que ya no existe. Se avisa, no se bloquea: no es
 * un defecto del código sino del orden en que se ejecutan las cosas.
 */
comprueba("aviso: el typecheck depende de un build previo", () => {
  const validator = path.join(WEB, ".next", "types", "validator.ts");
  if (!fs.existsSync(validator)) {
    return {
      ok: true,
      detalle: "no hay .next/types — `pnpm typecheck` a solas NO valida las rutas; este build lo genera",
    };
  }
  const edad = Date.now() - fs.statSync(validator).mtimeMs;
  const horas = Math.round(edad / 3_600_000);
  return { ok: true, detalle: `.next/types/validator.ts tiene ${horas} h` };
});

// ═════════════════════════════════════════════════════════════════════════════
// Informe de las estructurales
// ═════════════════════════════════════════════════════════════════════════════

console.log("PUERTA DE BUILD · comprobaciones estructurales");
console.log("─".repeat(78));
for (const p of pasadas) console.log(`  OK    ${p.nombre}${p.detalle ? ` — ${p.detalle}` : ""}`);
for (const f of fallos) {
  console.log(`  FALLA ${f.nombre}`);
  console.log(`        ${f.detalle}`);
  if (f.arreglo) console.log(`        arreglo: ${f.arreglo}`);
}
console.log("─".repeat(78));

if (fallos.length > 0) {
  console.log(`\n${fallos.length} comprobación(es) estructural(es) fallan. El build no se ejecuta.`);
  process.exit(1);
}

if (SOLO_RAPIDO) {
  console.log("\n--solo-rapido: NO se ha ejecutado `next build`.");
  console.log("Pasar las estructurales NO demuestra que el árbol compile.");
  process.exit(0);
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · El build de verdad
// ═════════════════════════════════════════════════════════════════════════════

console.log("\nEjecutando `next build` de verdad. Tarda varios minutos.\n");

const t0 = Date.now();
const r = spawnSync("pnpm", ["build"], {
  cwd: WEB,
  stdio: "inherit",
  shell: process.platform === "win32",
});
const segundos = Math.round((Date.now() - t0) / 1000);

if (r.status !== 0) {
  console.log(`\n${"─".repeat(78)}`);
  console.log(`BUILD ROTO tras ${segundos}s (código ${r.status}). El árbol NO es certificable.`);
  process.exit(2);
}

console.log(`\n${"─".repeat(78)}`);
console.log(`BUILD OK en ${segundos}s. El árbol compila y es desplegable.`);
process.exit(0);
