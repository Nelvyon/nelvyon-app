#!/usr/bin/env node
/**
 * LA HUELLA DEL ESQUEMA, ANTES Y DESPUÉS. **NO ESCRIBE NADA EN LA BASE.**
 *
 * PARA QUÉ SIRVE. Antes de aplicar migraciones a producción hay que poder
 * contestar, después, a una pregunta muy concreta: *¿qué ha cambiado
 * exactamente?* No «¿ha ido bien?» —eso lo dice el proceso de migración y ya
 * miente cuando una sentencia se salta en silencio— sino qué objetos hay ahora
 * que antes no estaban, y cuáles han desaparecido.
 *
 * POR QUÉ NO ES UN `pg_dump`. Dos razones, y las dos importan:
 *
 *   1. COSTE. Un volcado completo de esta base mueve cientos de megas por el
 *      proxy público. Eso es tráfico de salida de verdad, y bajo el modo de
 *      coste cero no se hace sin que alguien lo autorice. Esta huella son
 *      catálogos: unos cientos de kilobytes.
 *
 *   2. UTILIDAD. Un `pg_dump` de 200 MB no se compara con otro de 200 MB: se
 *      compara con los ojos y no se compara. Esto sale ordenado y estable, así
 *      que dos huellas se restan con un `diff` y lo que salga es exactamente lo
 *      que cambió.
 *
 * LO QUE NO ES. No es una copia de seguridad. No lleva ni una fila de datos, y
 * lo dice aquí para que nadie lo confunda: **con esto NO se recupera nada**.
 * Sirve para saber qué pasó, no para deshacerlo.
 *
 * Para las 21 migraciones pendientes esa distinción no es un problema, y
 * conviene explicar por qué: crean 28 tablas que no existen y 7 columnas
 * nuevas, y la única sentencia que toca datos es un `UPDATE` sobre una tabla
 * con cero filas. No hay datos que perder, así que lo que hace falta para poder
 * volver atrás no es una copia: es saber qué se creó, y cada migración ya trae
 * su `DROP` de vuelta escrito en la cabecera.
 *
 * PRIVACIDAD. Sólo nombres de objetos del esquema. Ni una fila, ni un correo,
 * ni un identificador de cliente.
 *
 * USO
 *   DATABASE_URL="<...>" node scripts/huella-del-esquema.mjs docs/evidence/esquema_antes.json
 *   diff docs/evidence/esquema_antes.json docs/evidence/esquema_despues.json
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  const salida = process.argv[2];
  if (!dsn || !salida) {
    console.error("USO: DATABASE_URL=… node scripts/huella-del-esquema.mjs <fichero de salida>");
    process.exit(2);
  }

  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 25_000,
    statement_timeout: 120_000,
    // La garantía la impone PostgreSQL, no la revisión de código.
    options: "-c default_transaction_read_only=on",
  });

  const conReintento = async (fn) => {
    let ultimo;
    for (let i = 0; i < 3; i += 1) {
      try {
        return await fn();
      } catch (e) {
        ultimo = e;
        if (!/ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(String(e.message))) throw e;
        console.error(`  (reintento ${i + 1}/3)`);
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
    throw ultimo;
  };

  const q = async (sql) => (await conReintento(() => pool.query(sql))).rows;

  try {
    // Se comprueba que de verdad no se puede escribir. Si se pudiera, se para:
    // una huella tomada por una conexión con permiso de escritura no prueba lo
    // que dice probar.
    let soloLectura = false;
    try {
      await pool.query("CREATE TEMP TABLE _huella_no_deberia_existir (x int)");
    } catch (e) {
      soloLectura = /read-only|solo lectura/i.test(String(e.message));
    }
    if (!soloLectura) {
      console.error("La conexión NO es de solo lectura. No se toma la huella.");
      process.exit(2);
    }

    const columnas = await q(`
      SELECT table_name || '.' || column_name || ':' || data_type ||
             CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END AS f
        FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY 1`);

    const indices = await q(`
      SELECT tablename || ':' || indexname AS f
        FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1`);

    const politicas = await q(`
      SELECT tablename || ':' || policyname || ':' || cmd AS f
        FROM pg_policies WHERE schemaname = 'public' ORDER BY 1`);

    /**
     * LAS RESTRICCIONES `NOT NULL` SE DEJAN FUERA, y no es por comodidad.
     *
     * PostgreSQL 17 empezó a materializarlas en `pg_constraint` con
     * `contype = 'n'`; en 16 y anteriores no aparecen ahí. Comparar una base
     * 18.6 con una 16 daba 4.496 «restricciones que producción tiene y la
     * referencia no» — todas falsas, todas `NOT NULL`, y suficientes para
     * enterrar las diecisiete diferencias que sí importaban.
     *
     * Un detector que grita cuando no pasa nada enseña a no hacerle caso. Los
     * `NOT NULL` siguen vigilados donde sí son comparables: en la lista de
     * columnas, que los lleva pegados al tipo.
     */
    const restricciones = await q(`
      SELECT rel.relname || ':' || con.conname || ':' || con.contype::text AS f
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = rel.relnamespace
       WHERE n.nspname = 'public' AND con.contype <> 'n'
       ORDER BY 1`);

    const rls = await q(`
      SELECT c.relname AS f
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
       ORDER BY 1`);

    const migraciones = await q(`SELECT name AS f FROM _migrations ORDER BY 1`);

    const huella = {
      _lee_esto: [
        "Huella del ESQUEMA. No es una copia de seguridad: no lleva ni una fila.",
        "Sirve para saber que cambio, no para deshacerlo.",
        "Se compara con `diff` contra otra huella tomada despues.",
      ],
      tomadaEn: new Date().toISOString(),
      servidor: (await q("SELECT version() AS f"))[0].f.split(",")[0],
      resumen: {
        columnas: columnas.length,
        indices: indices.length,
        politicas: politicas.length,
        restricciones: restricciones.length,
        tablasConRls: rls.length,
        migracionesAplicadas: migraciones.length,
      },
      columnas: columnas.map((r) => r.f),
      indices: indices.map((r) => r.f),
      politicas: politicas.map((r) => r.f),
      restricciones: restricciones.map((r) => r.f),
      tablasConRls: rls.map((r) => r.f),
      migracionesAplicadas: migraciones.map((r) => r.f),
    };

    fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
    fs.writeFileSync(path.resolve(salida), `${JSON.stringify(huella, null, 2)}\n`, "utf8");

    console.log("");
    console.log("HUELLA DEL ESQUEMA");
    for (const [k, v] of Object.entries(huella.resumen)) {
      console.log(`  ${String(v).padStart(6)}  ${k}`);
    }
    console.log("");
    console.log(`  escrita en ${salida}`);
    console.log("");
  } catch (e) {
    console.error("No se pudo tomar la huella:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main();
