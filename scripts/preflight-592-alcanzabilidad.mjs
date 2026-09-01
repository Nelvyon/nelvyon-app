/**
 * ¿ALGUNA FILA ACTUAL QUEDARIA INACCESIBLE CON LA POLITICA PROPUESTA?
 *
 * SOLO LECTURA. No imprime valores de negocio: solo recuentos y, cuando hace
 * falta identificar, prefijos de 8 caracteres de un uuid.
 *
 * ES LA PREGUNTA QUE DECIDE. Una politica por `tenant_id` sobre una tabla cuyo
 * `tenant_id` esta a NULL no aisla: hace desaparecer las filas para todo el
 * mundo. Y una politica cuyo sujeto apunta a un inquilino que ya no existe deja
 * huerfanas las filas de ese inquilino.
 *
 * Las dos cosas son «datos que dejan de verse», que es justo lo que una
 * migracion aditiva no puede provocar.
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

const salida = { ok: true };

try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (sql, params) => (await cli.query(sql, params)).rows;

  // ── Las tablas por `tenant_id`: ¿su inquilino existe en `saas_tenants`? ────
  salida.porTenant = {};
  for (const t of ["saas_pack_entitlements", "saas_autopilot_settings", "saas_activation_checklist"]) {
    const r = (
      await q(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE tenant_id IS NULL)::int AS sin_tenant,
                count(*) FILTER (
                  WHERE tenant_id IS NOT NULL
                    AND NOT EXISTS (SELECT 1 FROM saas_tenants st
                                    WHERE st.id::text = x.tenant_id::text)
                )::int AS huerfanas,
                count(DISTINCT tenant_id)::int AS inquilinos
           FROM public."${t}" x`,
      )
    )[0];
    salida.porTenant[t] = {
      total: Number(r.total),
      sinTenant: Number(r.sin_tenant),
      huerfanas: Number(r.huerfanas),
      inquilinosDistintos: Number(r.inquilinos),
      alcanzablesTrasLaPolitica: Number(r.total) - Number(r.sin_tenant) - Number(r.huerfanas),
    };
  }

  // ── `saas_tenants`: ¿su `user_id` existe en `nelvyon_users`? ───────────────
  const st = (
    await q(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE user_id IS NULL)::int AS sin_usuario,
              count(*) FILTER (
                WHERE user_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM nelvyon_users u WHERE u.user_id = t.user_id)
              )::int AS huerfanas,
              count(DISTINCT user_id)::int AS usuarios
         FROM saas_tenants t`,
    )
  )[0];
  salida.tiposDeTenantId = await q(
    `SELECT table_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND column_name='tenant_id'
        AND table_name IN ('saas_pack_entitlements','saas_autopilot_settings',
                           'saas_activation_checklist','os_sector_shield_audits')
      ORDER BY 1`,
  );

  // ¿A que apuntan los huerfanos? Puede que el sujeto correcto sea otro.
  salida.aQueApuntanLosHuerfanos = {};
  for (const t of ["saas_pack_entitlements", "saas_autopilot_settings"]) {
    salida.aQueApuntanLosHuerfanos[t] = (
      await q(
        `SELECT
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM workspaces w WHERE w.id::text = x.tenant_id::text))::int AS coincide_workspace,
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM nelvyon_users u WHERE u.user_id::text = x.tenant_id::text))::int AS coincide_usuario,
           count(*)::int AS huerfanas_totales
         FROM public."${t}" x
        WHERE NOT EXISTS (SELECT 1 FROM saas_tenants st WHERE st.id::text = x.tenant_id::text)`,
      )
    )[0];
  }

  salida.saasTenants = {
    total: Number(st.total),
    sinUsuario: Number(st.sin_usuario),
    huerfanas: Number(st.huerfanas),
    usuariosDistintos: Number(st.usuarios),
    alcanzablesTrasLaPolitica: Number(st.total) - Number(st.sin_usuario) - Number(st.huerfanas),
  };

  // ── `os_sector_shield_audits`: el caso dificil ────────────────────────────
  const os = (
    await q(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE tenant_id IS NULL)::int AS sin_tenant,
              count(*) FILTER (WHERE workspace_id IS NULL)::int AS sin_ws,
              count(DISTINCT workspace_id)::int AS workspaces
         FROM os_sector_shield_audits`,
    )
  )[0];
  const wsQueUsa = await q(
    `SELECT a.workspace_id,
            count(*)::int AS filas,
            EXISTS (SELECT 1 FROM workspaces w WHERE w.id = a.workspace_id) AS el_workspace_existe,
            (SELECT count(*)::int FROM workspace_members m
              WHERE m.workspace_id = a.workspace_id AND m.status = 'active') AS miembros_activos,
            (SELECT count(*)::int FROM workspaces w WHERE w.id = a.workspace_id) AS filas_workspace
       FROM os_sector_shield_audits a
      GROUP BY a.workspace_id ORDER BY filas DESC`,
  );
  salida.osShield = {
    total: Number(os.total),
    sinTenant: Number(os.sin_tenant),
    sinWorkspace: Number(os.sin_ws),
    workspacesDistintos: Number(os.workspaces),
    porWorkspace: wsQueUsa,
  };

  // ¿Alguien podria ver esas filas con una politica por workspace? Hace falta
  // que exista el workspace Y que alguien pertenezca a el.
  salida.osShield.alcanzablesConPoliticaDeWorkspace = wsQueUsa
    .filter((w) => w.el_workspace_existe && (w.miembros_activos > 0 || w.filas_workspace > 0))
    .reduce((a, w) => a + Number(w.filas), 0);

  // Y el dueño del workspace, que tambien da acceso por la rama de `workspaces`.
  salida.osShield.duenosDeEsosWorkspaces = (
    await q(
      `SELECT w.id, left(w.user_id, 8) AS dueno_prefijo
         FROM workspaces w
        WHERE w.id IN (SELECT DISTINCT workspace_id FROM os_sector_shield_audits)`,
    )
  );

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
