#!/usr/bin/env node
/**
 * Las cuatro preguntas que sólo la base real puede contestar. **No escribe nada.**
 *
 * POR QUÉ EXISTE
 * ==============
 * Tres de los pendientes que quedan dependen de datos que no están en el
 * repositorio, y hasta ahora se razonaban con cifras heredadas de un bloque
 * anterior. Esto las mide hoy:
 *
 *   1. ¿Cuántos inquilinos tienen `workspace_id`, y cuántos podrían tenerlo?
 *      Decide `STABLE_WORKSPACE_ID_MIGRATION` y, con ella, la RLS de
 *      `saas_tenants`.
 *   2. ¿Existe `user_roles` y hay algún administrador?
 *      Decide si el plano `admin/*` está vivo o sigue cerrado para todos.
 *   3. ¿Está poblada `workspaces`?
 *      Es la fuente del puente. Si está casi vacía, el puente no es «lo que
 *      falta rellenar»: es que no hay de dónde.
 *   4. ¿Qué usuario corresponde a un correo dado?
 *      Para poder preparar el alta del primer administrador sin adivinar.
 *
 * LO QUE NO HACE, Y COMO SE GARANTIZA
 * ====================================
 * No escribe. La conexión se abre con `default_transaction_read_only=on`, así
 * que un `INSERT` accidental no fallaría en la revisión: fallaría en PostgreSQL.
 * La garantía es del motor, no de que el SQL esté bien escrito.
 *
 * SOBRE LOS DATOS DE CLIENTES
 * ===========================
 * No imprime correos ni identificadores completos de nadie. De los inquilinos
 * sólo salen recuentos; del correo que se busque con `--correo`, sólo si existe
 * y su `user_id` — que es lo que hace falta para darle un rol y nada más.
 *
 * USO
 *   DATABASE_URL="<...>" node scripts/diagnostico-de-produccion.mjs
 *   DATABASE_URL="<...>" node scripts/diagnostico-de-produccion.mjs --correo tu@correo.com
 *
 * SALIDA
 *   0  se pudo consultar
 *   2  no se pudo (sin cadena, sin acceso). Nunca 0 con dudas.
 */
import pg from "pg";

function argumento(nombre) {
  const i = process.argv.indexOf(nombre);
  return i > -1 ? process.argv[i + 1] : null;
}

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL. No se ha consultado nada.");
    process.exit(2);
  }
  const correo = (argumento("--correo") ?? "").trim().toLowerCase();

  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 20_000,
    statement_timeout: 60_000,
    // La garantía la da el motor: con esto, cualquier escritura es un error.
    options: "-c default_transaction_read_only=on",
  });

  const q = async (sql, params) => (await pool.query(sql, params)).rows;
  const existe = async (t) =>
    (await q("SELECT to_regclass($1)::text AS t", [`public.${t}`]))[0]?.t != null;

  try {
    console.log(`objetivo: ${new URL(dsn.replace(/^postgresql\+asyncpg:/, "postgresql:")).hostname}`);
    console.log("modo:     SOLO LECTURA (impuesto por PostgreSQL)\n");

    // ── 1 · el puente ──────────────────────────────────────────────────────
    if (await existe("saas_tenants")) {
      const t = (await q(`
        SELECT count(*)::text                                            AS total,
               count(workspace_id)::text                                 AS con_puente,
               count(*) FILTER (WHERE workspace_id IS NULL)::text        AS sin_puente
          FROM saas_tenants`))[0];
      console.log("── inquilinos ──");
      console.log(`  total:            ${t.total}`);
      console.log(`  con workspace_id: ${t.con_puente}`);
      console.log(`  sin workspace_id: ${t.sin_puente}   (estos derivan por hash)`);

      if (await existe("workspaces")) {
        const c = (await q(`
          SELECT count(*)::text AS candidatos FROM saas_tenants st
           WHERE st.workspace_id IS NULL
             AND EXISTS (SELECT 1 FROM public.workspaces w
                          WHERE w.user_id = st.user_id::text)`))[0];
        console.log(`  de esos, con un workspace al que enlazar: ${c.candidatos}`);
        if (Number(c.candidatos) === 0 && Number(t.sin_puente) > 0) {
          console.log("");
          console.log("  NO HAY NADA QUE RELLENAR. El backfill de la migracion 310 no puede");
          console.log("  asignar nada porque esos inquilinos no tienen fila en `workspaces`.");
          console.log("  Es decir: hoy no existe la migracion de identidad que se estaba");
          console.log("  decidiendo — no hay identificador nuevo al que mover a nadie.");
        }
      }
    }

    // ── 2 · la tabla que da de donde salen los workspaces ──────────────────
    if (await existe("workspaces")) {
      const w = (await q(`
        SELECT count(*)::text AS filas, count(DISTINCT user_id)::text AS usuarios
          FROM public.workspaces`))[0];
      console.log("\n── workspaces (la fuente del puente) ──");
      console.log(`  filas: ${w.filas}   usuarios distintos: ${w.usuarios}`);
    } else {
      console.log("\n── workspaces ──\n  NO EXISTE en esta base.");
    }

    // ── 3 · el modelo de administrador ─────────────────────────────────────
    console.log("\n── administradores de plataforma ──");
    if (!(await existe("user_roles"))) {
      console.log("  `user_roles` NO EXISTE: la migracion 545 no esta aplicada aqui.");
      console.log("  Sin ella, isUserAdmin cierra en falso y admin/* responde 403 a todos.");
    } else {
      const r = await q(`
        SELECT role, count(*)::text AS n,
               count(*) FILTER (WHERE is_active IS NOT FALSE)::text AS activas
          FROM user_roles GROUP BY role ORDER BY role`);
      if (r.length === 0) {
        console.log("  `user_roles` existe y esta VACIA: nadie es administrador todavia.");
      } else {
        for (const x of r) console.log(`  ${x.role.padEnd(14)} ${x.n} fila(s), ${x.activas} activa(s)`);
      }
    }

    // ── 4 · que migraciones faltan, y los roles del cutover ────────────────
    console.log("\n── migraciones ──");
    if (!(await existe("_migrations"))) {
      console.log("  `_migrations` no existe: esta base no la lleva el runner oficial.");
    } else {
      const n = (await q("SELECT count(*)::text AS n FROM _migrations"))[0];
      const pendientes = ["476", "568", "569", "570", "572", "573", "574", "575", "576", "577"];
      const aplicadas = await q(
        `SELECT substring(name from '^[0-9]+') AS num FROM _migrations
          WHERE substring(name from '^[0-9]+') = ANY($1)`, [pendientes]);
      const puestas = new Set(aplicadas.map((r) => r.num));
      console.log(`  registradas en total: ${n.n}`);
      const ult = await q(
        `SELECT name FROM _migrations ORDER BY substring(name from '^[0-9]+')::int DESC LIMIT 1`);
      if (ult[0]) console.log(`  la mas alta aplicada:  ${ult[0].name}`);
      for (const p of pendientes) {
        console.log(`    ${p}  ${puestas.has(p) ? "APLICADA" : "pendiente"}`);
      }
    }

    // Los dos roles del cutover: existen o no, y con que privilegios.
    console.log("\n── roles del lado web (cutover) ──");
    const roles = await q(
      `SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles
        WHERE rolname IN ('nelvyon_web_app','nelvyon_web_jobs') ORDER BY rolname`);
    if (roles.length === 0) {
      console.log("  ninguno de los dos existe: falta aplicar la migracion 577.");
    } else {
      for (const r of roles) {
        console.log(`  ${r.rolname.padEnd(18)} login=${r.rolcanlogin}  ` +
                    `super=${r.rolsuper}  saltaRLS=${r.rolbypassrls}`);
      }
    }

    // ── 5 · ¿ha producido algo esta máquina? ───────────────────────────────
    //
    // La pregunta de negocio, no la técnica. Un producto puede estar entero,
    // desplegado y sin haber entregado nunca nada. Los recuentos lo dicen y las
    // pantallas no.
    console.log("\n── actividad real ──");
    const cuenta = async (tabla, etiqueta, extra = "") => {
      if (!(await existe(tabla))) { console.log(`  ${etiqueta.padEnd(26)} (tabla ausente)`); return; }
      const r = (await q(`SELECT count(*)::text AS n${extra} FROM ${tabla}`))[0];
      const det = Object.entries(r).filter(([k]) => k !== "n")
        .map(([k, v]) => `${k}=${v}`).join(" ");
      console.log(`  ${etiqueta.padEnd(26)} ${String(r.n).padStart(8)}${det ? "   " + det : ""}`);
    };
    await cuenta("saas_contacts", "contactos");
    await cuenta("saas_campanias", "campanias");
    await cuenta("saas_workflows", "workflows");
    await cuenta("saas_sequences", "secuencias");
    await cuenta("os_jobs", "trabajos del OS");
    await cuenta("os_deliverables", "entregables producidos");
    await cuenta("usage_events", "eventos de uso medidos");
    if (await existe("os_jobs")) {
      const e = await q(`SELECT status, count(*)::text AS n FROM os_jobs GROUP BY status ORDER BY 2 DESC`);
      if (e.length) console.log(`    estados de os_jobs: ${e.map((x) => `${x.status}=${x.n}`).join(", ")}`);
    }
    // De donde salen los entregables: si la cola nunca completa un trabajo pero
    // hay entregables, es que los produce otro camino — o son datos sembrados.
    if (await existe("os_deliverables")) {
      const cols = await q(
        `SELECT column_name FROM information_schema.columns
          WHERE table_name='os_deliverables' AND column_name IN ('created_at','status','kind','type','source')`);
      const tiene = new Set(cols.map((c) => c.column_name));
      if (tiene.has("created_at")) {
        const f = (await q(`SELECT min(created_at)::date::text AS primero,
                                   max(created_at)::date::text AS ultimo,
                                   count(DISTINCT created_at::date)::text AS dias
                              FROM os_deliverables`))[0];
        console.log(`    entregables: del ${f.primero} al ${f.ultimo}, en ${f.dias} dia(s) distintos`);
      }
      for (const c of ["status", "kind", "type"]) {
        if (!tiene.has(c)) continue;
        const g = await q(`SELECT ${c}::text AS v, count(*)::text AS n FROM os_deliverables
                            GROUP BY 1 ORDER BY 2 DESC LIMIT 5`);
        console.log(`    por ${c}: ${g.map((x) => `${x.v}=${x.n}`).join(", ")}`);
      }
    }

    // ── 6 · ¿el trabajo entregado lo hizo una IA de verdad? ────────────────
    //
    // `resolveLlmMode()` devuelve "real" o "mock", y cuando la llamada al modelo
    // falla el adaptador cae a `mockFallback()`: contenido generado por reglas,
    // registrado con `ok: true`. Nada aguas abajo impide publicar un entregable
    // hecho así. Lo unico que lo distingue es esta columna.
    console.log("\n── con que se produjo el trabajo ──");
    if (!(await existe("os_agent_audit_events"))) {
      console.log("  `os_agent_audit_events` no existe: no se puede saber.");
    } else {
      const t = (await q(`SELECT count(*)::text AS n FROM os_agent_audit_events`))[0];
      console.log(`  entradas de auditoria de agente: ${t.n}`);
      if (Number(t.n) > 0) {
        const m = await q(`SELECT coalesce(llm_mode,'(sin dato)') AS modo, count(*)::text AS n
                             FROM os_agent_audit_events GROUP BY 1 ORDER BY 2 DESC`);
        for (const x of m) console.log(`    ${String(x.modo).padEnd(12)} ${x.n}`);
        const f = (await q(`SELECT min(recorded_at)::date::text AS a, max(recorded_at)::date::text AS b
                              FROM os_agent_audit_events`))[0];
        console.log(`    rango: ${f.a} → ${f.b}`);
        const mo = await q(`SELECT coalesce(model,'(sin dato)') AS m, count(*)::text AS n
                              FROM os_agent_audit_events GROUP BY 1 ORDER BY 2 DESC LIMIT 6`);
        console.log(`    modelos: ${mo.map((x) => `${x.m}=${x.n}`).join(", ")}`);
        const tk = (await q(`SELECT sum(tokens)::text AS t FROM os_agent_audit_events`))[0];
        console.log(`    tokens registrados en total: ${tk.t}`);
      }
    }

    // ── 7 · a quien corresponde un correo ──────────────────────────────────
    if (correo) {
      console.log(`\n── busqueda de usuario ──`);
      if (!(await existe("nelvyon_users"))) {
        console.log("  `nelvyon_users` no existe en esta base.");
      } else {
        const u = await q(
          "SELECT user_id::text AS id FROM nelvyon_users WHERE lower(email) = $1", [correo]);
        if (u.length === 0) {
          console.log(`  el correo indicado NO tiene usuario en esta base.`);
        } else if (u.length > 1) {
          console.log(`  AMBIGUO: ${u.length} usuarios con ese correo. No se elige por ti.`);
        } else {
          console.log(`  encontrado. user_id = ${u[0].id}`);
        }
      }
      const tot = (await q("SELECT count(*)::text AS n FROM nelvyon_users"))[0];
      console.log(`  usuarios totales en la base: ${tot.n}`);
    }

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error(`NO SE PUEDE CONSULTAR: ${e instanceof Error ? e.message : String(e)}`);
    await pool.end().catch(() => {});
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(`NO SE PUEDE CONSULTAR: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
});
