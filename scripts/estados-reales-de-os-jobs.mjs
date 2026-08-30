#!/usr/bin/env node
/**
 * LOS ESTADOS DE `os_jobs`: LOS QUE HAY, LOS QUE SE ESCRIBEN Y LOS QUE SE
 * PERMITEN. **SOLO LECTURA.**
 *
 * POR QUÉ EXISTE. La migración 579 falló al añadir un `CHECK` que no contemplaba
 * `cancelled`. La reacción fácil sería añadir esa palabra y seguir. Sería un
 * error: nadie ha comprobado que `cancelled` sea el ÚNICO estado que falta, y
 * un `CHECK` incompleto vuelve a fallar en el peor momento — o peor, pasa hoy y
 * rompe mañana cuando alguien escriba un estado legítimo que tampoco está.
 *
 * Así que esto no pregunta «¿falta `cancelled`?». Pregunta **qué estados
 * existen de verdad**, y lo hace por cuatro caminos independientes:
 *
 *   1. LOS QUE HAY EN LA BASE. Todos los distintos de la tabla, con cuántas
 *      filas y desde cuándo. Es el único dato que no opina.
 *   2. LOS QUE EL CÓDIGO ESCRIBE. Cada literal que aparece junto a un `status`
 *      en un `INSERT`, un `UPDATE` o una asignación.
 *   3. LOS QUE EL TIPO DECLARA. La unión de TypeScript.
 *   4. LOS QUE LA MIGRACIÓN PERMITIRÍA. La lista del `CHECK`.
 *
 * Un estado que aparezca en uno y falte en otro es exactamente el defecto que
 * hizo caer la 579. Se cruzan los cuatro y se enseña la tabla.
 *
 * LO QUE NO HACE: no decide cuál es legítimo. Eso exige entender qué significa
 * cada uno, y se hace mirando quién lo escribe y quién lo lee — no contándolos.
 *
 * COSTE: 0 €. Recuentos y lectura de ficheros.
 *
 * USO
 *   DATABASE_URL="…" node scripts/estados-reales-de-os-jobs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");
const SALIDA = path.join(RAIZ, "docs", "CONTRATO_DE_ESTADOS_DE_TRABAJO.md");

/** Estados que el CHECK de la 579 permitiría, leídos del propio fichero. */
function estadosDelCheck() {
  const f = path.join(RAIZ, "backend", "db", "migrations", "579_la_cola_que_nadie_vaciaba.sql");
  const sql = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const m = /CHECK\s*\(\s*status\s+IN\s*\(([\s\S]*?)\)\s*\)/i.exec(sql);
  if (!m) return [];
  return [...m[1].matchAll(/'([a-z_]+)'/gi)].map((x) => x[1]).sort();
}

/** Los que declara la unión de TypeScript. */
function estadosDelTipo() {
  const f = path.join(RAIZ, "backend", "os-agents", "types.ts");
  const t = fs.readFileSync(f, "utf8");
  const m = /export type OsJobStatus\s*=\s*([^;]+);/.exec(t);
  if (!m) return [];
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]).sort();
}

/**
 * Los que el código escribe EN `os_jobs`. Sólo ahí.
 *
 * LA PRIMERA VERSIÓN MIDIÓ EL UNIVERSO EQUIVOCADO. Buscaba `status = '…'` en
 * todo el árbol y devolvió más de cien estados: los de las citas, los de las
 * suscripciones de Stripe, los de las campañas de correo, los de los proyectos.
 * Ninguno tiene nada que ver con la cola de trabajos, y entre ese ruido era
 * imposible ver los cuatro que importan.
 *
 * Un inventario que mide de más no es más seguro que uno que mide de menos: es
 * igual de inútil, sólo que cuesta más darse cuenta.
 *
 * Ahora se buscan dos cosas y sólo dos:
 *
 *   · SQL que nombre `os_jobs` — y dentro de esa sentencia, los literales.
 *   · TypeScript que use el vocabulario de la cola: `OsJobStatus`,
 *     `updateJobStatus`, `markJob…`, o los ficheros del propio almacén.
 */
function estadosQueEscribeElCodigo() {
  const encontrados = new Map();

  const anotar = (est, fichero, num) => {
    const esPrueba = /__tests__|\.test\.|\.spec\.|^scripts\//.test(fichero);
    const actual = encontrados.get(est) ?? { sitios: [], soloPruebas: true };
    actual.sitios.push(`${fichero}:${num}`);
    if (!esPrueba) actual.soloPruebas = false;
    encontrados.set(est, actual);
  };

  // 1 · Ficheros que tocan la cola. Se derivan, no se listan a mano.
  let candidatos = [];
  try {
    candidatos = execFileSync(
      "git",
      ["grep", "-lIE", "os_jobs|OsJobStatus|updateJobStatus|markStep|markJob", "--", "backend", "apps/web/src", "scripts"],
      { cwd: RAIZ, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    candidatos = [];
  }

  // 2 · Dentro de cada uno, los literales que van pegados a un `status`.
  for (const fichero of candidatos) {
    const abs = path.join(RAIZ, fichero);
    if (!fs.existsSync(abs)) continue;
    const lineas = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n").split("\n");
    lineas.forEach((linea, k) => {
      // `status = 'x'`, `status: "x"`, `updateJobStatus(id, "x")`, `IN ('a','b')`
      const tocaEstado = /status\s*[:=]|updateJobStatus|markJob|failJob|completeJob/i.test(linea);
      if (!tocaEstado) return;
      for (const m of linea.matchAll(/['"]([a-z_]{3,24})['"]/g)) {
        const v = m[1];
        // Se descartan las palabras que claramente no son un estado: nombres de
        // tabla, de columna y de fichero se cuelan si no se filtran.
        if (/^(os_jobs|status|job_id|client_id|tenant_id|service_id|payload|steps|error|progress|updated_at|created_at|locked_at|run_after)$/.test(v)) continue;
        anotar(v, fichero, k + 1);
      }
    });
  }
  return encontrados;
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
    // ── 1 · lo que HAY en la base ──────────────────────────────────────────
    const enLaBase = (
      await pool.query(`
        SELECT status,
               count(*)::int              AS filas,
               min(created_at)::date::text AS desde,
               max(created_at)::date::text AS hasta
          FROM os_jobs
         GROUP BY status
         ORDER BY count(*) DESC`)
    ).rows;

    const delCheck = estadosDelCheck();
    const delTipo = estadosDelTipo();
    const delCodigo = estadosQueEscribeElCodigo();

    // La unión de los cuatro: nadie queda fuera de la tabla.
    const todos = [
      ...new Set([
        ...enLaBase.map((r) => r.status),
        ...delCheck,
        ...delTipo,
        ...delCodigo.keys(),
      ]),
    ].sort();

    console.log("ESTADOS DE os_jobs\n");
    console.log("estado".padEnd(20) + "base".padEnd(12) + "CHECK 579".padEnd(11) + "OsJobStatus".padEnd(13) + "código");
    console.log("-".repeat(78));
    const filas = [];
    for (const e of todos) {
      const b = enLaBase.find((r) => r.status === e);
      const c = delCodigo.get(e);
      const fila = {
        estado: e,
        enLaBase: b ? b.filas : 0,
        desde: b?.desde ?? null,
        enElCheck: delCheck.includes(e),
        enElTipo: delTipo.includes(e),
        loEscribeElCodigo: Boolean(c) && !c.soloPruebas,
        soloEnPruebas: Boolean(c) && c.soloPruebas,
        sitios: c?.sitios?.slice(0, 4) ?? [],
      };
      filas.push(fila);
      console.log(
        e.padEnd(20) +
          String(fila.enLaBase ? `${fila.enLaBase} filas` : "—").padEnd(12) +
          (fila.enElCheck ? "sí" : "NO").padEnd(11) +
          (fila.enElTipo ? "sí" : "NO").padEnd(13) +
          (fila.loEscribeElCodigo ? "sí" : fila.soloEnPruebas ? "sólo pruebas" : "no"),
      );
    }

    // ── el diagnóstico ─────────────────────────────────────────────────────
    const enBaseYNoEnCheck = filas.filter((f) => f.enLaBase > 0 && !f.enElCheck);
    const escritosYNoEnCheck = filas.filter((f) => f.loEscribeElCodigo && !f.enElCheck);
    const escritosYNoEnTipo = filas.filter((f) => f.loEscribeElCodigo && !f.enElTipo);
    const enCheckYNadieUsa = filas.filter(
      (f) => f.enElCheck && f.enLaBase === 0 && !f.loEscribeElCodigo,
    );

    console.log("");
    console.log("── LO QUE NO CUADRA ─────────────────────────────────────────");
    console.log(`  hay filas con un estado que el CHECK no permite:  ${enBaseYNoEnCheck.length}`);
    for (const f of enBaseYNoEnCheck) console.log(`     · ${f.estado} (${f.enLaBase} filas desde ${f.desde})`);
    console.log(`  el código escribe estados que el CHECK no permite: ${escritosYNoEnCheck.length}`);
    for (const f of escritosYNoEnCheck) console.log(`     · ${f.estado} — ${f.sitios[0] ?? "?"}`);
    console.log(`  el código escribe estados que el tipo no declara:  ${escritosYNoEnTipo.length}`);
    for (const f of escritosYNoEnTipo) console.log(`     · ${f.estado} — ${f.sitios[0] ?? "?"}`);
    console.log(`  el CHECK permite estados que nadie usa:            ${enCheckYNadieUsa.length}`);
    for (const f of enCheckYNadieUsa) console.log(`     · ${f.estado}`);
    console.log("");

    fs.mkdirSync(path.join(RAIZ, "docs", "evidence"), { recursive: true });
    fs.writeFileSync(
      path.join(RAIZ, "docs", "evidence", "estados_de_os_jobs.json"),
      `${JSON.stringify(
        {
          _lee_esto: [
            "Cruce de los cuatro sitios donde vive el estado de un trabajo:",
            "la base, el CHECK de la 579, el tipo OsJobStatus y lo que escribe el codigo.",
            "Medido en solo lectura contra produccion.",
          ],
          medidoEn: new Date().toISOString(),
          enLaBase,
          delCheck,
          delTipo,
          filas,
          desajustes: {
            enBaseYNoEnCheck: enBaseYNoEnCheck.map((f) => f.estado),
            escritosYNoEnCheck: escritosYNoEnCheck.map((f) => f.estado),
            escritosYNoEnTipo: escritosYNoEnTipo.map((f) => f.estado),
            enCheckYNadieUsa: enCheckYNadieUsa.map((f) => f.estado),
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log("evidencia en docs/evidence/estados_de_os_jobs.json");
    console.log(`(el documento legible se compone aparte, en ${path.relative(RAIZ, SALIDA)})`);
  } catch (e) {
    console.error("No se pudo mirar:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main();
