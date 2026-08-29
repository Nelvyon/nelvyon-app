#!/usr/bin/env node
/**
 * QUÉ DOCUMENTO ME CREO.
 *
 * EL PROBLEMA. `docs/` tiene 178 ficheros y no hay forma de saber, mirándolos,
 * cuáles describen el sistema de hoy y cuáles son el diario de una fase que
 * terminó hace tres meses. Los dos tipos se llaman igual, están en la misma
 * carpeta y empiezan con un título en mayúsculas. Alguien que llegue —o yo
 * mismo dentro de dos semanas— leerá `LAUNCH_READY.md` de julio y sacará
 * conclusiones sobre agosto.
 *
 * Y esto no es una molestia estética. Un documento obsoleto que parece vigente
 * hace daño de una forma muy concreta: se cita en una decisión. La deuda de
 * documentación no se paga en errores, se paga en decisiones equivocadas.
 *
 * QUÉ HACE ESTE ÍNDICE. Clasifica los 178 en tres cajones, y NO por lo que
 * dicen de sí mismos sino por lo que se puede comprobar:
 *
 *   GENERADO ..... lo escribe un script o una prueba en cada ejecución. Es el
 *                  unico que no puede estar obsoleto: si el arbol cambia, el
 *                  documento cambia. Se detecta porque lo declara y porque
 *                  existe el generador que dice tenerlo.
 *   VIGENTE ...... escrito a mano y tocado en los ultimos treinta dias.
 *   HISTORICO .... escrito a mano y sin tocar desde hace mas. No esta mal que
 *                  exista: esta mal que se lea como si fuera de hoy.
 *
 * LO QUE NO HACE. No borra nada. Un documento viejo es memoria del proyecto y
 * tirarlo pierde el porque de decisiones que siguen en pie. Lo que hace falta
 * no es borrarlos: es que se sepa cual es cual.
 *
 * LA FECHA SALE DE GIT, no del sistema de ficheros. `mtime` cambia al clonar,
 * al cambiar de rama y al abrir un fichero con segun que editor; la fecha del
 * ultimo commit que lo toco es la unica que significa algo.
 *
 * USO
 *   node scripts/que-documento-me-creo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();
const DOCS = path.join(RAIZ, "docs");
const SALIDA = path.join(DOCS, "QUE_DOCUMENTO_ME_CREO.md");

/** Dias sin tocar a partir de los cuales un documento a mano es historia. */
const DIAS_VIGENTE = 30;

function ultimoCommit(rel) {
  try {
    const s = execFileSync("git", ["log", "-1", "--format=%cI", "--", rel], {
      cwd: RAIZ,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return s || null;
  } catch {
    return null;
  }
}

/** Los generadores que hay, para poder comprobar que un «generado» lo es. */
function generadores() {
  const fuera = new Map();
  const mirar = [
    [path.join(RAIZ, "scripts"), ".mjs"],
    [path.join(RAIZ, "backend"), ".test.ts"],
    [path.join(RAIZ, "apps", "web", "src"), ".test.ts"],
  ];
  const recorrer = (dir, ext, prof = 0) => {
    if (prof > 6 || !fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        recorrer(p, ext, prof + 1);
        continue;
      }
      if (!e.name.endsWith(ext)) continue;
      const t = fs.readFileSync(p, "utf8");
      for (const m of t.matchAll(/"([A-Z0-9_]+\.md)"/g)) {
        fuera.set(m[1], path.relative(RAIZ, p).replace(/\\/g, "/"));
      }
    }
  };
  for (const [dir, ext] of mirar) recorrer(dir, ext);
  return fuera;
}

const GENERADORES = generadores();
const ahora = Date.now();

const documentos = fs
  .readdirSync(DOCS)
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((f) => {
    const rel = `docs/${f}`;
    const texto = fs.readFileSync(path.join(DOCS, f), "utf8");
    const iso = ultimoCommit(rel);
    const dias = iso ? Math.floor((ahora - Date.parse(iso)) / 86_400_000) : null;
    // El texto se aplana antes de buscar la frase: en un documento con lineas
    // de ochenta caracteres, la frase esta partida por la mitad y una busqueda
    // literal no lo ve. La primera version de este indice dejo fuera al
    // inventario de conectores por exactamente eso: un lector roto no falla,
    // devuelve menos, y el documento sale igual de convincente.
    const plano = texto.replace(/[\s*_`]+/g, " ");
    const seDice = /no se edita a mano/i.test(plano);
    const generador = GENERADORES.get(f) ?? null;

    // Un documento que DICE ser generado y cuyo generador no aparece por
    // ningun lado es la peor de las tres categorias: promete frescura y no la
    // tiene. Se marca aparte para que se vea.
    let estado;
    if (seDice && generador) estado = "GENERADO";
    else if (seDice && !generador) estado = "DICE_SER_GENERADO_Y_NO_SE_VE_QUIEN";
    else if (dias != null && dias <= DIAS_VIGENTE) estado = "VIGENTE";
    else estado = "HISTORICO";

    const titulo = /^#\s+(.+)$/m.exec(texto)?.[1]?.trim() ?? f.replace(/\.md$/, "");
    return { f, rel, titulo, estado, dias, generador, lineas: texto.split("\n").length };
  });

const cuenta = documentos.reduce((a, d) => ({ ...a, [d.estado]: (a[d.estado] ?? 0) + 1 }), {});

const l = [];
l.push("# Qué documento me creo");
l.push("");
l.push(
  "Lo escribe `scripts/que-documento-me-creo.mjs`. **No se edita a mano.**",
  "",
  "`docs/` tiene documentos de hoy y diarios de fases que terminaron hace meses, y",
  "desde fuera se parecen: mismo sitio, mismo formato, mismo título en mayúsculas.",
  "Un documento obsoleto que parece vigente no molesta — se cita en una decisión.",
);
l.push("");
l.push("| Cajón | Cuántos | Qué quiere decir |");
l.push("|---|---|---|");
l.push(
  `| \`GENERADO\` | ${cuenta.GENERADO ?? 0} | lo reescribe un script o una prueba en cada ejecución. Es el único que no puede quedarse obsoleto |`,
);
l.push(`| \`VIGENTE\` | ${cuenta.VIGENTE ?? 0} | a mano, tocado en los últimos ${DIAS_VIGENTE} días |`);
l.push(
  `| \`HISTORICO\` | ${cuenta.HISTORICO ?? 0} | a mano, sin tocar desde hace más. Memoria del proyecto, no estado actual |`,
);
if (cuenta.DICE_SER_GENERADO_Y_NO_SE_VE_QUIEN) {
  l.push(
    `| \`DICE_SER_GENERADO_Y_NO_SE_VE_QUIEN\` | ${cuenta.DICE_SER_GENERADO_Y_NO_SE_VE_QUIEN} | declara ser automático y no se encuentra quién lo escribe. Promete frescura sin tenerla |`,
  );
}
l.push("");
l.push("**Nada se borra.** Un documento viejo guarda el porqué de decisiones que siguen");
l.push("en pie; tirarlo pierde el motivo y deja la decisión. Lo que hacía falta no era");
l.push("borrarlos, era que se supiera cuál es cuál.");
l.push("");

for (const estado of [
  "GENERADO",
  "DICE_SER_GENERADO_Y_NO_SE_VE_QUIEN",
  "VIGENTE",
  "HISTORICO",
]) {
  const grupo = documentos.filter((d) => d.estado === estado);
  if (grupo.length === 0) continue;
  l.push(`## ${estado} — ${grupo.length}`);
  l.push("");
  if (estado === "GENERADO") {
    l.push("| Documento | Lo escribe | Días desde el último cambio |");
    l.push("|---|---|---|");
    for (const d of grupo) {
      l.push(`| [${d.f}](${d.f}) — ${d.titulo} | \`${d.generador}\` | ${d.dias ?? "—"} |`);
    }
  } else {
    l.push("| Documento | Días desde el último cambio | Líneas |");
    l.push("|---|---|---|");
    for (const d of grupo.sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))) {
      l.push(`| [${d.f}](${d.f}) — ${d.titulo} | ${d.dias ?? "—"} | ${d.lineas} |`);
    }
  }
  l.push("");
}

l.push("## Lo que este índice NO dice");
l.push("");
l.push(
  "- **Que un `HISTORICO` esté equivocado.** Dice que nadie lo ha tocado en un mes.",
  "  Muchos siguen siendo correctos; el problema es que no hay forma de saber cuáles",
  "  sin leerlos, y por eso conviene tratarlos como memoria y no como estado.",
  "- **Que un `VIGENTE` sea cierto.** Dice que es reciente. Reciente y escrito a mano",
  "  sigue siendo escrito a mano.",
  "- **Que un `GENERADO` sea la verdad.** Dice que refleja el árbol de la última vez",
  "  que se ejecutó su generador. Si el generador lee mal, el documento miente con",
  "  puntualidad — que es exactamente lo que le pasó dos veces a la matriz de",
  "  servicios y por eso ahora comprueban sus propios denominadores.",
);
l.push("");

fs.writeFileSync(SALIDA, l.join("\n"), "utf8");

console.log("");
console.log("QUÉ DOCUMENTO ME CREO");
console.log(`  ${documentos.length} documentos en docs/`);
for (const [k, v] of Object.entries(cuenta)) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log("");
console.log(`  escrito en ${path.relative(RAIZ, SALIDA)}`);
console.log("");
