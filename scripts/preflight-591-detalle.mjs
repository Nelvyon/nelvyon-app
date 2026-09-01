/**
 * DETALLE DE LAS 46 TABLAS DE LA 591, Y DEL ROL CON EL QUE CONECTA LA APP.
 *
 * SOLO LECTURA, dentro de una transaccion `READ ONLY`.
 *
 * LA PREGUNTA QUE DECIDE SI LA 591 ES SEGURA es cual es el rol que usa la
 * aplicacion desplegada y si ese rol se salta RLS. Si se lo salta, activar RLS
 * es un no-op para el servicio en marcha y solo cambia el dia del cutover. Si no
 * se lo salta, hay que mirar tabla por tabla que no se rompa nada.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import pg from "pg";

const CANDIDATOS = ["DATABASE_PUBLIC_URL", "POSTGRES_PUBLIC_URL", "DATABASE_URL", "POSTGRES_URL"];
const nombre = CANDIDATOS.find((n) => (process.env[n] ?? "").trim().length > 0);
if (!nombre) {
  console.error(JSON.stringify({ ok: false, error: "sin DSN" }));
  process.exit(2);
}

const cli = new pg.Client({
  connectionString: process.env[nombre],
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
  statement_timeout: 30_000,
});

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

const salida = { ok: true };

try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (sql, params) => (await cli.query(sql, params)).rows;

  // ── EL ROL DE LA APLICACION ──────────────────────────────────────────────
  // Es lo que decide si activar RLS cambia algo para el servicio en marcha.
  salida.rolDeLaApp = (
    await q(
      `SELECT current_user AS rol, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
         FROM pg_roles WHERE rolname = current_user`,
    )
  )[0];

  // Y todos los roles que existen, por si la app usara SET ROLE.
  salida.todosLosRoles = await q(
    `SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles
      WHERE rolname NOT LIKE 'pg\\_%' ORDER BY rolname`,
  );

  // ── GRANTS TABLA A TABLA ─────────────────────────────────────────────────
  salida.grants = await q(
    `SELECT tp.table_name AS tabla, tp.grantee AS quien,
            string_agg(DISTINCT tp.privilege_type, ',' ORDER BY tp.privilege_type) AS privilegios
       FROM information_schema.table_privileges tp
      WHERE tp.table_schema = 'public' AND tp.table_name = ANY($1)
      GROUP BY tp.table_name, tp.grantee
      ORDER BY tp.table_name, tp.grantee`,
    [OBJETIVO],
  );

  // ── LO QUE LA 591 CAMBIARIA, TABLA A TABLA ───────────────────────────────
  salida.tablas = await q(
    `SELECT c.relname AS tabla,
            c.relrowsecurity AS rls_ahora,
            c.relforcerowsecurity AS force_ahora,
            (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = c.relname) AS politicas_ahora,
            (SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'user_id' AND NOT a.attisdropped) AS tipo_user_id,
            EXISTS (SELECT 1 FROM pg_index i
                      JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = i.indkey[0]
                     WHERE i.indrelid = c.oid AND ia.attname = 'user_id') AS indice_ahora,
            (SELECT count(*)::int FROM pg_constraint k
              WHERE k.confrelid = c.oid) AS referencias_entrantes
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relkind = 'r' AND c.relname = ANY($1)
      ORDER BY c.relname`,
    [OBJETIVO],
  );

  // ── VISTAS QUE DEPENDEN DE ELLAS ─────────────────────────────────────────
  // Una vista sobre una tabla con RLS hereda la politica del DUEÑO de la vista,
  // no del que consulta: conviene saber si hay alguna antes de tocar nada.
  salida.vistasDependientes = await q(
    `SELECT DISTINCT dependiente.relname AS vista, origen.relname AS sobre
       FROM pg_depend d
       JOIN pg_rewrite r ON r.oid = d.objid
       JOIN pg_class dependiente ON dependiente.oid = r.ev_class
       JOIN pg_class origen ON origen.oid = d.refobjid
       JOIN pg_namespace n ON n.oid = origen.relnamespace AND n.nspname = 'public'
      WHERE dependiente.relkind IN ('v','m') AND origen.relname = ANY($1)
        AND dependiente.relname <> origen.relname
      ORDER BY 1`,
    [OBJETIVO],
  );

  // ── DISPARADORES ─────────────────────────────────────────────────────────
  salida.disparadores = await q(
    `SELECT c.relname AS tabla, t.tgname AS disparador
       FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      WHERE NOT t.tgisinternal AND c.relname = ANY($1) ORDER BY 1,2`,
    [OBJETIVO],
  );

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
