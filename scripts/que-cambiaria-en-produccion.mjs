#!/usr/bin/env node
/**
 * QUÉ CAMBIARÍA EN PRODUCCIÓN SI SE APLICARAN LAS MIGRACIONES PENDIENTES.
 *
 * LA IDEA. Hay dos huellas del esquema: la de producción, con 467 migraciones
 * aplicadas, y la de una base reconstruida desde cero con las 488. Restarlas da
 * la lista exacta de objetos que aparecerían y desaparecerían.
 *
 * POR QUÉ VALE MÁS QUE LEER LAS MIGRACIONES. Leer el SQL dice lo que las
 * migraciones INTENTAN hacer. Esto dice lo que de verdad queda cuando se han
 * aplicado, que no es lo mismo: un `CREATE TABLE IF NOT EXISTS` sobre algo que
 * ya está no hace nada, un `DO $$ ... IF tiene_filas THEN CONTINUE` se salta
 * tablas según lo que hubiera dentro, y ninguna de las dos cosas se ve en el
 * fichero.
 *
 * LO QUE HAY QUE MIRAR CON LUPA, y por eso sale primero: lo que DESAPARECE.
 * Que aparezcan tablas nuevas es lo esperado. Que falte algo que producción sí
 * tiene es la señal de que las dos bases han divergido por otro sitio, y eso
 * hay que entenderlo antes de tocar nada.
 *
 * LA COMPARACIÓN NO ES SIMÉTRICA, y conviene decirlo: la base local se
 * construyó desde cero, así que tiene objetos que en producción nunca llegaron
 * a crearse por una guarda de tabla vacía —la 567 es el caso conocido—. Eso no
 * es un fallo de las pendientes: es una diferencia que ya existía.
 *
 * COSTE: 0 €. Compara dos ficheros que ya están en disco.
 *
 * USO
 *   node scripts/que-cambiaria-en-produccion.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const ANTES = path.join(RAIZ, "docs", "evidence", "esquema_produccion_antes.json");
const DESPUES = path.join(RAIZ, "docs", "evidence", "esquema_local_migrado.json");
const SALIDA = path.join(RAIZ, "docs", "CAMBIO_EN_PRODUCCION.md");

const leer = (p) => {
  if (!fs.existsSync(p)) {
    console.error(`falta ${path.relative(RAIZ, p)}. Tómalo con scripts/huella-del-esquema.mjs`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
};

const a = leer(ANTES);
const b = leer(DESPUES);

/** Qué hay en `dos` que no esté en `uno`, y al revés. */
function restar(uno, dos) {
  const A = new Set(uno);
  const B = new Set(dos);
  return {
    aparecen: dos.filter((x) => !A.has(x)),
    desaparecen: uno.filter((x) => !B.has(x)),
  };
}

const familias = ["columnas", "indices", "politicas", "restricciones", "tablasConRls"];
const diff = Object.fromEntries(familias.map((f) => [f, restar(a[f], b[f])]));
const migraciones = restar(a.migracionesAplicadas, b.migracionesAplicadas);

/** De `tabla.columna:tipo` a `tabla`. Para saber qué tablas son nuevas del todo. */
const tablaDe = (c) => c.split(".")[0];
const tablasAntes = new Set(a.columnas.map(tablaDe));
const tablasNuevas = [...new Set(diff.columnas.aparecen.map(tablaDe))].filter((t) => !tablasAntes.has(t));
const columnasEnTablasQueYaExisten = diff.columnas.aparecen.filter((c) => tablasAntes.has(tablaDe(c)));

const l = [];
l.push("# Qué cambiaría en producción");
l.push("");
l.push(
  "Lo escribe `scripts/que-cambiaria-en-produccion.mjs` restando dos huellas del",
  "esquema: la de producción tal como está y la de una base reconstruida desde cero",
  "con las 488 migraciones. **No se edita a mano y no ha tocado producción.**",
);
l.push("");
l.push(`> Producción medida el ${String(a.tomadaEn).slice(0, 10)} · ${a.servidor}`);
l.push(`> Referencia local medida el ${String(b.tomadaEn).slice(0, 10)}`);
l.push("");
l.push("## Lo que la cadena de migraciones da por hecho");
l.push("");
l.push(
  "Medido reconstruyendo la base desde cero sobre **PostgreSQL 18.6**, la misma",
  "versión mayor que producción. Salieron dos requisitos que ninguna migración crea",
  "y que hasta ahora no estaban escritos en ningún sitio:",
  "",
  "1. **La extensión `vector`.** La migración 309 la necesita. Un PostgreSQL sin",
  "   pgvector se para ahí.",
  "2. **Los roles `nelvyon_app` y `nelvyon_jobs`.** Se usan desde la migración 279 y",
  "   **ninguna migración los crea**. La 577 sí crea los del lado web",
  "   (`nelvyon_web_app`, `nelvyon_web_jobs`), pero esos dos son anteriores y vienen",
  "   de fuera.",
  "",
  "Producción los tiene, así que no es un riesgo para aplicar las pendientes. Importa",
  "por otra cosa: la frase «las 488 aplican desde cero» sólo era cierta sobre un",
  "clúster que ya traía esos roles. Sobre uno de verdad vacío, la cadena se para en",
  "la 556.",
);
l.push("");
l.push("## Las migraciones que faltan");
l.push("");
l.push(`Son **${migraciones.aparecen.length}**:`);
l.push("");
for (const m of migraciones.aparecen) l.push(`- \`${m}\``);
if (migraciones.desaparecen.length > 0) {
  l.push("");
  l.push("**Y producción tiene aplicadas migraciones que la referencia no:**");
  l.push("");
  for (const m of migraciones.desaparecen) l.push(`- \`${m}\` ⚠️`);
}
l.push("");

l.push("## Lo que aparecería");
l.push("");
l.push("| | Cuántos |");
l.push("|---|---|");
l.push(`| Tablas nuevas | ${tablasNuevas.length} |`);
l.push(`| Columnas en tablas que ya existen | ${columnasEnTablasQueYaExisten.length} |`);
l.push(`| Índices | ${diff.indices.aparecen.length} |`);
l.push(`| Políticas RLS | ${diff.politicas.aparecen.length} |`);
l.push(`| Tablas que pasan a tener RLS | ${diff.tablasConRls.aparecen.length} |`);
l.push("");
l.push("### Tablas nuevas");
l.push("");
l.push(tablasNuevas.length > 0 ? tablasNuevas.map((t) => `- \`${t}\``).join("\n") : "- ninguna");
l.push("");
l.push("### Columnas añadidas a tablas existentes");
l.push("");
l.push(
  columnasEnTablasQueYaExisten.length > 0
    ? columnasEnTablasQueYaExisten.map((c) => `- \`${c}\``).join("\n")
    : "- ninguna",
);
l.push("");

l.push("## Lo que DESAPARECERÍA — leer esto primero");
l.push("");
const desaparece = familias.reduce((t, f) => t + diff[f].desaparecen.length, 0);
if (desaparece === 0) {
  l.push("**Nada.** Todo lo que producción tiene ahora sigue estando después.");
} else {
  l.push(
    "Cada línea de aquí es algo que producción tiene y la referencia no. **No**",
    "significa que las migraciones lo vayan a borrar: significa que las dos bases",
    "divergen por ahí, y hay que entender por qué antes de tocar nada.",
    "",
    "El caso conocido: la migración 567 activa RLS **sólo sobre tablas vacías**. Una",
    "base reconstruida desde cero las encuentra vacías y las cubre; producción, con",
    "datos dentro, se las saltó. Esa diferencia ya existía y no la crean las",
    "pendientes.",
  );
  l.push("");
  for (const f of familias) {
    const d = diff[f].desaparecen;
    if (d.length === 0) continue;
    l.push(`### ${f} — ${d.length}`);
    l.push("");
    for (const x of d.slice(0, 40)) l.push(`- \`${x}\``);
    if (d.length > 40) l.push(`- …y ${d.length - 40} más`);
    l.push("");
  }
}
l.push("");

l.push("## Lo que este documento NO dice");
l.push("");
l.push(
  "- **Que aplicarlas sea seguro.** Dice qué cambiaría. La decisión de aplicarlas es",
  "  de Daniel y no se ha tomado.",
  "- **Que las dos bases queden idénticas.** No quedarán: producción tiene datos y la",
  "  referencia no, y hay guardas que dependen de eso.",
  "- **Que exista una copia de seguridad.** No la hay verificada desde aquí, y tomar",
  "  una completa mueve cientos de megas por el proxy — tráfico de salida real, que",
  "  bajo el modo de coste cero no se hace sin autorización.",
);
l.push("");

fs.writeFileSync(SALIDA, l.join("\n"), "utf8");

console.log("");
console.log("QUÉ CAMBIARÍA EN PRODUCCIÓN");
console.log(`  ${migraciones.aparecen.length} migraciones pendientes`);
console.log(`  +${tablasNuevas.length} tablas · +${columnasEnTablasQueYaExisten.length} columnas en tablas existentes`);
console.log(`  +${diff.indices.aparecen.length} índices · +${diff.politicas.aparecen.length} políticas`);
console.log(`  ${desaparece} objetos que producción tiene y la referencia no`);
console.log("");
console.log(`  escrito en ${path.relative(RAIZ, SALIDA)}`);
console.log("");
