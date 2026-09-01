/**
 * MODELO DE PROPIEDAD REAL DE LAS 5 TABLAS DE LA 592. SOLO LECTURA.
 *
 * NO IMPRIME NI UN VALOR DE LAS FILAS. Solo forma, recuentos y cuantos nulos
 * hay en cada columna candidata a ser el sujeto. `saas_tenants` tiene 22 filas
 * de clientes reales —nombre de empresa, telefono, web— y nada de eso sale de
 * aqui.
 *
 * POR QUE HACE FALTA MEDIR Y NO COPIAR LA POLITICA DE OTRA TABLA. Una politica
 * por `tenant_id` sobre una tabla cuyo `tenant_id` esta a NULL en la mitad de
 * las filas no aisla: hace desaparecer esas filas para todo el mundo. El sujeto
 * correcto se deriva de que columna esta POBLADA y de a que apunta.
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
  "os_sector_shield_audits",
  "saas_pack_entitlements",
  "saas_tenants",
  "saas_autopilot_settings",
  "saas_activation_checklist",
];

/** Las columnas que podrian ser el sujeto del aislamiento. */
const SUJETOS = ["tenant_id", "workspace_id", "user_id", "owner_id", "account_id", "client_id"];

const salida = { ok: true, tablas: {} };

try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (sql, params) => (await cli.query(sql, params)).rows;

  for (const t of OBJETIVO) {
    const info = {};

    const existe = await q(
      `SELECT c.oid, c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
              pg_get_userbyid(c.relowner) AS propietario
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname='public'
        WHERE c.relkind='r' AND c.relname=$1`,
      [t],
    );
    if (existe.length === 0) {
      salida.tablas[t] = { existe: false };
      continue;
    }
    info.existe = true;
    info.rls = existe[0].rls;
    info.force = existe[0].force;
    info.propietario = existe[0].propietario;

    info.filas = Number((await q(`SELECT count(*)::int AS n FROM public."${t}"`))[0].n);

    // Todas las columnas, solo nombres y tipos.
    info.columnas = (
      await q(
        `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
        [t],
      )
    ).map((c) => `${c.column_name}:${c.data_type}${c.is_nullable === "NO" ? "!" : ""}`);

    // Clave primaria.
    info.clavePrimaria = (
      await q(
        `SELECT a.attname FROM pg_index i
           JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
          WHERE i.indrelid=$1::regclass AND i.indisprimary`,
        [`public."${t}"`],
      )
    ).map((r) => r.attname);

    // ── EL SUJETO: que columnas candidatas existen y CUANTAS estan pobladas ──
    info.sujetosCandidatos = {};
    for (const s of SUJETOS) {
      const hay = await q(
        `SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
        [t, s],
      );
      if (hay.length === 0) continue;
      const r = (
        await q(
          `SELECT count(*)::int AS total,
                  count("${s}")::int AS pobladas,
                  count(DISTINCT "${s}")::int AS distintos
             FROM public."${t}"`,
        )
      )[0];
      info.sujetosCandidatos[s] = {
        total: Number(r.total),
        pobladas: Number(r.pobladas),
        nulos: Number(r.total) - Number(r.pobladas),
        distintos: Number(r.distintos),
      };
    }

    // ── FOREIGN KEYS: a que apunta cada columna candidata ────────────────────
    info.clavesForaneas = (
      await q(
        `SELECT con.conname, pg_get_constraintdef(con.oid) AS def
           FROM pg_constraint con
          WHERE con.conrelid = $1::regclass AND con.contype='f'`,
        [`public."${t}"`],
      )
    ).map((r) => r.def);

    // Quien apunta a ESTA tabla.
    info.referenciadaPor = (
      await q(
        `SELECT c.relname AS tabla, pg_get_constraintdef(con.oid) AS def
           FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
          WHERE con.confrelid = $1::regclass AND con.contype='f'`,
        [`public."${t}"`],
      )
    ).map((r) => `${r.tabla}: ${r.def}`);

    // ── GRANTS ───────────────────────────────────────────────────────────────
    info.grants = (
      await q(
        `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS p
           FROM information_schema.table_privileges
          WHERE table_schema='public' AND table_name=$1
          GROUP BY grantee ORDER BY grantee`,
        [t],
      )
    ).map((r) => `${r.grantee}: ${r.p}`);

    // ── INDICES ──────────────────────────────────────────────────────────────
    info.indices = (
      await q(
        `SELECT pg_get_indexdef(i.oid) AS def
           FROM pg_class c JOIN pg_index x ON x.indrelid=c.oid
           JOIN pg_class i ON i.oid=x.indexrelid
          WHERE c.relname=$1 ORDER BY i.relname`,
        [t],
      )
    ).map((r) => r.def.replace(/^CREATE (UNIQUE )?INDEX /, "$1"));

    // ── DISPARADORES ─────────────────────────────────────────────────────────
    info.disparadores = (
      await q(
        `SELECT tg.tgname FROM pg_trigger tg
          WHERE tg.tgrelid = $1::regclass AND NOT tg.tgisinternal`,
        [`public."${t}"`],
      )
    ).map((r) => r.tgname);

    salida.tablas[t] = info;
  }

  // ── LAS FUNCIONES DE SUJETO DISPONIBLES ────────────────────────────────────
  salida.funcionesDeSujeto = await q(
    `SELECT p.proname, pg_get_function_result(p.oid) AS devuelve
       FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace AND n.nspname='public'
      WHERE p.proname IN ('nelvyon_jwt_user_id','nelvyon_jwt_sub_text',
                          'nelvyon_current_saas_tenant_uuid','current_tenant_id',
                          'nelvyon_erp_tenant_text','nelvyon_current_workspace_id',
                          'nelvyon_user_in_workspace','nelvyon_os_workspace_select',
                          'nelvyon_os_workspace_mutate','nelvyon_workspace_can_mutate')
      ORDER BY 1`,
  );

  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 2));
