#!/usr/bin/env node
/**
 * ¿CUÁNTO DE LOS AGENTES SECTORIALES ES ESPECIALIZACIÓN Y CUÁNTO ES COPIA?
 *
 * El diagnóstico dijo que 1.994 ficheros de agente reducen a ~247 esqueletos.
 * Ese número no sirve para decidir una migración: dice que hay repetición, no
 * QUÉ se pierde al colapsarla. Esta herramienta responde lo que sí hace falta
 * antes de tocar nada:
 *
 *   1. Cuántos ficheros hay, y cuántas formas distintas de código.
 *   2. Qué parte de cada fichero es ESTRUCTURA (idéntica entre ficheros) y qué
 *      parte es CONTENIDO (los literales, que son la especialización real).
 *   3. Cuáles NO encajan en su familia: las excepciones de verdad, las que una
 *      migración a ciegas rompería.
 *
 * CÓMO SE MIDE LA FORMA. Se sustituye todo literal de cadena, todo número y
 * todo identificador propio del sector por un marcador, y se aplasta el
 * espaciado. Dos ficheros con la misma forma hacen exactamente lo mismo con
 * datos distintos, y eso es un agente parametrizable. Un fichero cuya forma
 * sólo aparece una vez hace algo que ningún otro hace: ése es el que hay que
 * mirar a mano.
 *
 * NO MIGRA NADA. No escribe en el árbol. Sólo mide.
 *
 * USO
 *   node scripts/derivar-equivalencia-de-agentes.mjs
 *   node scripts/derivar-equivalencia-de-agentes.mjs --unicos   # los que no encajan
 *   node scripts/derivar-equivalencia-de-agentes.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_AGENTES = path.join(ROOT, "backend", "os-agents", "sectors");

const SOLO_UNICOS = process.argv.includes("--unicos");
const COMO_JSON = process.argv.includes("--json");

function ficheros(dir) {
  const salida = [];
  const andar = (d) => {
    let entradas;
    try {
      entradas = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      if (e.name === "node_modules" || e.name === "__tests__") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) salida.push(p);
    }
  };
  andar(dir);
  return salida;
}

/** El texto sin comentarios: un comentario distinto no es una función distinta. */
function sinComentarios(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * La FORMA: qué hace el fichero, sin qué datos usa.
 *
 * Se borran los literales y los números —que son el contenido— y se neutralizan
 * los nombres propios del agente, porque `runDentalSeoAgent` y
 * `runFitnessSeoAgent` son la misma función.
 *
 * MEDIR ESTO MAL CUESTA CARO, y ya pasó. La primera versión neutralizaba sólo
 * el nombre de la CARPETA y daba «65 % de ficheros con forma única». Pero
 * `sectors/agenciasmarketing/` contiene `AgencySEOAgent.ts`, cuyos
 * identificadores dicen `Agency`, no `AgenciasMarketing`: dos ficheros que son
 * la misma máquina salían como formas distintas, y con ese número la conclusión
 * habría sido «no se puede colapsar», que es la contraria a la verdadera.
 */
function forma(texto, sector, nombreFichero) {
  let t = sinComentarios(texto);
  t = t.replace(/`(?:[^`\\]|\\.)*`/g, "«S»");
  t = t.replace(/"(?:[^"\\]|\\.)*"/g, "«S»");
  t = t.replace(/'(?:[^'\\]|\\.)*'/g, "«S»");
  t = t.replace(/\b\d[\d_.]*\b/g, "«N»");
  for (const token of tokensDeIdentidad(sector, nombreFichero)) {
    t = t.replace(new RegExp(token, "gi"), "«SECTOR»");
  }
  return t.replace(/\s+/g, " ").trim();
}

/**
 * Palabras que describen el ROL de un agente, no su sector. Éstas NO se
 * neutralizan: dos agentes con rol distinto no son la misma máquina aunque
 * compartan sector, y borrarlas fundiría un agente de SEO con uno de email.
 */
const ROLES_CONOCIDOS = new Set([
  "agent", "seo", "email", "ads", "social", "analytics", "reviews", "precios",
  "content", "contenido", "report", "reporte", "web", "chatbot", "bot", "crm",
  "audiencias", "creatividades", "optimizacion", "attribution", "google",
  "meta", "tiktok", "shared", "core", "index", "types", "service", "readiness",
]);

/** Los nombres propios de un agente: su carpeta y los segmentos de su fichero. */
function tokensDeIdentidad(sector, nombreFichero) {
  const tokens = new Set();
  const limpio = (v) => v.replace(/[^a-z0-9]/gi, "");

  if (sector) {
    const s = limpio(sector);
    if (s.length > 2) tokens.add(s);
  }

  const base = (nombreFichero ?? "").replace(/\.ts$/, "");
  for (const seg of base.split(/(?=[A-Z])/)) {
    const s = limpio(seg);
    if (s.length > 2 && !ROLES_CONOCIDOS.has(s.toLowerCase())) tokens.add(s);
  }

  // Los más largos primero: neutralizar "Agency" antes que "AgencyCert"
  // partiría el segundo por la mitad y dejaría un resto que ensucia la forma.
  return [...tokens].sort((a, b) => b.length - a.length);
}

/** El CONTENIDO: los literales, que es la especialización que no se puede perder. */
function literales(texto) {
  const t = sinComentarios(texto);
  const out = [];
  for (const re of [/`(?:[^`\\]|\\.)*`/g, /"(?:[^"\\]|\\.)*"/g, /'(?:[^'\\]|\\.)*'/g]) {
    for (const m of t.matchAll(re)) {
      const v = m[0].slice(1, -1).trim();
      // Los literales cortos suelen ser claves e imports, no prompts.
      if (v.length >= 12) out.push(v);
    }
  }
  return out;
}

/** El sector, deducido de la ruta. Es el nombre de la carpeta bajo `sectors/`. */
function sectorDe(p) {
  const rel = path.relative(RAIZ_AGENTES, p).split(path.sep);
  return rel.length > 1 ? rel[0] : "";
}

// ── Medición ────────────────────────────────────────────────────────────────

if (!fs.existsSync(RAIZ_AGENTES)) {
  console.error(`No existe ${path.relative(ROOT, RAIZ_AGENTES)}`);
  process.exit(1);
}

const todos = ficheros(RAIZ_AGENTES);
const porForma = new Map();
let bytesTotales = 0;
let lineasTotales = 0;
let literalesTotales = 0;
const bytesDeLiterales = new Map();

for (const f of todos) {
  const texto = fs.readFileSync(f, "utf8");
  bytesTotales += Buffer.byteLength(texto);
  lineasTotales += texto.split("\n").length;

  const sector = sectorDe(f);
  const huella = crypto
    .createHash("sha256")
    .update(forma(texto, sector, path.basename(f)))
    .digest("hex")
    .slice(0, 16);
  const lits = literales(texto);
  literalesTotales += lits.length;
  bytesDeLiterales.set(f, lits.reduce((a, l) => a + Buffer.byteLength(l), 0));

  if (!porForma.has(huella)) porForma.set(huella, []);
  porForma.get(huella).push({ f, sector, lits: lits.length });
}

const familias = [...porForma.entries()]
  .map(([huella, miembros]) => ({ huella, miembros, n: miembros.length }))
  .sort((a, b) => b.n - a.n);

const unicos = familias.filter((fa) => fa.n === 1);
const bytesLit = [...bytesDeLiterales.values()].reduce((a, b) => a + b, 0);

// ── Informe ─────────────────────────────────────────────────────────────────

if (COMO_JSON) {
  console.log(
    JSON.stringify(
      {
        ficheros: todos.length,
        formas: familias.length,
        unicos: unicos.length,
        lineas: lineasTotales,
        bytes: bytesTotales,
        bytesEnLiterales: bytesLit,
        familias: familias.slice(0, 40).map((fa) => ({
          huella: fa.huella,
          miembros: fa.n,
          sectores: [...new Set(fa.miembros.map((m) => m.sector))].slice(0, 8),
          ejemplo: path.relative(ROOT, fa.miembros[0].f).split(path.sep).join("/"),
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (SOLO_UNICOS) {
  console.log(`FICHEROS CUYA FORMA NO SE REPITE · ${unicos.length} de ${todos.length}`);
  console.log("─".repeat(78));
  console.log("Éstos hacen algo que ningún otro agente hace. Una migración a");
  console.log("plantilla los rompería en silencio: hay que mirarlos a mano.\n");
  for (const fa of unicos) {
    const m = fa.miembros[0];
    console.log(`  ${path.relative(ROOT, m.f).split(path.sep).join("/")}`);
  }
  process.exit(0);
}

const pct = (n, d) => (d === 0 ? "0" : ((n / d) * 100).toFixed(1));

console.log("EQUIVALENCIA DE LOS AGENTES SECTORIALES");
console.log("═".repeat(78));
console.log(`  ficheros                       ${todos.length}`);
console.log(`  líneas                         ${lineasTotales.toLocaleString("es")}`);
console.log(`  FORMAS distintas de código     ${familias.length}`);
console.log(`  formas que aparecen una vez    ${unicos.length}   (${pct(unicos.length, todos.length)} % de los ficheros)`);
console.log("");
console.log(`  bytes de código                ${bytesTotales.toLocaleString("es")}`);
console.log(`  de ellos, en literales         ${bytesLit.toLocaleString("es")}   (${pct(bytesLit, bytesTotales)} %)`);
console.log(`  literales largos (≥12 car.)    ${literalesTotales.toLocaleString("es")}`);
console.log("");
console.log("  Los literales son la ESPECIALIZACIÓN: los prompts, las reglas y el");
console.log("  vocabulario de cada sector. Todo lo demás es la misma máquina.");
console.log("");

console.log("LAS FAMILIAS MÁS POBLADAS");
console.log("─".repeat(78));
console.log("  copias  sectores  forma             ejemplo");
for (const fa of familias.slice(0, 12)) {
  const sectores = new Set(fa.miembros.map((m) => m.sector)).size;
  const ej = path.relative(ROOT, fa.miembros[0].f).split(path.sep).join("/");
  console.log(
    `  ${String(fa.n).padStart(6)}  ${String(sectores).padStart(8)}  ${fa.huella}  ${ej.slice(-52)}`,
  );
}

const enFamilias = familias.filter((fa) => fa.n > 1).reduce((a, fa) => a + fa.n, 0);
console.log("");
console.log("QUÉ DICE ESTO SOBRE LA MIGRACIÓN");
console.log("─".repeat(78));
console.log(`  ${enFamilias} ficheros (${pct(enFamilias, todos.length)} %) comparten forma con al menos otro.`);
console.log(`  Ésos son parametrizables: misma máquina, distintos datos.`);
console.log("");
console.log(`  ${unicos.length} ficheros (${pct(unicos.length, todos.length)} %) tienen una forma única.`);
console.log(`  Ésos NO se migran a ciegas. Véelos con --unicos.`);
console.log("");
console.log("  Nada de esto justifica todavía tocar un solo fichero: antes hacen");
console.log("  falta pruebas de comportamiento que fijen QUÉ produce hoy cada");
console.log("  familia, para poder demostrar que después produce lo mismo.");
