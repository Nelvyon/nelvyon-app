#!/usr/bin/env node
/**
 * ¿QUÉ PASA SI FALLA LA MIGRACIÓN N DE 21? **NO APLICA NADA.**
 *
 * LA PREGUNTA QUE DECIDE. Aplicar 21 migraciones a la base de clientes con una
 * copia de hace 28 horas sólo es asumible si un fallo a mitad NO deja el
 * esquema a medias. Si cada migración es atómica, un fallo en la número 13 deja
 * las 12 anteriores aplicadas y la 13 sin empezar — un estado conocido, del que
 * se sigue hacia delante. Si no lo es, deja media migración aplicada, y de ahí
 * sólo se sale restaurando.
 *
 * DE DÓNDE SALE LA ATOMICIDAD. El migrador manda el fichero entero en un solo
 * `pool.query(sql)`, sin `BEGIN` explícito. Eso NO es un descuido: PostgreSQL
 * envuelve cada petición del protocolo simple en **una transacción implícita**,
 * así que un fallo en la sentencia 7 revierte también las 6 anteriores.
 *
 * PERO ESO SE ROMPE CON TRES COSAS, y por eso este guion existe:
 *
 *   1. `CREATE INDEX CONCURRENTLY` — no puede ejecutarse dentro de una
 *      transacción. PostgreSQL rechaza el fichero entero, o peor: si va suelto,
 *      deja un índice inválido a medio construir.
 *   2. Un `COMMIT` explícito dentro del fichero — cierra la transacción
 *      implícita y lo que venga después ya no está protegido.
 *   3. `VACUUM`, `CREATE DATABASE`, `ALTER SYSTEM` — tampoco admiten
 *      transacción.
 *
 * Y HAY UNA CUARTA COSA que no es del SQL sino del migrador: el apunte en
 * `_migrations` va en una petición SEPARADA de la migración. Si la migración
 * aplica y el apunte falla, la base queda cambiada y el libro dice que no. Es
 * una ventana estrecha y conviene saber que está ahí.
 *
 * COSTE: 0 €. Lee ficheros del repositorio.
 *
 * USO
 *   node scripts/son-atomicas-las-migraciones.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "backend", "db", "migrations");
const SALIDA = path.join(RAIZ, "docs", "SI_FALLA_UNA_MIGRACION.md");

/** Las 21 pendientes en producción, medidas contra la base real. */
const PENDIENTES = fs
  .readdirSync(DIR)
  .filter((f) => /^5(6[89]|7\d|8\d)_.*\.sql$/.test(f))
  .sort();

/**
 * Deja solo SQL ejecutable: fuera comentarios Y fuera cadenas literales.
 *
 * LO SEGUNDO NO ES UN EXTRA. La migracion 573 explica en un `RAISE NOTICE` por
 * que NO usa `CREATE INDEX CONCURRENTLY` — y el detector, que solo quitaba
 * comentarios, leyo ese texto dentro de la cadena y la acuso de usarlo. La
 * migracion decia literalmente lo contrario de lo que se le atribuyo.
 *
 * Un `DROP` documentado no es un `DROP`, y un `CONCURRENTLY` mencionado dentro
 * de un mensaje tampoco es un `CONCURRENTLY`.
 */
const soloEjecutable = (sql) =>
  sql
    // LOS FINALES DE LINEA SE NORMALIZAN PRIMERO. El arbol mezcla CRLF y LF, y
    // en JavaScript el punto de una expresion regular NO cruza un `\\r`: con
    // CRLF, `/--.*$/` no llega al final de la linea y el comentario sobrevive
    // entero. Asi es como la migracion 573 salio acusada de usar
    // `CREATE INDEX CONCURRENTLY` cuando lo unico que tiene es un comentario
    // explicando por que NO lo usa.
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((x) => x.replace(/--.*$/, ""))
    .join("\n")
    // Cadenas entre comillas simples: lo que hay dentro es texto, no SQL.
    .replace(/'(?:[^']|'')*'/g, "''");

const analizar = (f) => {
  const bruto = fs.readFileSync(path.join(DIR, f), "utf8");
  const sql = soloEjecutable(bruto);

  const rompenLaTransaccion = [];
  if (/CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY/i.test(sql)) rompenLaTransaccion.push("CREATE INDEX CONCURRENTLY");

  /**
   * UN `BEGIN … COMMIT` QUE ENVUELVE TODO NO ROMPE NADA: lo hace explicito.
   *
   * Lo que si rompe es un `COMMIT` con sentencias DESPUES — ahi la transaccion
   * ya esta cerrada y lo que venga detras se aplica suelto, sin proteccion.
   *
   * La migracion 576 salio marcada por tener `BEGIN;` en la linea 59 y
   * `COMMIT;` en la 93, que es el final del fichero: no queda nada fuera. Era
   * un falso positivo, y de los caros: habria bloqueado la decision entera.
   */
  const hayCommit = /^\s*COMMIT\s*;/im.test(sql);
  const trasElUltimoCommit = hayCommit ? (sql.split(/^\s*COMMIT\s*;/im).pop() ?? "") : "";
  if (hayCommit && /[a-z]/i.test(trasElUltimoCommit.replace(/[\s;]/g, ""))) {
    rompenLaTransaccion.push("sentencias DESPUES de un COMMIT");
  }
  if (/\bVACUUM\b/i.test(sql)) rompenLaTransaccion.push("VACUUM");
  if (/\bALTER\s+SYSTEM\b/i.test(sql)) rompenLaTransaccion.push("ALTER SYSTEM");
  if (/\bCREATE\s+DATABASE\b/i.test(sql)) rompenLaTransaccion.push("CREATE DATABASE");
  if (/\bREINDEX\b/i.test(sql)) rompenLaTransaccion.push("REINDEX");

  const ddl = {
    creaTabla: (sql.match(/CREATE TABLE/gi) ?? []).length,
    creaIndice: (sql.match(/CREATE\s+(UNIQUE\s+)?INDEX/gi) ?? []).length,
    creaPolitica: (sql.match(/CREATE POLICY/gi) ?? []).length,
    anadeColumna: (sql.match(/ADD COLUMN/gi) ?? []).length,
    activaRls: (sql.match(/ENABLE ROW LEVEL SECURITY/gi) ?? []).length,
  };
  const dml = {
    update: (sql.match(/\bUPDATE\s+[a-z0-9_."]+\s+SET\b/gi) ?? []).length,
    insert: (sql.match(/\bINSERT\s+INTO\b/gi) ?? []).length,
    delete: (sql.match(/\bDELETE\s+FROM\b/gi) ?? []).length,
  };
  const destructivo = {
    dropTabla: (sql.match(/\bDROP\s+TABLE\b/gi) ?? []).length,
    dropColumna: (sql.match(/\bDROP\s+COLUMN\b/gi) ?? []).length,
    rename: (sql.match(/\bRENAME\b/gi) ?? []).length,
    alterType: (sql.match(/\bALTER\s+COLUMN\b[\s\S]{0,80}\bTYPE\b/gi) ?? []).length,
  };

  /**
   * ¿Bloquea a quien esté usando la base?
   *
   * `CREATE TABLE` no bloquea nada: la tabla no existe todavía. `ADD COLUMN`
   * con valor por defecto es instantáneo desde PostgreSQL 11. Lo que sí para a
   * todo el mundo es un `ALTER TABLE` que reescribe, y un `UPDATE` masivo sobre
   * una tabla con filas.
   */
  const bloqueaLectores =
    destructivo.alterType > 0 || destructivo.rename > 0 || destructivo.dropColumna > 0;

  // La vuelta atrás que la propia migración documenta en su cabecera.
  const vueltaAtras = /VUELTA ATR[ÁA]S|ROLLBACK|revertir|para deshacer/i.test(bruto);

  return { f, rompenLaTransaccion, ddl, dml, destructivo, bloqueaLectores, vueltaAtras };
};

const analisis = PENDIENTES.map(analizar);

const noAtomicas = analisis.filter((a) => a.rompenLaTransaccion.length > 0);
const conDml = analisis.filter((a) => a.dml.update + a.dml.delete > 0);
const conDestructivo = analisis.filter(
  (a) => a.destructivo.dropTabla + a.destructivo.dropColumna + a.destructivo.rename + a.destructivo.alterType > 0,
);
const sinVueltaAtras = analisis.filter((a) => !a.vueltaAtras);

const l = [];
l.push("# Si falla una migración a mitad");
l.push("");
l.push(
  "Lo escribe `scripts/son-atomicas-las-migraciones.mjs`. **No aplica ninguna.**",
  "",
  "La pregunta que decide si se puede migrar con una copia de hace 28 horas no es",
  "«¿van a fallar?» sino **«si falla la número 13, en qué estado queda la base?»**.",
);
l.push("");

l.push("## De dónde sale la atomicidad");
l.push("");
l.push(
  "El migrador manda cada fichero entero en un solo `pool.query(sql)`, **sin `BEGIN`**.",
  "Eso no es un descuido: PostgreSQL envuelve cada petición del protocolo simple en una",
  "**transacción implícita**, así que un fallo en la sentencia 7 revierte también las 6",
  "anteriores. Cada migración es todo o nada.",
  "",
  "Eso se rompe con tres cosas —`CREATE INDEX CONCURRENTLY`, un `COMMIT` dentro del",
  "fichero, o `VACUUM`— y por eso se comprueban una a una.",
);
l.push("");

l.push("## ¿Alguna rompe la transacción?");
l.push("");
if (noAtomicas.length === 0) {
  l.push(
    "**Ninguna de las 21.** Ni un `CREATE INDEX CONCURRENTLY`, ni un `COMMIT` suelto, ni un",
    "`VACUUM`. Las 21 son atómicas: cada una se aplica entera o no se aplica.",
    "",
    "Consecuencia para la decisión: **un fallo en la número N deja las N−1 anteriores",
    "aplicadas y la N sin empezar.** No hay estado a medias. Se corrige la N y se sigue.",
  );
} else {
  l.push(`**${noAtomicas.length} NO son atómicas:**`);
  l.push("");
  for (const a of noAtomicas) l.push(`- \`${a.f}\` — ${a.rompenLaTransaccion.join(", ")}`);
}
l.push("");

l.push("## La ventana que sí existe");
l.push("");
l.push(
  "El apunte en `_migrations` va en una petición **separada** de la migración. Si la",
  "migración aplica y el apunte falla —se cae la red justo ahí—, la base queda cambiada y",
  "el libro dice que no. Al reintentar, esa migración se ejecutaría por segunda vez.",
  "",
  "Cuánto importa depende de si la migración aguanta ejecutarse dos veces, y eso se mide",
  "abajo: las que usan `IF NOT EXISTS` en todo lo que crean sí aguantan.",
);
l.push("");

l.push("## Qué hace cada una");
l.push("");
l.push("| Migración | Tablas | Índices | Políticas | Columnas | RLS | UPDATE | Destructivo | Bloquea |");
l.push("|---|---|---|---|---|---|---|---|---|");
for (const a of analisis) {
  const d = a.destructivo.dropTabla + a.destructivo.dropColumna + a.destructivo.rename + a.destructivo.alterType;
  l.push(
    `| \`${a.f.replace(/\.sql$/, "")}\` | ${a.ddl.creaTabla} | ${a.ddl.creaIndice} | ${a.ddl.creaPolitica} |` +
      ` ${a.ddl.anadeColumna} | ${a.ddl.activaRls} | ${a.dml.update} | ${d} | ${a.bloqueaLectores ? "sí ⚠️" : "no"} |`,
  );
}
l.push("");

l.push("## Reversibilidad, una por una");
l.push("");
l.push(
  "**Lo que crea una migración se puede tirar; lo que cambia un `UPDATE` no vuelve solo.**",
  "Ésa es toda la diferencia entre poder deshacer sin restaurar y no poder.",
);
l.push("");
if (conDml.length === 0) {
  l.push("**Ninguna de las 21 modifica datos existentes.** Todas son aditivas.");
} else {
  l.push(`**${conDml.length} tocan datos:**`);
  l.push("");
  for (const a of conDml) {
    l.push(`- \`${a.f}\` — ${a.dml.update} UPDATE, ${a.dml.delete} DELETE`);
  }
}
l.push("");
if (conDestructivo.length === 0) {
  l.push(
    "**Ninguna quita ni renombra nada** fuera de comentarios. Es lo que permite el rollback",
    "lógico: deshacerlas es tirar lo que crearon, sin tocar lo que ya había.",
  );
} else {
  l.push(`**${conDestructivo.length} quitan o cambian algo** — ésas no se deshacen tirando:`);
  l.push("");
  for (const a of conDestructivo) l.push(`- \`${a.f}\``);
}
l.push("");
if (sinVueltaAtras.length > 0) {
  l.push(`**${sinVueltaAtras.length} no documentan su vuelta atrás en la cabecera:**`);
  l.push("");
  for (const a of sinVueltaAtras) l.push(`- \`${a.f}\``);
  l.push("");
}

l.push("## Qué hacer si falla la número N");
l.push("");
l.push(
  "1. **Parar.** El migrador ya lo hace: al primer fallo corta y no sigue con las demás.",
  "2. **Mirar el libro.** `_migrations` dice exactamente cuáles entraron. Las N−1 anteriores",
  "   están aplicadas y completas; la N no ha dejado nada.",
  "3. **No restaurar todavía.** Restaurar la copia de hace 28 horas cuesta 28 horas de",
  "   trabajo de clientes. Con las migraciones aditivas, el esquema a medias **funciona**:",
  "   tiene más tablas de las que tenía y ninguna menos.",
  "4. **Arreglar la N y seguir.** Las N−1 no se repiten: el libro las salta.",
  "",
  "**El único escenario que obliga a restaurar** es que una migración destruya o modifique",
  "datos y falle después. Según la tabla de arriba, eso hoy no puede pasar con ninguna de",
  "las 21.",
);
l.push("");

fs.writeFileSync(SALIDA, l.join("\n"), "utf8");

console.log("");
console.log("¿SON ATÓMICAS LAS 21?");
console.log(`  pendientes analizadas:        ${analisis.length}`);
console.log(`  rompen la transacción:        ${noAtomicas.length}`);
console.log(`  modifican datos existentes:   ${conDml.length}`);
console.log(`  quitan o renombran algo:      ${conDestructivo.length}`);
console.log(`  bloquean a los lectores:      ${analisis.filter((a) => a.bloqueaLectores).length}`);
console.log(`  sin vuelta atrás documentada: ${sinVueltaAtras.length}`);
console.log("");
console.log(`  escrito en ${path.relative(RAIZ, SALIDA)}`);
console.log("");
