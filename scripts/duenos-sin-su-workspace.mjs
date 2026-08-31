#!/usr/bin/env node
/**
 * ¿HAY DUEÑOS QUE NO PUEDEN ENTRAR EN SU PROPIO WORKSPACE? **SOLO LECTURA.**
 *
 * EL DEFECTO QUE VIGILA. Crear un workspace insertaba la fila en `workspaces` y
 * devolvía `role: "owner", members_count: 1` — pero no escribía la pertenencia
 * en `workspace_members`. La respuesta mentía.
 *
 * Con RLS activo eso deja al creador FUERA de lo suyo:
 * `nelvyon_user_in_workspace()` consulta esa tabla, así que las políticas le
 * deniegan. Y no da error: **devuelve cero filas**. El cliente se registra, crea
 * su espacio y el producto le aparece vacío.
 *
 * EL CÓDIGO YA ESTÁ ARREGLADO en los dos caminos, y se comprobó antes de
 * escribir esto:
 *
 *   · `platformDbFallback.ts` inserta la pertenencia tras crear el workspace;
 *   · `workspace_management.py` la asegura con `_asegurar_pertenencia_owner`
 *     dentro de la MISMA transacción, entre el `flush` y el `commit`, para que
 *     un fallo no deje un workspace huérfano.
 *
 * LO QUE NO ARREGLÓ NINGUNO DE LOS DOS: las filas que ya existían. Un arreglo
 * de camino de código no toca lo que se creó antes, y nadie volvió a mirar.
 *
 * POR QUÉ HACE FALTA ESTO Y NO UNA PRUEBA. Es un estado de DATOS, no de código.
 * Una prueba comprueba que el camino nuevo escribe bien; no puede saber qué
 * quedó en una base que lleva meses funcionando. Esta pregunta sólo se le puede
 * hacer a la base.
 *
 * NO ESCRIBE NADA. Abre la conexión en solo lectura y aborta si pudiera escribir.
 *
 * COSTE: 0 €.
 *
 * USO
 *   DATABASE_URL="…" node scripts/duenos-sin-su-workspace.mjs
 *   DATABASE_URL="…" node scripts/duenos-sin-su-workspace.mjs --json
 */
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

/**
 * La consulta. Se expone para que una prueba pueda comprobar QUE PREGUNTA LO
 * CORRECTO sin necesitar una base: el SQL es la parte que puede equivocarse en
 * silencio, y una consulta mal escrita devuelve «ninguno» tan tranquila.
 */
export const SQL_DUENOS_SIN_PERTENENCIA = `
  SELECT w.id,
         w.status,
         w.created_at::date::text AS creado,
         (SELECT count(*)::int FROM workspace_members m WHERE m.workspace_id = w.id) AS miembros
    FROM workspaces w
   WHERE NOT EXISTS (
           SELECT 1
             FROM workspace_members m
            WHERE m.workspace_id = w.id
              AND m.user_id = w.user_id
              AND m.status = 'active'
         )
   ORDER BY w.id`;

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
    // Se comprueba que la conexión NO puede escribir. Un script que dice ser de
    // solo lectura y no lo es, es peor que uno que no lo dice.
    try {
      await pool.query("CREATE TEMP TABLE si_puedo_escribir_aborto (x int)");
      console.error("ABORTADO: la conexion PUEDE escribir y este script promete que no.");
      process.exit(3);
    } catch {
      /* correcto: la sesion es de solo lectura */
    }

    const { rows: sinDueno } = await pool.query(SQL_DUENOS_SIN_PERTENENCIA);
    const { rows: totales } = await pool.query("SELECT count(*)::int AS n FROM workspaces");
    const total = totales[0]?.n ?? 0;

    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ total, afectados: sinDueno }, null, 2));
      process.exit(sinDueno.length ? 2 : 0);
    }

    console.log("DUEÑOS QUE NO PUEDEN ENTRAR EN SU PROPIO WORKSPACE\n");
    console.log(`  workspaces en total          : ${total}`);
    console.log(`  con el dueño SIN pertenencia : ${sinDueno.length}\n`);
    if (total === 0) {
      // Cero workspaces no es un aprobado: es que no se ha mirado nada.
      console.log("  NO HAY NINGUN WORKSPACE. Eso no es un PASS.");
      process.exit(3);
    }
    for (const r of sinDueno) {
      console.log(`  ws ${String(r.id).padEnd(5)} estado=${r.status}  creado=${r.creado}  miembros=${r.miembros}`);
    }
    console.log("");
    console.log(
      sinDueno.length === 0
        ? "TODOS LOS DUEÑOS TIENEN SU PERTENENCIA."
        : "Estos dueños ven su producto VACIO. No es un error visible: RLS devuelve cero filas.",
    );
    process.exit(sinDueno.length ? 2 : 0);
  } catch (e) {
    console.error("No se pudo mirar:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

const invocadoDirectamente =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invocadoDirectamente) main();
