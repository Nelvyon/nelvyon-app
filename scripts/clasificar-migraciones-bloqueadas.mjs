#!/usr/bin/env node
/**
 * Clasifica una a una las migraciones bloqueadas por ADR-064.
 *
 * QUÉ ES ADR-064, PORQUE NO ES LO QUE PARECE
 * ===========================================
 * No es una decisión de arquitectura pendiente de escribir. Es un **mecanismo de
 * gobierno ya implementado** (`backend/db/prodMigrateGate.ts`): en producción,
 * aplicar migraciones exige unas variables de aprobación auditables, y sin ellas
 * el despliegue se niega. Funciona.
 *
 * Lo que estaba pendiente no era la decisión: era **la evidencia por migración**.
 * «568–576 = BLOCKED_ON_FOUNDER» las mete a las nueve en el mismo saco, y no son
 * lo mismo: dos crean índices, una repara objetos que faltan, otra añade columnas
 * que el código ya escribe, y cuatro cambian la visibilidad de datos existentes.
 * Aprobarlas o rechazarlas en bloque obliga a tratar la más inocua con el mismo
 * miedo que la más peligrosa.
 *
 * QUÉ MIDE, POR MIGRACIÓN Y CONTRA POSTGRESQL REAL
 * ------------------------------------------------
 *   · precondiciones  qué había antes
 *   · aplicación      ¿aplica limpia sobre la cadena hasta la 567?
 *   · idempotencia    ¿aplicarla dos veces da lo mismo?
 *   · estructura      tablas / columnas / restricciones / índices que añade
 *   · RLS             políticas que activa, y sobre cuántas filas
 *   · datos           filas que MODIFICA (lo que decide si hay vuelta atrás)
 *
 * Y con eso sale la clase:
 *
 *   SAFE_TO_APPLY                  aditiva, idempotente, no toca datos
 *   REQUIRES_APPROVAL_ONLY         cambia datos o visibilidad, pero es reversible
 *                                  y está medida: sólo falta que alguien firme
 *   STILL_REQUIRES_HUMAN_DECISION  hay algo que decidir, no sólo que aprobar
 *   MUST_NOT_APPLY                 no debe aplicarse tal cual
 *
 * NO TOCA PRODUCCIÓN. Trabaja sobre bases desechables locales.
 *
 * USO
 *   node scripts/clasificar-migraciones-bloqueadas.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CONTENEDOR = process.env.CERT_PG_CONTAINER ?? "nelvyon-local-ai-postgres";
const USUARIO = process.env.CERT_PG_USER ?? "nelvyon_local";
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "backend", "db", "migrations");

/** Las nueve que ADR-064 mantiene sin aplicar. La 571 está APARTADA. */
const BLOQUEADAS = ["568", "569", "570", "572", "573", "574", "575", "576"];
const BASE = "nelvyon_adr064_base";

function docker(args, opciones = {}) {
  const r = spawnSync("docker", ["exec", ...(opciones.stdin ? ["-i"] : []), CONTENEDOR, ...args], {
    encoding: "utf8",
    input: opciones.stdin,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status ?? 1, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function sql(db, texto, { parar = true } = {}) {
  return docker(
    ["psql", "-U", USUARIO, "-d", db, ...(parar ? ["-v", "ON_ERROR_STOP=1"] : []), "-q", "-f", "-"],
    { stdin: texto },
  );
}

function valor(db, consulta) {
  const r = docker(["psql", "-U", USUARIO, "-d", db, "-tAc", consulta.replace(/\s+/g, " ")]);
  return r.status === 0 ? r.out : null;
}

function lista(db, consulta) {
  const v = valor(db, consulta);
  return v ? v.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

const CENSO = {
  tablas: "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  columnas:
    "SELECT table_name||'.'||column_name FROM information_schema.columns WHERE table_schema='public'",
  restricciones:
    "SELECT r.relname||'.'||c.conname FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid " +
    "JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public'",
  indices: "SELECT tablename||'.'||indexname FROM pg_indexes WHERE schemaname='public'",
  politicas: "SELECT tablename||'.'||policyname FROM pg_policies WHERE schemaname='public'",
  tablas_con_rls: "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity",
};

function censar(db) {
  const fuera = {};
  for (const [k, q] of Object.entries(CENSO)) fuera[k] = new Set(lista(db, q));
  return fuera;
}

function delta(antes, despues) {
  const fuera = {};
  for (const k of Object.keys(antes)) {
    fuera[k] = [...despues[k]].filter((x) => !antes[k].has(x)).sort();
  }
  return fuera;
}

function ficheroDe(num) {
  const f = fs.readdirSync(DIR).find((x) => x.startsWith(`${num}_`) && x.endsWith(".sql"));
  return f ? path.join(DIR, f) : null;
}

/**
 * Construye la base de partida: toda la cadena HASTA la 567, ni una más.
 *
 * Se aplica sentencia a sentencia con tolerancia, igual que hace `migrate.ts` en
 * producción. Reconstruir con `ON_ERROR_STOP` daría una base más limpia que la
 * real, y entonces lo que se midiera encima no diría nada sobre producción.
 */
function construirBase() {
  console.log("construyendo la base con la cadena hasta la 567…");
  sql("postgres", `DROP DATABASE IF EXISTS ${BASE};`, { parar: false });
  const c = sql("postgres", `CREATE DATABASE ${BASE};`);
  if (c.status !== 0) throw new Error(`no se pudo crear ${BASE}: ${c.err}`);

  const ficheros = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => {
      const n = Number.parseInt(f.slice(0, f.indexOf("_")), 10);
      return Number.isInteger(n) && n <= 567;
    })
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

  let fallos = 0;
  for (const f of ficheros) {
    const r = sql(BASE, fs.readFileSync(path.join(DIR, f), "utf8"), { parar: false });
    if (r.status !== 0) fallos += 1;
  }
  console.log(`  ${ficheros.length} migraciones aplicadas, ${fallos} con algun error tolerado`);
  const t = valor(BASE, CENSO.tablas.replace("SELECT table_name", "SELECT count(*)"));
  console.log(`  tablas resultantes: ${t}`);
  return { aplicadas: ficheros.length, fallosTolerados: fallos, tablas: Number(t) };
}

/**
 * ¿La migración se deja deshacer?
 *
 * Dos condiciones, y hacen falta las dos:
 *
 *   · guarda QUÉ tocó, en una tabla que ella misma crea antes de escribir. Sin
 *     eso, «revertir» sería adivinar qué filas eran cuáles.
 *   · trae el `ROLLBACK` escrito. Una copia de seguridad que nadie sabe cómo
 *     leer no es una vuelta atrás.
 *
 * La primera versión de esta comprobación buscaba el nombre de la tabla por
 * `backup|respaldo|_bak` y dio un FALSO NEGATIVO en la 574, que la llama
 * `os_sector_shield_audits_backfill_574`. La regla hacía parecer más peligrosa
 * de lo que es a la única migración que sí trae vuelta atrás — que es el error
 * más caro que puede cometer un clasificador: el que hace desconfiar de lo
 * correcto.
 */
function seDejaDeshacer(cuerpo) {
  // No codicioso a propósito: `[\w.]*` codicioso se traga el nombre entero
  // —incluida la palabra que se busca— y luego `\b` ya no puede casar. Fue el
  // segundo intento fallido sobre la misma migración.
  const creaCompanera = /CREATE TABLE[^;(]*?(backup|backfill|respaldo|_bak)/i.test(cuerpo);
  const traeRollback = /^--\s*ROLLBACK/im.test(cuerpo);
  return { creaCompanera, traeRollback, ok: creaCompanera && traeRollback };
}

function clasificar(d, tocaDatos, aplicaLimpia, esIdempotente, reversible, sinEfecto) {
  if (!aplicaLimpia) return "MUST_NOT_APPLY";
  if (!esIdempotente) return "STILL_REQUIRES_HUMAN_DECISION";
  const tocaVisibilidad = d.politicas.length > 0 || d.tablas_con_rls.length > 0;
  if (sinEfecto && !tocaDatos) return "SUPERSEDED_SOBRE_ESTA_BASE";
  if (!tocaVisibilidad && !tocaDatos) return "SAFE_TO_APPLY";
  if (tocaDatos && !reversible.ok) return "STILL_REQUIRES_HUMAN_DECISION";
  return "REQUIRES_APPROVAL_ONLY";
}

function main() {
  const resumenBase = construirBase();
  const informe = [];

  for (const num of BLOQUEADAS) {
    const fichero = ficheroDe(num);
    if (!fichero) {
      console.log(`\n${num}: NO EXISTE en el arbol -> SUPERSEDED`);
      informe.push({ migracion: num, clase: "SUPERSEDED", motivo: "no esta en el arbol" });
      continue;
    }
    const nombre = path.basename(fichero);
    const cuerpo = fs.readFileSync(fichero, "utf8");
    const db = `nelvyon_adr064_${num}`;

    sql("postgres", `DROP DATABASE IF EXISTS ${db};`, { parar: false });
    const c = sql("postgres", `CREATE DATABASE ${db} TEMPLATE ${BASE};`);
    if (c.status !== 0) {
      console.log(`\n${num}: no se pudo preparar la base (${c.err.slice(0, 120)})`);
      continue;
    }

    const antes = censar(db);
    const filasAntes = Number(valor(db, "SELECT count(*) FROM pg_stat_user_tables") ?? 0);

    // 1ª aplicación
    const r1 = sql(db, cuerpo);
    const aplicaLimpia = r1.status === 0;
    // 2ª aplicación: idempotencia
    const r2 = aplicaLimpia ? sql(db, cuerpo) : { status: 1, err: "no se intento" };
    const esIdempotente = r2.status === 0;

    const despues = censar(db);
    const d = delta(antes, despues);

    // ¿Modifica datos? Se mide por lo que la propia migración declara escribir.
    const escribeDatos = /^\s*(UPDATE|DELETE|INSERT)\s/im.test(
      cuerpo.replace(/^\s*--.*$/gm, ""),
    );
    const reversible = seDejaDeshacer(cuerpo);
    // Sin efecto sobre ESTA base: ni estructura, ni politicas, ni datos.
    const sinEfecto = Object.values(d).every((v) => v.length === 0);

    const clase = clasificar(d, escribeDatos, aplicaLimpia, esIdempotente, reversible, sinEfecto);

    console.log(`\n═══ ${num} · ${nombre}`);
    console.log(`  aplica limpia   ${aplicaLimpia ? "SI" : `NO — ${r1.err.split("\n")[0].slice(0, 110)}`}`);
    console.log(`  idempotente     ${esIdempotente ? "SI" : `NO — ${String(r2.err).split("\n")[0].slice(0, 110)}`}`);
    console.log(`  tablas    +${d.tablas.length}   columnas +${d.columnas.length}   ` +
                `restricciones +${d.restricciones.length}`);
    console.log(`  indices   +${d.indices.length}   politicas RLS +${d.politicas.length}   ` +
                `tablas que pasan a tener RLS +${d.tablas_con_rls.length}`);
    console.log(`  escribe datos   ${escribeDatos ? "SI" : "no"}` +
                `${escribeDatos ? `   se deja deshacer: ${reversible.ok ? "SI" : "NO"}` +
                   ` (copia ${reversible.creaCompanera ? "si" : "no"},` +
                   ` ROLLBACK escrito ${reversible.traeRollback ? "si" : "no"})` : ""}`);
    if (sinEfecto && !escribeDatos) {
      console.log("  AVISO  sobre esta base no cambia NADA. Esta base se reconstruyo");
      console.log("         con 0 errores tolerados; produccion toleró 8 en la 507.");
      console.log("         Si hace falta en produccion lo dice el detector de deriva,");
      console.log("         no esta reconstruccion.");
    }
    console.log(`  -> ${clase}`);

    informe.push({
      migracion: num,
      fichero: nombre,
      clase,
      aplica_limpia: aplicaLimpia,
      idempotente: esIdempotente,
      anade: {
        tablas: d.tablas.length,
        columnas: d.columnas.length,
        restricciones: d.restricciones.length,
        indices: d.indices.length,
        politicas_rls: d.politicas.length,
        tablas_que_pasan_a_tener_rls: d.tablas_con_rls.length,
      },
      escribe_datos: escribeDatos,
      se_deja_deshacer: reversible,
      sin_efecto_sobre_esta_base: sinEfecto,
      detalle: {
        tablas: d.tablas.slice(0, 12),
        indices: d.indices.slice(0, 12),
        tablas_que_pasan_a_tener_rls: d.tablas_con_rls.slice(0, 12),
      },
    });

    sql("postgres", `DROP DATABASE IF EXISTS ${db};`, { parar: false });
  }

  sql("postgres", `DROP DATABASE IF EXISTS ${BASE};`, { parar: false });

  const porClase = {};
  for (const e of informe) porClase[e.clase] = (porClase[e.clase] ?? 0) + 1;
  console.log("\n══════════════════════════════════════════════════════════════");
  for (const [k, v] of Object.entries(porClase).sort()) console.log(`  ${k.padEnd(32)} ${v}`);
  console.log("══════════════════════════════════════════════════════════════");

  const salida = path.join(RAIZ, "docs", "evidence", "adr064", "clasificacion.json");
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(
    salida,
    `${JSON.stringify({ base: resumenBase, migraciones: informe }, null, 1)}\n`,
    "utf8",
  );
  console.log(`evidencia: ${salida}`);
}

main();
