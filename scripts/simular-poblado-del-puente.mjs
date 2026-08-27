#!/usr/bin/env node
/**
 * SIMULACRO. Qué pasaría si se rellenara `saas_tenants.workspace_id`.
 *
 * NO ESCRIBE NADA. Abre la conexión en sólo lectura y lo dice.
 *
 * POR QUÉ HACE FALTA
 * ==================
 * Dos de los bloqueos que quedan son, por debajo, **el mismo problema**:
 *
 *   · `STABLE_WORKSPACE_ID_MIGRATION` — un inquilino sin `workspace_id` manda
 *     aguas arriba un identificador DERIVADO por hash, que colisiona.
 *   · `RLS_SAAS_TENANTS_SOBRE_TABLA_CON_DATOS` — la migración 569 salta
 *     `saas_tenants` porque sus filas con `workspace_id` NULL quedarían
 *     invisibles para todo el mundo si se activara RLS.
 *
 * Rellenar el puente cierra los dos. Pero **no es gratis**, y por eso esto es un
 * simulacro y no una migración: en cuanto un inquilino tiene `workspace_id`, el
 * `X-Workspace-Id` que sale hacia FastAPI **cambia** del hash al real, y todo lo
 * que hubiera guardado bajo el hash deja de encontrarse.
 *
 * Eso es una migración de identidad sobre datos reales. La decide el dueño, no
 * una sesión de certificación. Lo que sí se puede hacer es que la decida
 * **mirando la lista**, en vez de a ciegas.
 *
 * LA REGLA DE ASIGNACIÓN NO SE INVENTA AQUÍ
 * =========================================
 * Es la que ya decidió la migración 310 y que implementa
 * `SaasTenantBridgeService.linkPrimaryWorkspace`: el workspace primario del
 * usuario, es decir **el de menor `id`**. Este simulacro la reproduce tal cual;
 * si divergiera, estaría enseñando un mapa que nadie va a aplicar.
 *
 * POR QUÉ 20 DE 22 ESTÁN A NULL
 * =============================
 * La 310 traía el backfill, pero se salta solo si `public.workspaces` todavía no
 * existe —lo dice ella misma: «skip backfill — run alembic upgrade head first»—.
 * El día que corrió, no existía. Es la misma clase de defecto que el Bloque 9
 * documentó en la 567: **una migración cuyo efecto depende del día en que se
 * ejecutó**, y que después parece aplicada.
 *
 * USO
 *   DATABASE_URL="<...>" node scripts/simular-poblado-del-puente.mjs
 *
 * SALIDA
 *   0  no hay nada que rellenar, o nada cambiaría de identidad
 *   1  hay inquilinos cuyo identificador aguas arriba CAMBIARÍA
 *   2  no se ha podido comprobar
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

/** La MISMA derivación que el runtime. Si divergiera, el mapa sería falso. */
function derivar(tenantId) {
  const src = (tenantId ?? "").trim();
  if (!src) return null;
  let hash = 0;
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  }
  return (hash % 900_000) + 1_000;
}

/** Que la copia de arriba siga siendo la del runtime. */
function laDerivacionEsLaDelRuntime() {
  const f = path.resolve(process.cwd(), "apps/web/src/lib/platformFastApiProxy.ts");
  if (!fs.existsSync(f)) return { ok: false, motivo: "no se encuentra platformFastApiProxy.ts" };
  const src = fs.readFileSync(f, "utf8");
  const i = src.indexOf("export function stableWorkspaceIdFromTenant(");
  if (i < 0) return { ok: false, motivo: "la derivacion ha desaparecido del runtime" };
  const cuerpo = src.slice(i, src.indexOf("\n}", i));
  if (!/hash \* 31 \+ src\.charCodeAt\(i\)/.test(cuerpo) || !/%\s*900_000\)\s*\+\s*1_000/.test(cuerpo)) {
    return { ok: false, motivo: "la derivacion del runtime ha cambiado: el mapa seria falso" };
  }
  return { ok: true };
}

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL. No se ha comprobado nada.");
    process.exit(2);
  }
  const espejo = laDerivacionEsLaDelRuntime();
  if (!espejo.ok) {
    console.error(`NO SE PUEDE COMPROBAR: ${espejo.motivo}`);
    process.exit(2);
  }

  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 60_000,
    options: "-c default_transaction_read_only=on",
  });

  let filas;
  try {
    // La MISMA consulta que haría el backfill de la 310, pero como SELECT.
    const r = await pool.query(`
      SELECT st.id::text            AS tenant_id,
             st.user_id::text       AS user_id,
             st.workspace_id        AS puente_actual,
             (SELECT w.id FROM public.workspaces w
               WHERE w.user_id = st.user_id::text
               ORDER BY w.id ASC LIMIT 1) AS puente_propuesto
        FROM saas_tenants st
       ORDER BY st.created_at
    `);
    filas = r.rows;
  } catch (e) {
    console.error(`NO SE PUEDE COMPROBAR: ${e instanceof Error ? e.message : String(e)}`);
    await pool.end().catch(() => {});
    process.exit(2);
  }
  await pool.end().catch(() => {});

  const corto = (id) => `${String(id).slice(0, 8)}…`;
  const yaTienen = filas.filter((f) => Number.isInteger(f.puente_actual));
  const seRellenarian = filas.filter(
    (f) => !Number.isInteger(f.puente_actual) && Number.isInteger(f.puente_propuesto),
  );
  const sinCandidato = filas.filter(
    (f) => !Number.isInteger(f.puente_actual) && !Number.isInteger(f.puente_propuesto),
  );

  console.log(`inquilinos: ${filas.length}`);
  console.log(`  ya tienen workspace_id:      ${yaTienen.length}`);
  console.log(`  se rellenarian:              ${seRellenarian.length}`);
  console.log(`  SIN candidato (sin workspace): ${sinCandidato.length}`);

  if (sinCandidato.length) {
    console.log("");
    console.log("── SIN CANDIDATO ─────────────────────────────────────────");
    console.log("Estos inquilinos no tienen ninguna fila en `workspaces`, asi que el");
    console.log("backfill de la 310 no puede asignarles nada y seguirian derivando.");
    console.log("Tambien seguirian bloqueando la RLS de `saas_tenants`: una fila con");
    console.log("`workspace_id` NULL quedaria invisible para todo el mundo.");
    for (const f of sinCandidato) console.log(`  ${corto(f.tenant_id)}  usuario ${corto(f.user_id)}`);
  }

  if (seRellenarian.length) {
    console.log("");
    console.log("── EL MAPA: VIEJO -> NUEVO ───────────────────────────────");
    console.log("Lo de la izquierda es lo que FastAPI ha estado recibiendo. Lo de la");
    console.log("derecha es lo que recibiria despues. Todo lo guardado bajo el viejo");
    console.log("deja de encontrarse salvo que se copie.");
    console.log("");
    console.log("  inquilino     derivado (viejo)   real (nuevo)");
    for (const f of seRellenarian) {
      const viejo = derivar(f.tenant_id);
      console.log(
        `  ${corto(f.tenant_id)}   ${String(viejo).padStart(12)}   ${String(f.puente_propuesto).padStart(10)}`,
      );
    }
  }

  // ¿Algun propuesto pisa un derivado que OTRO inquilino sigue usando?
  const derivadosEnUso = new Map();
  for (const f of filas) {
    if (!Number.isInteger(f.puente_actual)) {
      const d = derivar(f.tenant_id);
      if (d !== null) derivadosEnUso.set(d, f.tenant_id);
    }
  }
  const choques = seRellenarian
    .map((f) => ({ f, d: derivadosEnUso.get(f.puente_propuesto) }))
    .filter((x) => x.d && x.d !== x.f.tenant_id);

  if (choques.length) {
    console.log("");
    console.log("── AVISO: EL NUEVO PISA UN DERIVADO AJENO ────────────────");
    for (const c of choques) {
      console.log(
        `  ${corto(c.f.tenant_id)} pasaria a ${c.f.puente_propuesto}, que es el derivado de ${corto(c.d)}`,
      );
    }
  }

  console.log("");
  if (seRellenarian.length === 0) {
    console.log("======== NADA CAMBIARIA DE IDENTIDAD ========");
    console.log("Ningun inquilino cambiaria el identificador que manda aguas arriba.");
    if (sinCandidato.length) {
      console.log("Pero quedan inquilinos sin workspace: siguen derivando y siguen");
      console.log("bloqueando la RLS de `saas_tenants`.");
    }
    process.exit(0);
  }

  console.log("======== HAY CAMBIO DE IDENTIDAD ========");
  console.log(`${seRellenarian.length} inquilino(s) cambiarian de identificador aguas arriba.`);
  console.log("");
  console.log("ESTO NO SE APLICA SOLO, Y NO LO APLICA UNA SESION DE CERTIFICACION.");
  console.log("Lo que cierra con ello: la colision del hash y la RLS de saas_tenants.");
  console.log("Lo que cuesta: lo guardado en FastAPI bajo el identificador viejo.");
  console.log("El plan por fases, con su vuelta atras, esta en docs/DECISION_WORKSPACE_ID.md");
  process.exit(1);
}

main().catch((e) => {
  console.error(`NO SE PUEDE COMPROBAR: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
});
