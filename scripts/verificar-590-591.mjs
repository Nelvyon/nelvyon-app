/**
 * Verificacion post-migracion de la 590 y la 591. SOLO LECTURA.
 *
 * Se ejecuta despues de cada una. Comprueba lo que la migracion dice haber
 * hecho, no lo que se supone: cuenta politicas, indices, restricciones y filas
 * contra el catalogo.
 *
 * Incluye los ATAQUES de comprobacion, que son de lectura y no escriben nada:
 * se fija un contexto de usuario y se cuenta cuantas filas ve. Con las tablas
 * vacias no puede haber falso positivo por datos, asi que ademas se comprueba
 * que la POLITICA existe y que su expresion es la esperada.
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
  statement_timeout: 60_000,
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

  // ── LEDGER ────────────────────────────────────────────────────────────────
  salida.ledger = {
    total: Number((await q("SELECT count(*)::int AS n FROM _migrations"))[0].n),
    ultimas: (await q("SELECT name FROM _migrations ORDER BY name DESC LIMIT 4")).map((r) => r.name),
  };

  // ── 590 ───────────────────────────────────────────────────────────────────
  const ck = await q(
    `SELECT pg_get_constraintdef(oid) AS expr, convalidated AS validada
       FROM pg_constraint WHERE conname = 'workspace_members_status_ck'`,
  );
  salida.la590 = {
    existe: ck.length === 1,
    expresion: ck[0]?.expr ?? null,
    validada: ck[0]?.validada ?? null,
    filas: Number((await q("SELECT count(*)::int AS n FROM workspace_members"))[0].n),
    valores: await q(
      "SELECT status, count(*)::int AS n FROM workspace_members GROUP BY status ORDER BY n DESC",
    ),
  };

  // ── 591 ───────────────────────────────────────────────────────────────────
  const t = await q(
    `SELECT c.relname AS tabla, c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
            (SELECT count(*)::int FROM pg_policies p
              WHERE p.tablename = c.relname AND p.policyname LIKE '%\\_por\\_usuario\\_%') AS politicas,
            EXISTS (SELECT 1 FROM pg_index i
                      JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = i.indkey[0]
                     WHERE i.indrelid = c.oid AND ia.attname = 'user_id') AS indice
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relkind = 'r' AND c.relname = ANY($1)
      ORDER BY c.relname`,
    [OBJETIVO],
  );
  salida.la591 = {
    encontradas: t.length,
    conRls: t.filter((x) => x.rls).length,
    conForce: t.filter((x) => x.force).length,
    conCuatroPoliticas: t.filter((x) => x.politicas === 4).length,
    conIndice: t.filter((x) => x.indice).length,
    sinRls: t.filter((x) => !x.rls).map((x) => x.tabla),
    sinIndice: t.filter((x) => !x.indice).map((x) => x.tabla),
    politicasTotales: Number(
      (
        await q(
          `SELECT count(*)::int AS n FROM pg_policies WHERE policyname LIKE '%\\_por\\_usuario\\_%'`,
        )
      )[0].n,
    ),
  };

  // La expresion de una politica, para comprobar que es la canonica.
  salida.la591.expresionEjemplo = (
    await q(
      `SELECT qual FROM pg_policies
        WHERE tablename = 'integration_twilio' AND cmd = 'SELECT'
          AND policyname LIKE '%\\_por\\_usuario\\_%'`,
    )
  )[0]?.qual;

  // ── LA PREGUNTA INVERSA: ¿queda alguna desprotegida? ──────────────────────
  salida.desprotegidas = await q(
    `SELECT t.table_name AS tabla
       FROM information_schema.tables t
       JOIN pg_class pc ON pc.relname = t.table_name
       JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        AND NOT pc.relrowsecurity
        AND EXISTS (SELECT 1 FROM information_schema.columns c
                     WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                       AND c.column_name = 'user_id')
        AND EXISTS (SELECT 1 FROM information_schema.table_privileges tp
                     WHERE tp.table_schema = 'public' AND tp.table_name = t.table_name
                       AND tp.privilege_type = 'SELECT'
                       AND tp.grantee IN ('anon','authenticated','nelvyon_web_app','nelvyon_web_jobs'))
        AND left(t.table_name, 5) <> 'cert_'
      ORDER BY 1`,
  );

  // ── ATAQUES DE LECTURA ───────────────────────────────────────────────────
  // El rol de la conexion es superusuario y se salta RLS, asi que contar filas
  // no probaria nada. Lo que SI se puede afirmar sin escribir es que la politica
  // existe, que es la canonica, y como se comportaria: se evalua la expresion
  // directamente con distintos contextos.
  const comoSeEvalua = async (sub) => {
    if (sub === null) await cli.query("SELECT set_config('request.jwt.claim.sub', '', true)");
    else await cli.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [sub]);
    const r = await q(
      `SELECT ('11111111-1111-4111-8111-111111111111'::text = (nelvyon_jwt_user_id())::text) AS coincide`,
    );
    return r[0].coincide;
  };
  salida.ataques = {
    "A sobre lo de A (debe ser true)": await comoSeEvalua("11111111-1111-4111-8111-111111111111"),
    "B sobre lo de A (debe ser false)": await comoSeEvalua("22222222-2222-4222-8222-222222222222"),
    "sin usuario (debe ser null/false)": await comoSeEvalua(null),
  };

  // ── SALUD ─────────────────────────────────────────────────────────────────
  salida.salud = {
    bloqueosEsperando: Number(
      (await q("SELECT count(*)::int AS n FROM pg_locks WHERE NOT granted"))[0].n,
    ),
    transaccionesLargas: Number(
      (
        await q(
          `SELECT count(*)::int AS n FROM pg_stat_activity
            WHERE xact_start IS NOT NULL AND now() - xact_start > interval '60 seconds'`,
        )
      )[0].n,
    ),
    conexiones: Number((await q("SELECT count(*)::int AS n FROM pg_stat_activity"))[0].n),
    tamanoBase: (await q("SELECT pg_size_pretty(pg_database_size(current_database())) AS t"))[0].t,
  };

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
