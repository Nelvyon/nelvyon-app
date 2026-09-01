/**
 * PREFLIGHT DE LAS MIGRACIONES 590 y 591, EN SOLO LECTURA.
 *
 * NO ESCRIBE NADA. Ni una sentencia que no sea `SELECT`. La conexion se abre en
 * una transaccion `READ ONLY`, asi que aunque hubiera un error de escritura en
 * este fichero, PostgreSQL lo rechazaria.
 *
 * LA CREDENCIAL NO PASA POR AQUI. Se ejecuta con `railway run`, que inyecta el
 * entorno del servicio en el subproceso. Este script lee `DATABASE_URL` del
 * entorno y NUNCA la imprime: lo unico que sale es el host y la base, sin
 * usuario ni contraseña.
 *
 * COSTE EXTERNO: 0 EUR. Son consultas al catalogo y unos cuantos COUNT.
 */
import pg from "pg";

/**
 * De donde sale el DSN, y por que hay varios candidatos.
 *
 * El `DATABASE_URL` del servicio web apunta a `postgres.railway.internal`, que
 * solo resuelve DENTRO de la red de Railway. Desde fuera hace falta la URL
 * publica, que Railway expone en el servicio de Postgres.
 *
 * Se prueban en orden y NO se imprime ninguna: lo unico que sale de aqui es
 * host, puerto y nombre de base.
 */
const CANDIDATOS = [
  "DATABASE_PUBLIC_URL",
  "POSTGRES_PUBLIC_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
];
const nombreUsado = CANDIDATOS.find((n) => {
  const v = process.env[n];
  return typeof v === "string" && v.trim().length > 0;
});
const url = nombreUsado ? process.env[nombreUsado] : undefined;
if (!url) {
  console.error(
    JSON.stringify({ ok: false, error: `sin DSN: ninguna de ${CANDIDATOS.join(", ")}` }),
  );
  process.exit(2);
}

/** El destino, sin credenciales: para saber DONDE se esta mirando. */
function destino(dsn) {
  try {
    const u = new URL(dsn);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(dsn ilegible)";
  }
}

const cli = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
  // Si algo se atasca, que se note aqui y no colgando una consola.
  statement_timeout: 30_000,
});

const salida = { variable: nombreUsado, destino: destino(url), ok: true, secciones: {} };

try {
  await cli.connect();
  // TODO lo que sigue va dentro de una transaccion de SOLO LECTURA.
  await cli.query("BEGIN TRANSACTION READ ONLY");

  const q = async (sql, params) => (await cli.query(sql, params)).rows;

  // ── 1. Quien soy y donde estoy ────────────────────────────────────────────
  salida.secciones.conexion = (
    await q(
      `SELECT current_user AS usuario, current_database() AS base,
              version() AS version,
              (SELECT count(*)::int FROM pg_stat_activity) AS conexiones`,
    )
  )[0];

  // ── 2. El ledger de migraciones ───────────────────────────────────────────
  const tablaLedger = (
    await q(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname IN ('schema_migrations','_migrations','migrations','nelvyon_migrations')`,
    )
  ).map((r) => r.relname);
  salida.secciones.ledger = { tablas: tablaLedger };

  if (tablaLedger.length === 1) {
    const t = tablaLedger[0];
    const cols = (
      await q(
        `SELECT a.attname FROM pg_class c
           JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
          WHERE c.relname = $1 AND c.relkind = 'r' ORDER BY a.attnum`,
        [t],
      )
    ).map((r) => r.attname);
    salida.secciones.ledger.columnas = cols;
    const cual = cols.find((c) => /name|file|version|id/i.test(c)) ?? cols[0];
    salida.secciones.ledger.aplicadas = Number(
      (await q(`SELECT count(*)::int AS n FROM ${t}`))[0].n,
    );
    salida.secciones.ledger.ultimas = (
      await q(`SELECT ${cual} AS m FROM ${t} ORDER BY ${cual} DESC LIMIT 6`)
    ).map((r) => String(r.m));
    salida.secciones.ledger.pendientes = {
      "590": !(
        await q(`SELECT 1 FROM ${t} WHERE ${cual}::text LIKE '590%' LIMIT 1`)
      ).length,
      "591": !(
        await q(`SELECT 1 FROM ${t} WHERE ${cual}::text LIKE '591%' LIMIT 1`)
      ).length,
    };
  }

  // ── 3. La 590: que valores hay de verdad en workspace_members.status ──────
  salida.secciones.la590 = {
    yaTieneCheck: Number(
      (
        await q(
          `SELECT count(*)::int AS n FROM pg_constraint
            WHERE conname = 'workspace_members_status_ck'`,
        )
      )[0].n,
    ),
    filas: Number((await q(`SELECT count(*)::int AS n FROM workspace_members`))[0].n),
    valores: await q(
      `SELECT status, count(*)::int AS n FROM workspace_members GROUP BY status ORDER BY n DESC`,
    ),
    nulos: Number(
      (await q(`SELECT count(*)::int AS n FROM workspace_members WHERE status IS NULL`))[0].n,
    ),
    fueraDelContrato: await q(
      `SELECT DISTINCT status FROM workspace_members
        WHERE status IS NULL OR status NOT IN ('active','invited')`,
    ),
  };

  // ── 4. La 591: las 47 tablas, una a una ──────────────────────────────────
  const OBJETIVO = [
    "agent_feedback", "agent_outcomes", "attribution_reports", "attribution_touchpoints",
    "audit_log", "booking_availability", "chatbot_configs", "client_briefings",
    "client_profiles", "cold_email_campaigns", "cold_email_prospects", "creative_assets",
    "digital_contracts", "generated_logos", "geo_ai_checks", "geo_ai_scores",
    "heatmap_alerts", "heatmap_sites", "integration_ga4", "integration_google_ads",
    "integration_linkedin_ads", "integration_meta_ads", "integration_search_console",
    "integration_semrush", "integration_shopify", "integration_telegram",
    "integration_tiktok_ads", "integration_twilio", "intent_actions", "intent_signals",
    "os_reports", "quality_scores", "roi_conversions", "roi_events", "roi_loops",
    "roi_predictions", "saas_api_keys", "saas_profile_changelog",
    "saas_user_invoices_legacy", "sentiment_alerts", "sentiment_mentions",
    "telegram_messages", "transcriptions", "twilio_messages", "user_roles",
    "video_enhancements", "whatsapp_messages",
  ];

  const detalle = await q(
    `SELECT c.relname AS tabla,
            pg_get_userbyid(c.relowner) AS propietario,
            c.relrowsecurity AS rls,
            c.relforcerowsecurity AS force,
            (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = c.relname) AS politicas,
            (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'user_id' AND NOT a.attisdropped) AS tipo_user_id,
            EXISTS (SELECT 1 FROM pg_index i
                      JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = i.indkey[0]
                     WHERE i.indrelid = c.oid AND ia.attname = 'user_id') AS indice_user_id,
            (SELECT string_agg(DISTINCT tp.grantee || ':' || tp.privilege_type, ' ' ORDER BY tp.grantee || ':' || tp.privilege_type)
               FROM information_schema.table_privileges tp
              WHERE tp.table_schema = 'public' AND tp.table_name = c.relname
                AND tp.grantee IN ('anon','authenticated','nelvyon_web_app','nelvyon_web_jobs')) AS grants
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relkind = 'r' AND c.relname = ANY($1)
      ORDER BY c.relname`,
    [OBJETIVO],
  );

  // Las filas de cada una, para saber si la 591 toca datos vivos.
  for (const d of detalle) {
    d.filas = Number((await q(`SELECT count(*)::int AS n FROM public."${d.tabla}"`))[0].n);
  }

  salida.secciones.la591 = {
    declaradas: OBJETIVO.length,
    encontradas: detalle.length,
    ausentes: OBJETIVO.filter((t) => !detalle.some((d) => d.tabla === t)),
    yaConRls: detalle.filter((d) => d.rls).map((d) => d.tabla),
    conFilas: detalle.filter((d) => d.filas > 0).map((d) => `${d.tabla}=${d.filas}`),
    totalFilas: detalle.reduce((a, d) => a + d.filas, 0),
    propietarios: [...new Set(detalle.map((d) => d.propietario))],
    sinColumnaUserId: detalle.filter((d) => !d.tipo_user_id).map((d) => d.tabla),
    tiposUserId: [...new Set(detalle.map((d) => d.tipo_user_id))],
    yaConIndice: detalle.filter((d) => d.indice_user_id).map((d) => d.tabla),
    tabla: detalle,
  };

  // ── 5. La funcion que necesita la politica ───────────────────────────────
  salida.secciones.dependencias = {
    nelvyon_jwt_user_id: Number(
      (
        await q(
          `SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'nelvyon_jwt_user_id'`,
        )
      )[0].n,
    ),
    roles: await q(
      `SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles
        WHERE rolname IN ('anon','authenticated','nelvyon_web_app','nelvyon_web_jobs','service_role')
        ORDER BY rolname`,
    ),
  };

  // ── 6. Salud: bloqueos y transacciones largas ────────────────────────────
  salida.secciones.salud = {
    bloqueosEsperando: Number(
      (await q(`SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted`))[0].n,
    ),
    transaccionesLargas: await q(
      `SELECT pid, state, EXTRACT(EPOCH FROM (now() - xact_start))::int AS segundos
         FROM pg_stat_activity
        WHERE xact_start IS NOT NULL AND now() - xact_start > interval '60 seconds'
        ORDER BY segundos DESC LIMIT 5`,
    ),
    tablasTotales: Number(
      (
        await q(
          `SELECT count(*)::int AS n FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
        )
      )[0].n,
    ),
  };

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
