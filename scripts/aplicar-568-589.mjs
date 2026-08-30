#!/usr/bin/env node
/**
 * APLICAR LAS MIGRACIONES 568–589. NADA MÁS.
 *
 * QUÉ LO DIFERENCIA DEL MIGRADOR NORMAL. `migrate-pg.mjs` aplica **todo lo
 * pendiente**. La autorización es para veintiuna migraciones concretas, así que
 * este guion no puede aplicar ninguna otra ni aunque estuviera pendiente: el
 * rango está cerrado en el código, no en un parámetro.
 *
 * LAS REGLAS, y las cumple el guion, no la persona que lo lanza:
 *
 *   · Sólo 568–589. Cualquier otra pendiente se ignora y se dice cuál.
 *   · Al PRIMER fallo, para. No reintenta, no tolera errores, no salta.
 *   · No fuerza nada. No hay modo «tolerar» aquí: si algo falla, falla.
 *   · Cada migración se aplica en UNA petición, que es lo que le da la
 *     transacción implícita de PostgreSQL: entera o nada.
 *   · Se recogen los avisos del servidor. Un `RAISE NOTICE` que dice «me salto
 *     esta tabla porque tiene filas» es información que decide, y perderla
 *     sería quedarse con «ok» sin saber qué pasó de verdad.
 *
 * PRECONDICIONES, COMPROBADAS JUSTO ANTES DE ESCRIBIR. Entre medir y aplicar
 * puede cambiar todo, así que se vuelve a mirar aquí:
 *
 *   1. Las 21 siguen pendientes (ni una se ha aplicado por otro lado).
 *   2. No hay transacciones ociosas que puedan bloquear un ALTER.
 *   3. No hay bloqueos sin conceder.
 *   4. El libro de migraciones existe y responde.
 *
 * MODO DE ENSAYO POR DEFECTO. Sin `--ejecutar` no escribe nada.
 *
 * USO
 *   DATABASE_URL="…" node scripts/aplicar-568-589.mjs            (ensayo)
 *   DATABASE_URL="…" node scripts/aplicar-568-589.mjs --ejecutar
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

const DIR = path.join(RAIZ, "backend", "db", "migrations");
const EJECUTAR = process.argv.includes("--ejecutar");
const EVIDENCIA = path.join(RAIZ, "docs", "evidence", "migracion_568_589.json");

/** El rango autorizado, cerrado en el código. 571 no existe; son 21 ficheros. */
const AUTORIZADAS = fs
  .readdirSync(DIR)
  .filter((f) => {
    const m = /^(\d{3})_.*\.sql$/.exec(f);
    if (!m) return false;
    const n = Number(m[1]);
    return n >= 568 && n <= 589;
  })
  .sort();

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL.");
    process.exit(2);
  }

  console.log(`objetivo: ${new URL(dsn).hostname}`);
  console.log(`modo:     ${EJECUTAR ? "ESCRITURA" : "ENSAYO — no se escribe nada"}`);
  console.log(`rango:    568–589 · ${AUTORIZADAS.length} ficheros\n`);

  const pool = new pg.Pool({
    connectionString: dsn,
    max: 1,
    connectionTimeoutMillis: 30_000,
    statement_timeout: 300_000,
  });

  const evidencia = {
    _lee_esto: [
      "Resultado de aplicar las migraciones 568-589 a produccion.",
      "Lo escribe scripts/aplicar-568-589.mjs. No se edita a mano.",
    ],
    momento: new Date().toISOString(),
    rango: "568-589",
    autorizadas: AUTORIZADAS.length,
    precondiciones: {},
    resultados: [],
    fallo: null,
    costeAdicionalEuros: 0,
  };

  const cliente = await pool.connect();

  // Los avisos del servidor: `RAISE NOTICE` y compañía.
  const avisos = [];
  cliente.on("notice", (n) => avisos.push({ severidad: n.severity, mensaje: n.message }));

  try {
    // ── PRECONDICIONES ─────────────────────────────────────────────────────
    console.log("── PRECONDICIONES, comprobadas ahora ────────────────────────");

    const libro = (await cliente.query("SELECT to_regclass('public._migrations')::text AS t")).rows[0]?.t;
    const aplicadas = new Set(
      (await cliente.query("SELECT name FROM _migrations")).rows.map((r) => r.name),
    );
    const pendientesDelRango = AUTORIZADAS.filter((f) => !aplicadas.has(f));
    const yaAplicadasDelRango = AUTORIZADAS.filter((f) => aplicadas.has(f));

    const idle = (
      await cliente.query(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE datname = current_database() AND state = 'idle in transaction'`,
      )
    ).rows[0].n;
    const bloqueos = (await cliente.query("SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted")).rows[0].n;

    evidencia.precondiciones = {
      libroDeMigraciones: libro,
      totalAplicadasAntes: aplicadas.size,
      pendientesDelRango: pendientesDelRango.length,
      yaAplicadasDelRango: yaAplicadasDelRango,
      transaccionesOciosas: idle,
      bloqueosSinConceder: bloqueos,
    };

    console.log(`  libro de migraciones:            ${libro ?? "NO EXISTE"}`);
    console.log(`  aplicadas en total:              ${aplicadas.size}`);
    console.log(`  del rango, pendientes:           ${pendientesDelRango.length} de ${AUTORIZADAS.length}`);
    console.log(`  transacciones ociosas:           ${idle}`);
    console.log(`  bloqueos sin conceder:           ${bloqueos}`);

    const problemas = [];
    if (!libro) problemas.push("no hay libro de migraciones");
    if (idle > 0) problemas.push(`${idle} transacciones ociosas pueden bloquear un ALTER`);
    if (bloqueos > 0) problemas.push(`${bloqueos} bloqueos sin conceder`);
    if (pendientesDelRango.length === 0) problemas.push("no queda ninguna del rango por aplicar");
    if (yaAplicadasDelRango.length > 0) {
      console.log(`  YA APLICADAS del rango:          ${yaAplicadasDelRango.join(", ")}`);
    }

    if (problemas.length > 0) {
      console.log("");
      console.log("NO SE APLICA NADA:");
      for (const p of problemas) console.log(`  · ${p}`);
      evidencia.fallo = { fase: "precondiciones", problemas };
      guardar(evidencia);
      process.exit(pendientesDelRango.length === 0 ? 0 : 2);
    }
    console.log("  precondiciones: OK\n");

    if (!EJECUTAR) {
      console.log("SE APLICARÍAN, en este orden:");
      for (const f of pendientesDelRango) console.log(`  ${f}`);
      console.log("\nENSAYO: no se ha escrito nada. Repite con --ejecutar.");
      guardar(evidencia);
      return;
    }

    // ── APLICACIÓN ─────────────────────────────────────────────────────────
    console.log("── APLICANDO ────────────────────────────────────────────────");
    for (const f of pendientesDelRango) {
      const sql = fs.readFileSync(path.join(DIR, f), "utf8");
      avisos.length = 0;
      const t0 = Date.now();
      process.stdout.write(`  ${f} … `);
      try {
        // UNA sola petición: es lo que le da la transacción implícita.
        await cliente.query(sql);
        await cliente.query("INSERT INTO _migrations (name) VALUES ($1)", [f]);
        const ms = Date.now() - t0;
        console.log(`ok (${ms} ms)${avisos.length ? ` · ${avisos.length} aviso(s)` : ""}`);
        evidencia.resultados.push({
          migracion: f,
          estado: "ok",
          ms,
          avisos: avisos.map((a) => `${a.severidad}: ${a.mensaje}`),
        });
        for (const a of avisos) console.log(`      ${a.severidad}: ${a.mensaje}`);
      } catch (e) {
        const ms = Date.now() - t0;
        console.log("FALLO");
        console.error(`      ${e.message}`);
        evidencia.resultados.push({
          migracion: f,
          estado: "fallo",
          ms,
          error: e.message,
          codigo: e.code ?? null,
          avisos: avisos.map((a) => `${a.severidad}: ${a.mensaje}`),
        });
        evidencia.fallo = { migracion: f, error: e.message, codigo: e.code ?? null };
        console.log("");
        console.log("SE PARA AQUÍ. No se intenta forzar, ni saltar, ni modificar nada.");
        console.log("La transacción implícita ya ha revertido esta migración entera:");
        console.log("las anteriores quedan aplicadas y ésta no ha dejado nada.");
        guardar(evidencia);
        process.exit(2);
      }
    }

    console.log("");
    console.log(`APLICADAS: ${evidencia.resultados.filter((r) => r.estado === "ok").length} de ${pendientesDelRango.length}`);
    guardar(evidencia);
  } catch (e) {
    evidencia.fallo = { fase: "conexion", error: e.message };
    guardar(evidencia);
    console.error("\nNo se ha podido:", e.message);
    process.exit(2);
  } finally {
    cliente.release();
    await pool.end().catch(() => undefined);
  }
}

function guardar(ev) {
  fs.mkdirSync(path.dirname(EVIDENCIA), { recursive: true });
  fs.writeFileSync(EVIDENCIA, `${JSON.stringify(ev, null, 2)}\n`, "utf8");
  console.log(`\nevidencia en ${path.relative(RAIZ, EVIDENCIA)}`);
}

main();
