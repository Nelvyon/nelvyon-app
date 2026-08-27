#!/usr/bin/env node
/**
 * ¿Hay ya dos inquilinos compartiendo el mismo workspace aguas arriba?
 *
 * QUÉ CONTESTA
 * ============
 * `stableWorkspaceIdFromTenant` reduce el UUID del inquilino a `% 900_000`. Con
 * 1.000 inquilinos la probabilidad de que YA haya una colisión es del 42,6 %
 * —medido, no estimado—. Una colisión son dos clientes mandando el mismo
 * `X-Workspace-Id`, y eso aguas arriba significa compartir datos.
 *
 * Este script lo mira. **No cambia nada**: sólo lee.
 *
 * POR QUÉ HACE FALTA CONTRA LA BASE REAL
 * ---------------------------------------
 * La probabilidad se calcula; la colisión se comprueba. Son los UUID concretos
 * que hay en producción los que colisionan o no, y esta máquina no los tiene.
 *
 * QUÉ MIRA, Y POR QUÉ LAS DOS COSAS
 * ----------------------------------
 *   1. COLISIONES DEL HASH — dos inquilinos que derivan al mismo número. Es el
 *      riesgo del que habla `STABLE_WORKSPACE_ID_MIGRATION`.
 *
 *   2. CHOQUES CONTRA EL PUENTE — un inquilino SIN `workspace_id` cuya
 *      derivación cae encima del `workspace_id` real de OTRO. Es más sutil y es
 *      peor: no aparece agrupando derivaciones, porque uno de los dos números no
 *      viene del hash.
 *
 * La segunda sólo se puede ver desde que las rutas prefieren el puente, y por
 * eso se comprueba aquí y no en el estudio original.
 *
 * USO
 *   DATABASE_URL=postgres://... node scripts/detectar-colision-de-workspace.mjs
 *
 * SALIDA
 *   0  no hay colisiones ni choques
 *   1  las hay (el detalle va por pantalla, sin imprimir datos de clientes)
 *   2  no se pudo comprobar (sin cadena, sin tabla, sin permisos)
 *
 * Se sale con 2 y no con 0 cuando no se puede comprobar: «no lo sé» no puede
 * parecerse a «no hay problema».
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

/** La MISMA derivación que el runtime. Copiarla a mano sería medir otra cosa. */
function derivar(tenantId) {
  const src = (tenantId ?? "").trim();
  if (!src) return null;
  let hash = 0;
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  }
  return (hash % 900_000) + 1_000;
}

/**
 * Comprueba que la copia de arriba sigue siendo la del runtime.
 *
 * Si el runtime cambiara la derivación y esta copia no, el detector diría «no
 * hay colisiones» sobre un algoritmo que ya nadie usa — un verde que no
 * significa nada. Se comprueba contra el fichero real.
 */
function laDerivacionEsLaDelRuntime() {
  const f = path.resolve(
    process.cwd(),
    "apps/web/src/lib/platformFastApiProxy.ts",
  );
  if (!fs.existsSync(f)) return { ok: false, motivo: "no se encuentra platformFastApiProxy.ts" };
  const src = fs.readFileSync(f, "utf8");
  const cuerpo = src.slice(src.indexOf("export function stableWorkspaceIdFromTenant("));
  const fin = cuerpo.indexOf("\n}");
  const codigo = cuerpo.slice(0, fin);
  const tiene31 = /hash \* 31 \+ src\.charCodeAt\(i\)/.test(codigo);
  const tieneModulo = /%\s*900_000\)\s*\+\s*1_000/.test(codigo);
  if (!tiene31 || !tieneModulo) {
    return { ok: false, motivo: "la derivacion del runtime ha cambiado: este detector mediria otra cosa" };
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
    // Sólo lectura. Ni siquiera por accidente.
    options: "-c default_transaction_read_only=on",
  });

  let filas;
  try {
    const r = await pool.query(
      `SELECT id::text AS id, workspace_id FROM saas_tenants ORDER BY created_at`,
    );
    filas = r.rows;
  } catch (e) {
    console.error(`NO SE PUEDE COMPROBAR: ${e instanceof Error ? e.message : String(e)}`);
    await pool.end().catch(() => {});
    process.exit(2);
  }
  await pool.end().catch(() => {});

  console.log(`inquilinos: ${filas.length}`);
  const conPuente = filas.filter((f) => Number.isInteger(f.workspace_id) && f.workspace_id > 0);
  const sinPuente = filas.filter((f) => !(Number.isInteger(f.workspace_id) && f.workspace_id > 0));
  console.log(`  con workspace_id real: ${conPuente.length}`);
  console.log(`  sin el (se derivan):   ${sinPuente.length}`);

  // ── 1 · colisiones del hash entre los que se derivan ──────────────────────
  const porDerivado = new Map();
  for (const f of sinPuente) {
    const d = derivar(f.id);
    if (d === null) continue;
    if (!porDerivado.has(d)) porDerivado.set(d, []);
    porDerivado.get(d).push(f.id);
  }
  const colisiones = [...porDerivado.entries()].filter(([, ids]) => ids.length > 1);

  // ── 2 · derivaciones que caen encima de un puente real de otro ────────────
  const puentesOcupados = new Map(conPuente.map((f) => [f.workspace_id, f.id]));
  const choques = [];
  for (const f of sinPuente) {
    const d = derivar(f.id);
    if (d !== null && puentesOcupados.has(d)) {
      choques.push({ derivado: d, sinPuente: f.id, dueno: puentesOcupados.get(d) });
    }
  }

  console.log("");
  if (colisiones.length === 0 && choques.length === 0) {
    console.log("======== SIN COLISIONES ========");
    console.log("Ningun par de inquilinos comparte workspace aguas arriba.");
    console.log("");
    console.log("Esto NO cierra STABLE_WORKSPACE_ID_MIGRATION: dice que todavia no ha");
    console.log("pasado. La probabilidad crece con cada alta — 42,6 % con 1.000");
    console.log("inquilinos. Lo que la elimina es rellenar `saas_tenants.workspace_id`,");
    console.log("porque un puente poblado ya no se deriva.");
    process.exit(0);
  }

  console.log("======== HAY COLISION ========");
  // Los identificadores se recortan: son datos de clientes.
  const corto = (id) => `${id.slice(0, 8)}…`;
  for (const [derivado, ids] of colisiones) {
    console.log(`  workspace ${derivado}: ${ids.length} inquilinos -> ${ids.map(corto).join(", ")}`);
  }
  for (const c of choques) {
    console.log(
      `  workspace ${c.derivado}: el inquilino ${corto(c.sinPuente)} deriva encima ` +
        `del puente REAL de ${corto(c.dueno)}`,
    );
  }
  console.log("");
  console.log("Esto deja de ser una decision de arquitectura y es un incidente:");
  console.log("son clientes distintos mandando el mismo X-Workspace-Id.");
  console.log("");
  console.log("Lo primero que lo corta, y no requiere migrar identidades: dar");
  console.log("`workspace_id` a los inquilinos implicados. En cuanto lo tienen, dejan");
  console.log("de derivarse. El indice unico parcial impide que dos reciban el mismo.");
  process.exit(1);
}

main().catch((e) => {
  console.error(`NO SE PUEDE COMPROBAR: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
});
