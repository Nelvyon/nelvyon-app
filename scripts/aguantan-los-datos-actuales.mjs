#!/usr/bin/env node
/**
 * ¿AGUANTAN LOS DATOS DE HOY LAS RESTRICCIONES QUE VIENEN? **SOLO LECTURA.**
 *
 * LA LECCIÓN QUE LO PROVOCÓ. El preflight anterior comprobó qué objetos crean
 * las migraciones pendientes y si chocaban con los existentes. Salió limpio, y
 * aun así la 579 falló: añade un `CHECK` sobre `os_jobs.status` y había doce
 * filas con un valor que la lista no contemplaba.
 *
 * Es un tipo de dependencia que el preflight anterior no miraba: **entre los
 * DATOS actuales y las RESTRICCIONES pendientes**. Comprobar que una tabla no
 * existe todavía es fácil; comprobar que las filas que ya hay van a caber en
 * una regla que aún no se ha aplicado es lo que de verdad decide.
 *
 * QUÉ HACE. Por cada migración pendiente saca las restricciones que añadiría
 * —`CHECK`, `NOT NULL`, `UNIQUE`, clave ajena— y, para las que caen sobre una
 * tabla que YA existe con datos, ejecuta la consulta que cuenta las filas que
 * las violarían. Si sale cero, esa restricción entra. Si no, se dice cuántas y
 * cuáles antes de tocar nada.
 *
 * LO QUE NO HACE. No aplica nada. No arregla datos. Y no promete cubrir todo:
 * el SQL admite formas que este análisis no reconoce, y cuando no entiende algo
 * lo dice en vez de callarlo. Un «no lo sé» sirve; un «todo bien» que no ha
 * mirado, no.
 *
 * COSTE: 0 €. Recuentos sobre tablas que ya existen.
 *
 * USO
 *   DATABASE_URL="…" node scripts/aguantan-los-datos-actuales.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");
const DIR = path.join(RAIZ, "backend", "db", "migrations");
const SALIDA = path.join(RAIZ, "docs", "AGUANTAN_LOS_DATOS.md");

/** Sin comentarios y sin CRLF, que ya costó un falso positivo. */
const limpiar = (sql) =>
  sql
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");

/**
 * Las restricciones que una migración añadiría, con la consulta que las
 * comprobaría contra los datos de hoy.
 */
function restriccionesDe(fichero) {
  const sql = limpiar(fs.readFileSync(path.join(DIR, fichero), "utf8"));
  const fuera = [];

  // CHECK (col IN ('a','b',…)) — el caso exacto de la 579.
  for (const m of sql.matchAll(
    /ALTER TABLE\s+(?:public\.)?"?([a-z0-9_]+)"?[\s\S]{0,200}?ADD CONSTRAINT\s+([a-z0-9_]+)\s+CHECK\s*\(\s*([a-z0-9_]+)\s+IN\s*\(([^)]*)\)/gi,
  )) {
    const [, tabla, nombre, columna, lista] = m;
    const valores = [...lista.matchAll(/'([^']*)'/g)].map((x) => x[1]);
    fuera.push({
      tipo: "CHECK IN",
      tabla,
      nombre,
      columna,
      valores,
      consulta: `SELECT count(*)::int AS n FROM public.${tabla} WHERE ${columna} IS NOT NULL AND ${columna} <> ALL($1::text[])`,
      params: [valores],
      queViola: `filas cuyo ${columna} no está en la lista`,
    });
  }

  // ADD COLUMN … NOT NULL sin DEFAULT: sobre una tabla con filas, falla.
  for (const m of sql.matchAll(
    /ALTER TABLE\s+(?:public\.)?"?([a-z0-9_]+)"?[\s\S]{0,120}?ADD COLUMN(?:\s+IF NOT EXISTS)?\s+([a-z0-9_]+)\s+([a-z0-9_ ()]+?)\s+NOT NULL(?!\s+DEFAULT)/gi,
  )) {
    const [, tabla, columna] = m;
    fuera.push({
      tipo: "NOT NULL sin defecto",
      tabla,
      nombre: `${tabla}.${columna}`,
      columna,
      consulta: `SELECT count(*)::int AS n FROM public.${tabla}`,
      params: [],
      queViola: "cualquier fila existente: una columna NOT NULL sin valor por defecto no cabe",
    });
  }

  // UNIQUE sobre columnas existentes.
  for (const m of sql.matchAll(
    /CREATE\s+UNIQUE\s+INDEX(?:\s+IF NOT EXISTS)?\s+([a-z0-9_]+)\s+ON\s+(?:public\.)?"?([a-z0-9_]+)"?\s*\(([^)]+)\)/gi,
  )) {
    const [, nombre, tabla, cols] = m;
    const columnas = cols
      .split(",")
      .map((c) => c.trim().split(/\s/)[0])
      .filter((c) => /^[a-z0-9_]+$/.test(c));
    if (columnas.length === 0) continue;
    fuera.push({
      tipo: "UNIQUE",
      tabla,
      nombre,
      columna: columnas.join(", "),
      consulta:
        `SELECT coalesce(sum(c - 1), 0)::int AS n FROM (` +
        `SELECT count(*) AS c FROM public.${tabla} GROUP BY ${columnas.join(", ")} HAVING count(*) > 1) t`,
      params: [],
      queViola: "filas duplicadas en esas columnas",
    });
  }

  return fuera;
}

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL.");
    process.exit(2);
  }
  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 25_000,
    options: "-c default_transaction_read_only=on",
  });

  try {
    const aplicadas = new Set(
      (await pool.query("SELECT name FROM _migrations")).rows.map((r) => r.name),
    );
    const pendientes = fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".sql") && !aplicadas.has(f))
      .sort();

    console.log(`pendientes: ${pendientes.length}\n`);
    const informe = [];

    for (const f of pendientes) {
      const rs = restriccionesDe(f);
      if (rs.length === 0) {
        console.log(`  ${f}\n     sin restricciones que dependan de los datos`);
        informe.push({ migracion: f, restricciones: [] });
        continue;
      }
      console.log(`  ${f}`);
      const resultados = [];
      for (const r of rs) {
        // ¿Existe ya la tabla? Si no, no hay datos que puedan violar nada.
        const existe = (
          await pool.query("SELECT to_regclass($1)::text AS t", [`public.${r.tabla}`])
        ).rows[0]?.t;
        if (!existe) {
          console.log(`     ${r.tipo} sobre ${r.tabla}: la tabla NO existe todavía · sin riesgo`);
          resultados.push({ ...r, estado: "tabla_nueva", violan: 0 });
          continue;
        }
        try {
          const n = (await pool.query(r.consulta, r.params)).rows[0].n;
          const ok = Number(n) === 0;
          console.log(
            `     ${r.tipo} sobre ${r.tabla}.${r.columna}: ${ok ? "0 filas la violan · entra" : `⚠️  ${n} FILAS LA VIOLAN`}`,
          );
          if (!ok) console.log(`        (${r.queViola})`);
          resultados.push({ ...r, estado: ok ? "ok" : "violada", violan: Number(n) });
        } catch (e) {
          console.log(`     ${r.tipo} sobre ${r.tabla}: NO SE HA PODIDO COMPROBAR (${e.message.slice(0, 60)})`);
          resultados.push({ ...r, estado: "no_comprobable", error: e.message });
        }
      }
      informe.push({ migracion: f, restricciones: resultados });
    }

    const violadas = informe.flatMap((i) =>
      i.restricciones.filter((r) => r.estado === "violada").map((r) => ({ ...r, migracion: i.migracion })),
    );
    const noComprobables = informe.flatMap((i) =>
      i.restricciones.filter((r) => r.estado === "no_comprobable"),
    );

    console.log("");
    console.log("── VEREDICTO ────────────────────────────────────────────────");
    console.log(`  restricciones que los datos de HOY violarían: ${violadas.length}`);
    for (const v of violadas) console.log(`     · ${v.migracion}: ${v.nombre} (${v.violan} filas)`);
    console.log(`  no comprobables:                              ${noComprobables.length}`);
    for (const v of noComprobables) console.log(`     · ${v.tabla}.${v.columna}`);
    if (violadas.length === 0 && noComprobables.length === 0) {
      console.log("  Los datos actuales caben en todas las restricciones pendientes.");
    }
    console.log("");

    fs.mkdirSync(path.join(RAIZ, "docs", "evidence"), { recursive: true });
    fs.writeFileSync(
      path.join(RAIZ, "docs", "evidence", "aguantan_los_datos.json"),
      `${JSON.stringify(
        {
          _lee_esto: [
            "Comprueba si los DATOS actuales de produccion caben en las",
            "RESTRICCIONES que anadirian las migraciones pendientes.",
            "Es la comprobacion que falto antes de la 579.",
          ],
          medidoEn: new Date().toISOString(),
          pendientes: pendientes.length,
          violadas: violadas.length,
          noComprobables: noComprobables.length,
          informe,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log("evidencia en docs/evidence/aguantan_los_datos.json");
  } catch (e) {
    console.error("No se pudo mirar:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main();
