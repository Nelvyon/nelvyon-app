/**
 * Deja la base de certificacion LOCAL sin residuo de ejecuciones anteriores.
 *
 * ── POR QUE HACE FALTA ──────────────────────────────────────────────────────
 *
 * `backend/tests/_vista_global_limpia.py` impide que las baterias que miran la
 * vista GLOBAL midan sobre datos de otra ejecucion, y hace bien: el residuo
 * empuja siempre hacia el mismo lado —hace que las metricas parezcan sanas—.
 *
 * Pero solo DETECTA. El mensaje explica a una persona que hay que borrar y en
 * que orden; nadie lo habia escrito como script. Cuando una ejecucion se
 * interrumpe —se paro el Docker que sostiene la base, que es lo que pasa— el
 * teardown no corre y la suite entera queda bloqueada hasta que alguien lo hace
 * a mano.
 *
 * 37 errores de pytest venian de aqui, todos con el mismo mensaje.
 *
 * ── POR QUE NO CASCADEA SOLO ────────────────────────────────────────────────
 *
 * `autopilot_jobs.workspace_id` NO tiene clave foranea a `workspaces`. Las
 * baterias borran su workspace al terminar y sus trabajos se quedan. Con la
 * ejecucion completa no se nota —cada una limpia lo suyo— pero una interrupcion
 * deja las filas huerfanas para siempre.
 *
 * ── QUE BORRA, Y QUE NO ─────────────────────────────────────────────────────
 *
 * Solo lo que crea la certificacion:
 *
 *   · trabajos de autopilot de workspaces que YA NO EXISTEN;
 *   · workspaces cuyo nombre empieza por CERTIFICATION, y sus trabajos;
 *   · los sujetos sinteticos de `politicasRealesDeCertificacion` (101 y 202).
 *
 * NO borra nada mas. Y se niega a correr si el destino no parece una base local:
 * el mismo script apuntado a produccion borraria trabajo de clientes.
 *
 * COSTE EXTERNO: 0 EUR. Base local.
 */
import pg from "pg";

const dsn = process.env.NELVYON_WEB_CERT_DSN ?? process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL;
if (!dsn) {
  console.error(JSON.stringify({ ok: false, error: "sin DSN de certificacion" }));
  process.exit(2);
}

/**
 * NO SE EJECUTA CONTRA NADA QUE NO SEA LOCAL.
 *
 * Es un script que BORRA. Un despiste de variable de entorno —y en esta sesion
 * han convivido cuatro DSN distintos— bastaria para llevarselo por delante todo
 * en otro sitio. Asi que se comprueba el host antes de abrir la conexion.
 */
const host = (() => {
  try {
    return new URL(dsn).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost", "::1", "host.docker.internal"].includes(host)) {
  console.error(
    JSON.stringify({ ok: false, error: `destino no local (${host}); este script borra y solo corre en local` }),
  );
  process.exit(2);
}

const cli = new pg.Client({ connectionString: dsn, statement_timeout: 60_000 });
const salida = { ok: true, destino: `${host}${new URL(dsn).pathname}`, borrado: {} };

/** Ejecuta y devuelve cuantas filas quito; tolera que la tabla no exista. */
async function quitar(nombre, sql, params = []) {
  try {
    const r = await cli.query(sql, params);
    if (r.rowCount) salida.borrado[nombre] = r.rowCount;
  } catch (e) {
    // Una tabla que no existe en este despliegue no es un fallo de limpieza.
    if (!/does not exist/i.test(e.message)) throw e;
  }
}

try {
  await cli.connect();

  // 1. Trabajos de autopilot cuyo workspace ya no esta. Son los que la falta de
  //    clave foranea deja atras cuando una bateria borra su workspace.
  await quitar(
    "autopilot_jobs huerfanos",
    `DELETE FROM autopilot_jobs j
      WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = j.workspace_id)`,
  );

  // 2. Todo lo de los workspaces de certificacion, y despues ellos.
  await quitar(
    "autopilot_jobs de CERTIFICATION",
    `DELETE FROM autopilot_jobs j
      WHERE EXISTS (SELECT 1 FROM workspaces w
                     WHERE w.id = j.workspace_id AND w.name LIKE 'CERTIFICATION%')`,
  );
  await quitar(
    "workspace_members de CERTIFICATION",
    `DELETE FROM workspace_members m
      WHERE EXISTS (SELECT 1 FROM workspaces w
                     WHERE w.id = m.workspace_id AND w.name LIKE 'CERTIFICATION%')`,
  );
  await quitar("workspaces CERTIFICATION", `DELETE FROM workspaces WHERE name LIKE 'CERTIFICATION%'`);

  // 3. Los sujetos sinteticos de las suites de RLS. Se recrean solos: el modulo
  //    los inserta con ON CONFLICT DO NOTHING en cada arranque.
  await quitar("autopilot_jobs de cert-ws", `DELETE FROM autopilot_jobs WHERE workspace_id IN (101, 202)`);
  await quitar("workspace_members de cert-ws", `DELETE FROM workspace_members WHERE workspace_id IN (101, 202)`);
  await quitar("workspaces cert-ws", `DELETE FROM workspaces WHERE id IN (101, 202) AND name LIKE 'cert-ws-%'`);

  // 3-bis. Los `os_jobs` que dejan las baterias de cableado.
  //
  // `todosLosServiciosPorElMismoCableado` encola un trabajo por servicio y
  // reclama UNO. `reclamar(1)` devuelve el MAS ANTIGUO, asi que en cuanto
  // quedan trabajos de una corrida anterior, la prueba reclama uno viejo y
  // concluye «nadie pudo reclamar el trabajo recien encolado».
  //
  // Ya paso con `seo_premium` y esta documentado dentro de esa bateria. Volvio
  // a pasar con `web_premium`: 76 trabajos acumulados, 57 suyos. El diagnostico
  // anterior arreglo la suposicion de la prueba pero no la ACUMULACION, asi que
  // el fallo reaparece cada vez que la suite corre unas cuantas veces.
  //
  // Es residuo de prueba, no trabajo de nadie: esta base es local —el guardia de
  // arriba lo exige— y aqui no hay clientes.
  await quitar(
    "os_jobs de certificacion",
    `DELETE FROM os_jobs
      WHERE status IN ('queued','running')
        AND (tenant_id IS NULL OR tenant_id::text LIKE 'cert%' OR client_id::text LIKE 'cert%'
             OR service_id IS NOT NULL)`,
  );

  // 4. Lo que queda en la vista global y no deberia.
  const restan = (
    await cli.query(
      `SELECT (SELECT count(*)::int FROM autopilot_jobs
                WHERE estado IN ('confirmed','delivered')) AS confirmados,
              (SELECT count(*)::int FROM workspaces WHERE name LIKE 'CERTIFICATION%') AS workspaces`,
    )
  ).rows[0];
  salida.vistaGlobal = { confirmados: Number(restan.confirmados), workspaces: Number(restan.workspaces) };
  salida.limpia = salida.vistaGlobal.confirmados === 0 && salida.vistaGlobal.workspaces === 0;
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
process.exit(salida.ok && salida.limpia ? 0 : 1);
