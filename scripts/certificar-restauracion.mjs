#!/usr/bin/env node
/**
 * BLOQUE 9 · certificar una restauración, no un simulacro.
 *
 * Ya existe `run-postgres-restore-drill.mjs` y funciona: hace `pg_dump`, crea una
 * base nueva, restaura y comprueba un marcador. Eso demuestra que **la tubería
 * existe**. No demuestra que vuelva el producto.
 *
 * Un marcador de una fila sobrevive a casi cualquier restauración rota. Lo que
 * no sobrevive —y es justo lo que se echa de menos el día que hace falta— son
 * las restricciones, los índices, las secuencias, las políticas de RLS y las
 * relaciones entre tablas. Un volcado restaurado sin su clave foránea acepta
 * datos que la aplicación considera imposibles, y nadie se entera hasta semanas
 * después.
 *
 * Esto certifica la restauración con lo que de verdad importa:
 *
 *   1. **Un inquilino real**, no un marcador: usuario, workspace, inquilino,
 *      contactos e inscripciones, relacionados entre sí.
 *   2. **Suma de comprobación del contenido**, calculada en el origen y
 *      recalculada en el destino. Que estén las filas no basta: tienen que ser
 *      las mismas.
 *   3. **La estructura**: recuento de tablas, restricciones, índices y políticas
 *      de RLS. Una restauración que trae los datos y se deja las restricciones es
 *      una bomba de relojería.
 *   4. **Que la aplicación puede USARLA**: se conecta y ejecuta una consulta del
 *      producto contra la base restaurada.
 *
 * Sin credenciales de producción y sin tocar nada fuera de Docker.
 *
 * USO
 *   CERT_PG_CONTAINER=nelvyon-local-ai-postgres \
 *   CERT_PG_USER=nelvyon_local \
 *   CERT_SOURCE_DB=nelvyon_cert545 \
 *   DATABASE_URL=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_cert545 \
 *     node scripts/certificar-restauracion.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = path.join(ROOT, "docs", "evidence", "bloque9");
const CONTENEDOR = process.env.CERT_PG_CONTAINER || "nelvyon-local-ai-postgres";
const USUARIO_PG = process.env.CERT_PG_USER || "nelvyon_local";
const ORIGEN = process.env.CERT_SOURCE_DB || "nelvyon_cert545";
const DESTINO = `nelvyon_restaurada_${Date.now()}`;

const require = createRequire(path.join(ROOT, "backend", "db", "package.json"));
const pg = require("pg");

const pasos = [];
function anotar(nombre, ok, detalle = {}) {
  pasos.push({ paso: nombre, ok, ...detalle });
  console.log(`${ok ? "PASA " : "FALLA"} ${nombre}${ok ? "" : "  " + JSON.stringify(detalle)}`);
  return ok;
}

function enContenedor(args, opts = {}) {
  const r = spawnSync("docker", ["exec", CONTENEDOR, ...args], { encoding: "utf8", ...opts });
  return { status: r.status ?? 1, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function psql(db, sql) {
  return enContenedor(["psql", "-U", USUARIO_PG, "-d", db, "-tAc", sql]);
}

/** Marca del inquilino sembrado: única por ejecución, para no chocar. */
const MARCA = `restauracion-${Date.now()}`;
const USUARIO = `9a${String(Date.now() % 1e10).padStart(10, "0")}-0000-4000-8000-000000000001`.slice(0, 36);

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });

  // ── 0 · el contenedor responde ────────────────────────────────────────────
  const vivo = enContenedor(["pg_isready", "-U", USUARIO_PG]);
  if (!anotar("contenedor_responde", vivo.status === 0, { err: vivo.err })) return fin();

  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();

  // ── 1 · sembrar un inquilino REAL, con relaciones ─────────────────────────
  let tenantId = "";
  try {
    await cliente.query(
      `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
       VALUES ($1, $2, 'x', 'Restauracion', 'pro')`,
      [USUARIO, `${MARCA}@ejemplo.test`],
    );
    const ws = Math.floor(Math.random() * 100000) + 980000;
    await cliente.query(`INSERT INTO workspaces (id, user_id, name) VALUES ($1,$2,$3)`, [
      ws,
      USUARIO,
      MARCA,
    ]);
    const t = await cliente.query(
      `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
       VALUES ($1,$2,'tech','pro',true,$3) RETURNING id`,
      [USUARIO, MARCA, ws],
    );
    tenantId = t.rows[0].id;
    await cliente.query(
      `INSERT INTO saas_contacts (id, tenant_id, name, status, pipeline_stage, value, tags, lead_score)
       SELECT gen_random_uuid(), $1::uuid, 'Contacto ' || i, 'lead', 'new', i * 10, ARRAY[$2], i
         FROM generate_series(1, 250) AS i`,
      [tenantId, MARCA],
    );
    anotar("sembrar_inquilino_real", true, { tenantId, contactos: 250 });
  } catch (e) {
    anotar("sembrar_inquilino_real", false, { error: String(e).slice(0, 200) });
    await cliente.end();
    return fin();
  }

  // ── 2 · suma de comprobación del CONTENIDO, no solo del recuento ──────────
  const sumaSql = `
    SELECT md5(string_agg(t, '|' ORDER BY t)) AS suma, count(*)::text AS n FROM (
      SELECT name || ':' || value::text || ':' || lead_score::text AS t
        FROM saas_contacts WHERE tenant_id = '${tenantId}'
    ) s`;
  const origenSuma = await cliente.query(sumaSql);
  const sumaOrigen = origenSuma.rows[0].suma;
  anotar("suma_del_origen", Boolean(sumaOrigen), { suma: sumaOrigen, filas: origenSuma.rows[0].n });

  // ── 3 · estructura del origen: lo que tiene que volver ────────────────────
  const estructuraSql = `
    SELECT
      (SELECT count(*) FROM information_schema.tables WHERE table_schema='public')::text AS tablas,
      (SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
        JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public')::text AS restricciones,
      (SELECT count(*) FROM pg_indexes WHERE schemaname='public')::text AS indices,
      (SELECT count(*) FROM pg_policies WHERE schemaname='public')::text AS politicas_rls`;
  const est = await cliente.query(estructuraSql);
  const estructuraOrigen = est.rows[0];
  anotar("estructura_del_origen", true, estructuraOrigen);
  await cliente.end();

  // ── 4 · volcado ───────────────────────────────────────────────────────────
  const volcado = `/tmp/${DESTINO}.dump`;
  const dump = enContenedor(["pg_dump", "-U", USUARIO_PG, "-d", ORIGEN, "-Fc", "-f", volcado]);
  if (!anotar("pg_dump", dump.status === 0, { err: dump.err.slice(0, 300) })) return fin();

  const tam = enContenedor(["sh", "-c", `stat -c %s ${volcado}`]);
  anotar("el_volcado_no_esta_vacio", Number(tam.out) > 10_000, { bytes: tam.out });

  // ── 5 · restaurar en una base NUEVA ───────────────────────────────────────
  const crear = psql("postgres", `CREATE DATABASE ${DESTINO}`);
  if (!anotar("crear_base_destino", crear.status === 0, { err: crear.err.slice(0, 200) })) return fin();

  // INYECCION DE FALLO, para que esta certificacion se pueda comprobar a si
  // misma. Una certificacion de restauracion que solo sabe decir «PASA» no se
  // distingue de una rota: hay que verla fallar cuando la restauracion es mala.
  //
  //   CERT_FALLO=solo_esquema  -> restaura la estructura SIN los datos
  //   CERT_FALLO=solo_datos    -> restaura los datos SIN la estructura
  //
  // Con `solo_esquema` tienen que caer las comprobaciones de contenido y seguir
  // pasando las de estructura. Con `solo_datos`, al reves. Si las dos siguen
  // pasando en los dos casos, la certificacion no mide nada.
  const fallo = process.env.CERT_FALLO || "";
  const extra = fallo === "solo_esquema" ? ["--schema-only"]
              : fallo === "solo_datos" ? ["--data-only"]
              : [];
  if (fallo) console.log(`  [fallo inyectado: ${fallo}]`);
  const restore = enContenedor([
    "pg_restore", "-U", USUARIO_PG, "-d", DESTINO, "--no-owner", "--no-privileges",
    ...extra, volcado,
  ]);
  // `pg_restore` devuelve 1 con avisos; lo que decide es lo que hay dentro.
  anotar("pg_restore_ejecutado", true, { estado: restore.status, avisos: restore.err.split("\n").length });

  // ── 6 · ¿volvió el CONTENIDO? ─────────────────────────────────────────────
  const sumaDestino = psql(DESTINO, sumaSql.replace(/\n\s*/g, " "));
  const partes = sumaDestino.out.split("|");
  anotar(
    "el_contenido_coincide_byte_a_byte",
    sumaDestino.status === 0 && partes[0] === sumaOrigen,
    { origen: sumaOrigen, destino: partes[0] ?? null },
  );

  // ── 7 · ¿volvió la ESTRUCTURA? ────────────────────────────────────────────
  const estDest = psql(DESTINO, estructuraSql.replace(/\n\s*/g, " "));
  const [tablas, restricciones, indices, politicas] = estDest.out.split("|");
  anotar("vuelven_las_tablas", tablas === estructuraOrigen.tablas, {
    origen: estructuraOrigen.tablas, destino: tablas,
  });
  anotar("vuelven_las_restricciones", restricciones === estructuraOrigen.restricciones, {
    origen: estructuraOrigen.restricciones, destino: restricciones,
  });
  anotar("vuelven_los_indices", indices === estructuraOrigen.indices, {
    origen: estructuraOrigen.indices, destino: indices,
  });
  anotar("vuelven_las_politicas_rls", politicas === estructuraOrigen.politicas_rls, {
    origen: estructuraOrigen.politicas_rls, destino: politicas,
  });

  // ── 8 · la restricción RESTRINGE de verdad, no solo figura ────────────────
  //
  // Contar restricciones no basta: podrían estar declaradas como NOT VALID. Se
  // intenta la escritura imposible y se exige que la rechace.
  const viola = psql(
    DESTINO,
    `INSERT INTO saas_contacts (id, tenant_id, name, status, pipeline_stage, value, tags, lead_score)
     VALUES (gen_random_uuid(), '00000000-0000-4000-8000-000000000000', 'huerfano', 'lead', 'new', 0, ARRAY['x'], 0)`,
  );
  anotar("la_clave_foranea_sigue_restringiendo", viola.status !== 0, {
    mensaje: viola.err.split("\n")[0]?.slice(0, 120) ?? "LA ESCRITURA IMPOSIBLE SE ACEPTO",
  });

  // ── 9 · la APLICACIÓN puede usarla ────────────────────────────────────────
  //
  // Es la diferencia entre «los bytes están» y «el producto funciona». Se
  // conecta con el cliente de la aplicación y se ejecuta una consulta del
  // producto, con su JOIN y su filtro de inquilino.
  try {
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = `/${DESTINO}`;
    const app = new pg.Client({ connectionString: url.toString() });
    await app.connect();
    const r = await app.query(
      `SELECT count(*)::int AS n
         FROM saas_contacts c
         JOIN saas_tenants t ON t.id = c.tenant_id
        WHERE t.company_name = $1`,
      [MARCA],
    );
    await app.end();
    anotar("la_aplicacion_puede_consultarla", r.rows[0].n === 250, { filas: r.rows[0].n });
  } catch (e) {
    anotar("la_aplicacion_puede_consultarla", false, { error: String(e).slice(0, 200) });
  }

  // ── 10 · limpieza ─────────────────────────────────────────────────────────
  psql("postgres", `DROP DATABASE IF EXISTS ${DESTINO}`);
  enContenedor(["rm", "-f", volcado]);
  const limpia = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await limpia.connect();
  await limpia.query(`DELETE FROM saas_contacts WHERE tags @> ARRAY[$1]`, [MARCA]);
  await limpia.query(`DELETE FROM saas_tenants WHERE user_id = $1`, [USUARIO]);
  await limpia.query(`DELETE FROM workspaces WHERE user_id = $1`, [USUARIO]);
  await limpia.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO]);
  await limpia.end();
  anotar("limpieza", true);

  fin();
}

function fin() {
  const fallos = pasos.filter((p) => !p.ok);
  const decision = fallos.length === 0 ? "PASA" : "FALLA";
  const informe = {
    decision,
    totales: { pasos: pasos.length, ok: pasos.length - fallos.length, fallos: fallos.length },
    pasos,
  };
  const destino = path.join(SALIDA, "certificacion_restauracion.json");
  fs.writeFileSync(destino, JSON.stringify(informe, null, 2));
  console.log(`\n======== CERTIFICACION DE RESTAURACION: ${decision} ========`);
  console.log(`${informe.totales.ok}/${informe.totales.pasos} pasos`);
  console.log(`evidencia: ${destino}`);
  process.exit(fallos.length === 0 ? 0 : 1);
}

main().catch((e) => {
  anotar("error_inesperado", false, { error: String(e).slice(0, 300) });
  fin();
});
