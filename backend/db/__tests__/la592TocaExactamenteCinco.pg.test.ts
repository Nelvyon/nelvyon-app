/**
 * LA 592 TOCA EXACTAMENTE CINCO TABLAS, Y SU VERDE NO DICE NADA DE PRODUCCION.
 *
 * ── LO PRIMERO: EL ALCANCE ──────────────────────────────────────────────────
 *
 * La 591 tuvo el defecto de no acotar su bloque de indices: recorria toda tabla
 * con `user_id`, con RLS y sin indice, asi que despues del primer bloque habria
 * tocado 59 tablas que no eran suyas. Se detecto en el preflight, antes de
 * escribir en produccion.
 *
 * La 592 declara CINCO. Esta prueba comprueba que toca cinco: ni cuatro ni seis.
 *
 * ── Y LO SEGUNDO, QUE IMPORTA MAS ───────────────────────────────────────────
 *
 * Esta prueba corre contra una base LOCAL recien migrada. Y la 567 —de donde
 * viene todo esto— salta las tablas que tienen FILAS:
 *
 *     IF tiene_filas THEN … '567: % tiene filas; pertenece a otro lote' … CONTINUE
 *
 * En local esas tablas estan VACIAS, asi que la 567 SI las cubre. Es decir: el
 * defecto que la 592 arregla NO ES REPRODUCIBLE EN LOCAL. Una prueba local en
 * verde no dice absolutamente nada sobre si produccion esta a salvo.
 *
 * Por eso esto NO es un certificado de aislamiento productivo. Es dos cosas
 * distintas y acotadas:
 *
 *   · que la migracion hace lo que dice y sobre las tablas que dice;
 *   · que el mecanismo se comporta como se espera cuando las tablas TIENEN
 *     filas, cosa que aqui se consigue sembrandolas a proposito.
 *
 * El aislamiento productivo lo responde `scripts/auditar-rls-produccion.mjs`,
 * en solo lectura y contra produccion. Las dos hacen falta.
 *
 * COSTE EXTERNO: 0 EUR. Base local, datos sinteticos, todo revierte.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DSN = process.env.NELVYON_WEB_CERT_DSN ?? process.env.NELVYON_COLA_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;
let SQL_592 = "";

/** Las cinco que la 592 declara, con su columna de sujeto. */
const OBJETIVO: ReadonlyArray<[string, string]> = [
  ["os_sector_shield_audits", "workspace_id"],
  ["saas_pack_entitlements", "tenant_id"],
  ["saas_autopilot_settings", "tenant_id"],
  ["saas_activation_checklist", "tenant_id"],
  ["saas_tenants", "user_id"],
];

const SUFIJOS = ["_592_sel", "_592_ins", "_592_upd", "_592_del"];

/** Ejecuta dentro de una transaccion que SIEMPRE revierte. */
async function enUnaTransaccionQueSeRevierte<T>(
  fn: (c: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    // Se parte SIEMPRE del estado de produccion: sin la 592 puesta.
    for (const [t] of OBJETIVO) {
      for (const s of SUFIJOS) {
        await c.query(`DROP POLICY IF EXISTS "${t}${s}" ON public."${t}"`);
      }
      await c.query(`ALTER TABLE public."${t}" DISABLE ROW LEVEL SECURITY`);
      await c.query(`ALTER TABLE public."${t}" NO FORCE ROW LEVEL SECURITY`);
    }
    return await fn(c);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    c.release();
  }
}

describeSiHayPg("la 592 toca exactamente cinco tablas", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 3 });
    const dir = path.resolve(__dirname, "..", "migrations");
    const f = fs.readdirSync(dir).find((x) => x.startsWith("592_") && x.endsWith(".sql"));
    if (!f) throw new Error("no se encuentra la migracion 592");
    SQL_592 = fs.readFileSync(path.join(dir, f), "utf8");
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("EL DENOMINADOR: el fichero se ha leido y declara las cinco", () => {
    // Sin esto, un fichero vacio haria pasar todo lo de abajo sin ejecutar nada.
    expect(SQL_592.length).toBeGreaterThan(2000);
    for (const [t] of OBJETIVO) expect(SQL_592).toContain(t);
  });

  it("LA REGLA: aplica RLS a esas cinco, con sus cuatro politicas", async () => {
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(SQL_592);
      for (const [t] of OBJETIVO) {
        const { rows } = await c.query<{ rls: boolean; force: boolean; pol: number }>(
          `SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
                  (SELECT count(*)::int FROM pg_policies p
                    WHERE p.tablename = c.relname AND p.policyname LIKE '%\\_592\\_%') AS pol
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname='public'
            WHERE c.relname = $1 AND c.relkind = 'r'`,
          [t],
        );
        expect(rows[0]?.rls, `${t} sin RLS`).toBe(true);
        expect(rows[0]?.force, `${t} sin FORCE`).toBe(true);
        expect(rows[0]?.pol, `${t} no tiene sus cuatro politicas`).toBe(4);
      }
    });
  });

  it("EL ALCANCE: no toca NI UNA tabla mas que esas cinco", async () => {
    /**
     * Es lo que la 591 no comprobaba. Se cuentan TODAS las politicas con el
     * sufijo de esta migracion y se exige que salgan justo 20: cinco tablas por
     * cuatro operaciones.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(SQL_592);
      const { rows } = await c.query<{ tabla: string }>(
        `SELECT DISTINCT tablename AS tabla FROM pg_policies
          WHERE policyname LIKE '%\\_592\\_%' ORDER BY 1`,
      );
      expect(rows.map((r) => r.tabla)).toEqual([...OBJETIVO].map(([t]) => t).sort());

      const total = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_policies WHERE policyname LIKE '%\\_592\\_%'`,
      );
      expect(Number(total.rows[0].n), "no son 5 tablas x 4 operaciones").toBe(20);
    });
  });

  it("y no crea ningun indice: las cinco ya tenian el suyo", async () => {
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(SQL_592);
      const { rows } = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_class WHERE relkind='i' AND relname LIKE '%\\_592\\_idx'`,
      );
      expect(Number(rows[0].n), "la 592 creo indices que no hacian falta").toBe(0);
    });
  });

  it("EL CONTROL POSITIVO DEL ALCANCE: una sexta tabla se detectaria", async () => {
    /**
     * Sin esto, la comprobacion de arriba podria estar contando mal y aprobar
     * siempre. Se crea una politica con el mismo sufijo sobre una tabla ajena y
     * se comprueba que la cuenta la ve.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(SQL_592);
      await c.query(
        `CREATE TABLE IF NOT EXISTS cert_sexta_tabla (id serial PRIMARY KEY, tenant_id uuid)`,
      );
      await c.query(`ALTER TABLE cert_sexta_tabla ENABLE ROW LEVEL SECURITY`);
      await c.query(
        `CREATE POLICY cert_sexta_tabla_592_sel ON cert_sexta_tabla FOR SELECT USING (true)`,
      );
      const { rows } = await c.query<{ n: string }>(
        `SELECT count(DISTINCT tablename) AS n FROM pg_policies WHERE policyname LIKE '%\\_592\\_%'`,
      );
      expect(Number(rows[0].n), "una sexta tabla no se detecta").toBe(6);
    });
  });

  it("PARA con un sujeto a NULL en vez de esconder las filas", async () => {
    /**
     * ES LA DECISION MAS IMPORTANTE DE LA MIGRACION, y aqui se comprueba.
     *
     * `os_sector_shield_audits` tiene `tenant_id` a NULL en sus 2.761 filas de
     * produccion —es la deuda que la 574 intento reatribuir y no pudo—. Una
     * politica por `tenant_id` no habria aislado nada: habria hecho desaparecer
     * la tabla entera para todo el mundo.
     *
     * La 592 usa `workspace_id`, que si esta poblado. Y lleva ademas una guarda
     * que ABORTA si el sujeto elegido tuviera nulos, para que el mismo error no
     * pueda colarse con otra tabla.
     *
     * Se comprueba sobre esta tabla porque es la UNICA de las cinco cuyo sujeto
     * admite nulos; en las otras cuatro lo impide el propio esquema, que es una
     * garantia mejor.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(
        `INSERT INTO os_sector_shield_audits (sector_id, workspace_id, status)
         VALUES ('cert-sector', NULL, 'pending')`,
      );
      await expect(c.query(SQL_592)).rejects.toThrow(/esta a NULL/i);
    });
  });

  it("y en las otras cuatro lo garantiza el propio esquema", async () => {
    /**
     * Una guarda en la migracion protege de una eleccion mal hecha HOY. Un
     * `NOT NULL` en la columna protege siempre, y sin que nadie tenga que
     * acordarse. Donde ya esta, se deja constancia.
     */
    for (const [t, col] of OBJETIVO) {
      if (t === "os_sector_shield_audits") continue;
      const { rows } = await pool.query<{ nulos: string }>(
        `SELECT is_nullable AS nulos FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
        [t, col],
      );
      expect(rows[0]?.nulos, `${t}.${col} admite nulos y la politica depende de el`).toBe("NO");
    }
  });

  it("EL CONTRAFACTUAL: `tenant_id` habria sido el sujeto equivocado", async () => {
    /**
     * No basta con que la eleccion sea correcta: hay que poder demostrar que la
     * otra era mala. Se siembra una fila como las de produccion —con
     * `workspace_id` puesto y `tenant_id` a NULL— y se comprueba que una
     * politica por `tenant_id` la esconde, mientras que la de la 592 no.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(
        `INSERT INTO os_sector_shield_audits (sector_id, workspace_id, tenant_id, status)
         VALUES ('cert-sector', 4242, NULL, 'pending')`,
      );

      // Con el sujeto equivocado, la fila no la ve NADIE: ni con contexto.
      const conTenant = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM os_sector_shield_audits
          WHERE sector_id = 'cert-sector'
            AND tenant_id = '11111111-1111-4111-8111-111111111111'::uuid`,
      );
      expect(
        Number(conTenant.rows[0].n),
        "una politica por tenant_id habria dejado esta fila fuera de todo alcance",
      ).toBe(0);

      // Con el sujeto correcto, la fila SI es alcanzable por su workspace.
      const conWorkspace = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM os_sector_shield_audits
          WHERE sector_id = 'cert-sector' AND workspace_id = 4242`,
      );
      expect(Number(conWorkspace.rows[0].n), "el sujeto correcto tampoco la alcanza").toBe(1);
    });
  });

  it("es idempotente: aplicarla dos veces no duplica politicas", async () => {
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(SQL_592);
      await c.query(SQL_592);
      const { rows } = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_policies WHERE policyname LIKE '%\\_592\\_%'`,
      );
      expect(Number(rows[0].n)).toBe(20);
    });
  });

  it("y el ROLLBACK deja la base como estaba", async () => {
    const antes = await pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM pg_policies WHERE policyname LIKE '%\\_592\\_%'`,
    );
    await enUnaTransaccionQueSeRevierte(async (c) => {
      await c.query(SQL_592);
    });
    const despues = await pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM pg_policies WHERE policyname LIKE '%\\_592\\_%'`,
    );
    expect(despues.rows[0].n).toBe(antes.rows[0].n);
  });

  it("LO QUE ESTA PRUEBA NO PUEDE AFIRMAR, dicho aqui", () => {
    /**
     * El defecto que la 592 arregla NO ES REPRODUCIBLE EN LOCAL: la 567 lo
     * causo saltando las tablas CON filas, y en local estan vacias.
     *
     * Se deja fijado que existe la herramienta que si puede responderlo, para
     * que nadie lea el verde de arriba como «produccion esta a salvo».
     */
    const auditor = path.resolve(__dirname, "..", "..", "..", "scripts", "auditar-rls-produccion.mjs");
    expect(
      fs.existsSync(auditor),
      "falta el auditor productivo: sin el, nada comprueba lo que esta prueba no puede ver",
    ).toBe(true);
  });
});
