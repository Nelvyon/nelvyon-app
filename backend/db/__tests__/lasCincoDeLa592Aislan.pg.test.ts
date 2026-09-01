/**
 * LAS CINCO DE LA 592 AISLAN DE VERDAD, TABLA POR TABLA.
 *
 * La otra prueba comprueba que la migracion toca las cinco que dice. Esta
 * comprueba lo que de verdad importa: que UNA FILA DE A NO LA VE B.
 *
 * ── CADA UNA CON SU SUJETO, PORQUE NO COMPARTEN MODELO ──────────────────────
 *
 *   os_sector_shield_audits     por WORKSPACE  (pertenencia + contexto)
 *   saas_pack_entitlements      por TENANT uuid, derivado del usuario
 *   saas_autopilot_settings     por TENANT uuid
 *   saas_activation_checklist   por TENANT texto
 *   saas_tenants                por USUARIO
 *
 * Probarlas todas con el mismo ataque seria no probar ninguna: el sujeto que
 * hay que falsificar es distinto en cada caso.
 *
 * ── SE CONECTA CON EL ROL SIN PRIVILEGIOS ───────────────────────────────────
 *
 * `nelvyon_web_app`, sin SUPERUSER y sin BYPASSRLS. Con el rol de siembra
 * —superusuario— todas las consultas devolverian todo y la suite aprobaria sin
 * medir nada.
 *
 * Las consultas van a proposito SIN filtro de inquilino: todo lo que separe a A
 * de B tiene que venir de la politica.
 *
 * COSTE EXTERNO: 0 EUR. Datos sinteticos, se limpian al terminar.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { sembrarSujetosReales, USUARIO_A, USUARIO_B, WS_A, WS_B, TENANT_A, TENANT_B }
  from "./politicasRealesDeCertificacion";

/**
 * Se salta sin `NELVYON_WEB_APP_CERT_DSN` y `NELVYON_WEB_CERT_DSN`: sin un
 * PostgreSQL con el rol sin privilegios no hay politicas que medir, y medirlas
 * con un superusuario seria aprobar por la razon equivocada.
 */
const describeSiHayRol =
  process.env.NELVYON_WEB_APP_CERT_DSN && process.env.NELVYON_WEB_CERT_DSN
    ? describe
    : describe.skip;

const DSN_APP = process.env.NELVYON_WEB_APP_CERT_DSN;
const DSN_DUENO = process.env.NELVYON_WEB_CERT_DSN;

let app: import("pg").Pool;
let dueno: import("pg").Pool;

/** Marca con la que se reconocen las filas de esta prueba. */
const MARCA = "cert592";

/** Ejecuta como la aplicacion: transaccion con el contexto fijado. */
async function como<T>(
  ctx: { usuario?: string | null; ws?: number | null },
  fn: (c: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const c = await app.connect();
  try {
    await c.query("BEGIN");
    if (ctx.usuario) await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ctx.usuario]);
    if (ctx.ws != null) await c.query("SELECT set_config('app.workspace_id', $1, true)", [String(ctx.ws)]);
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

const cuantas = (sql: string) => async (c: import("pg").PoolClient) =>
  Number((await c.query<{ n: string }>(sql)).rows[0].n);

describeSiHayRol("las cinco de la 592 aislan", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    app = new Pool({ connectionString: DSN_APP, max: 2 });
    dueno = new Pool({ connectionString: DSN_DUENO, max: 2 });

    /**
     * SE APLICA LA MIGRACION AQUI, Y NO SE DA POR APLICADA.
     *
     * La primera version daba por hecho que la 592 ya estaba puesta en la base
     * y solo leia el resultado. Parecia razonable y no medía la migración: al
     * mutar el fichero —cambiando la politica de lectura por `USING (true)`—
     * las 22 pruebas seguian en verde, porque las politicas de la base seguian
     * siendo las buenas.
     *
     * Una prueba que no ejecuta lo que dice certificar certifica otra cosa. Se
     * lee el fichero y se aplica; es idempotente, asi que ejecutarla mil veces
     * deja el mismo estado.
     */
    const dir = path.resolve(__dirname, "..", "migrations");
    const f = fs.readdirSync(dir).find((x) => x.startsWith("592_") && x.endsWith(".sql"));
    if (!f) throw new Error("no se encuentra la migracion 592");
    await dueno.query(fs.readFileSync(path.join(dir, f), "utf8"));
    // El rol de prueba necesita poder llegar a la tabla; el aislamiento lo pone
    // la politica, no la ausencia de permiso.
    await dueno.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON
         os_sector_shield_audits, saas_pack_entitlements, saas_autopilot_settings,
         saas_activation_checklist, saas_tenants
       TO nelvyon_web_app`,
    );

    await sembrarSujetosReales(dueno);

    // Los inquilinos de A y B tienen que existir para que
    // `nelvyon_current_saas_tenant_uuid()` resuelva.
    for (const [t, u] of [[TENANT_A, USUARIO_A], [TENANT_B, USUARIO_B]] as const) {
      await dueno.query(
        `INSERT INTO saas_tenants (id, user_id, company_name, industry)
         VALUES ($1, $2, $3, 'certificacion') ON CONFLICT (id) DO NOTHING`,
        [t, u, `cert-${t.slice(0, 8)}`],
      );
    }
  });

  afterAll(async () => {
    // Se borra SOLO lo sembrado por esta prueba.
    await dueno.query(`DELETE FROM os_sector_shield_audits WHERE sector_id = $1`, [MARCA]);
    await dueno.query(`DELETE FROM saas_pack_entitlements WHERE pack_id = $1`, [MARCA]);
    await dueno.query(`DELETE FROM saas_autopilot_settings WHERE tenant_id IN ($1,$2)`, [TENANT_A, TENANT_B]);
    await dueno.query(`DELETE FROM saas_activation_checklist WHERE tenant_id IN ($1,$2)`, [TENANT_A, TENANT_B]);
    await app?.end();
    await dueno?.end();
  });

  it("EL CONTROL: el rol no es superusuario ni salta RLS", async () => {
    const { rows } = await app.query(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    );
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // os_sector_shield_audits — por WORKSPACE
  // ═════════════════════════════════════════════════════════════════════════

  describe("os_sector_shield_audits (por workspace)", () => {
    const contar = cuantas(
      `SELECT count(*) AS n FROM os_sector_shield_audits WHERE sector_id = '${MARCA}'`,
    );

    beforeEach(async () => {
      await dueno.query(`DELETE FROM os_sector_shield_audits WHERE sector_id = $1`, [MARCA]);
      await dueno.query(
        `INSERT INTO os_sector_shield_audits (sector_id, workspace_id, status)
         VALUES ($1,$2,'passed'), ($1,$3,'passed')`,
        [MARCA, WS_A, WS_B],
      );
    });

    it("A → A: ve la suya (control positivo)", async () => {
      expect(await como({ usuario: USUARIO_A, ws: WS_A }, contar)).toBe(1);
    });
    it("A → B: no ve la de B", async () => {
      // Declarar el workspace ajeno no basta: la politica exige pertenecer.
      expect(await como({ usuario: USUARIO_A, ws: WS_B }, contar)).toBe(0);
    });
    it("B → A: tampoco al reves", async () => {
      expect(await como({ usuario: USUARIO_B, ws: WS_A }, contar)).toBe(0);
    });
    it("sin identidad: nada", async () => {
      expect(await como({}, contar)).toBe(0);
    });
    it("identidad invalida: nada", async () => {
      expect(await como({ usuario: "99999999-9999-4999-8999-999999999999", ws: WS_A }, contar)).toBe(0);
    });
    it("identidad contradictoria: nada", async () => {
      expect(await como({ usuario: USUARIO_B, ws: WS_A }, contar)).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // saas_pack_entitlements — por TENANT uuid
  // ═════════════════════════════════════════════════════════════════════════

  describe("saas_pack_entitlements (por tenant uuid)", () => {
    const contar = cuantas(
      `SELECT count(*) AS n FROM saas_pack_entitlements WHERE pack_id = '${MARCA}'`,
    );

    beforeEach(async () => {
      await dueno.query(`DELETE FROM saas_pack_entitlements WHERE pack_id = $1`, [MARCA]);
      await dueno.query(
        `INSERT INTO saas_pack_entitlements (tenant_id, pack_id, status)
         VALUES ($1,$3,'active'), ($2,$3,'active')`,
        [TENANT_A, TENANT_B, MARCA],
      );
    });

    it("A → A: ve la suya (control positivo)", async () => {
      expect(await como({ usuario: USUARIO_A }, contar)).toBe(1);
    });
    it("A → B: no ve la de B", async () => {
      // El inquilino se DERIVA del usuario: no hay forma de declarar otro.
      expect(await como({ usuario: USUARIO_A }, contar)).toBe(1);
      expect(await como({ usuario: USUARIO_B }, contar)).toBe(1);
    });
    it("sin identidad: nada", async () => {
      expect(await como({}, contar)).toBe(0);
    });
    it("identidad invalida: nada", async () => {
      expect(await como({ usuario: "99999999-9999-4999-8999-999999999999" }, contar)).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // saas_autopilot_settings — por TENANT uuid
  // ═════════════════════════════════════════════════════════════════════════

  describe("saas_autopilot_settings (por tenant uuid)", () => {
    const contar = cuantas(
      `SELECT count(*) AS n FROM saas_autopilot_settings
        WHERE tenant_id IN ('${TENANT_A}','${TENANT_B}')`,
    );

    beforeEach(async () => {
      await dueno.query(`DELETE FROM saas_autopilot_settings WHERE tenant_id IN ($1,$2)`, [TENANT_A, TENANT_B]);
      await dueno.query(
        `INSERT INTO saas_autopilot_settings (tenant_id) VALUES ($1), ($2)`,
        [TENANT_A, TENANT_B],
      );
    });

    it("A ve una sola: la suya", async () => {
      expect(await como({ usuario: USUARIO_A }, contar)).toBe(1);
    });
    it("B ve una sola: la suya", async () => {
      expect(await como({ usuario: USUARIO_B }, contar)).toBe(1);
    });
    it("sin identidad: nada", async () => {
      expect(await como({}, contar)).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // saas_activation_checklist — por TENANT texto
  // ═════════════════════════════════════════════════════════════════════════

  describe("saas_activation_checklist (por tenant texto)", () => {
    const contar = cuantas(
      `SELECT count(*) AS n FROM saas_activation_checklist
        WHERE tenant_id IN ('${TENANT_A}','${TENANT_B}')`,
    );

    beforeEach(async () => {
      await dueno.query(`DELETE FROM saas_activation_checklist WHERE tenant_id IN ($1,$2)`, [TENANT_A, TENANT_B]);
      await dueno.query(
        `INSERT INTO saas_activation_checklist (tenant_id) VALUES ($1), ($2)`,
        [TENANT_A, TENANT_B],
      );
    });

    it("A ve una sola, y el tipo TEXT no rompe la comparacion", async () => {
      // Su `tenant_id` es TEXT y el sujeto es uuid: si el cast estuviera mal,
      // esto daria 0 y la tabla quedaria ilegible en vez de aislada.
      expect(await como({ usuario: USUARIO_A }, contar)).toBe(1);
    });
    it("B ve una sola", async () => {
      expect(await como({ usuario: USUARIO_B }, contar)).toBe(1);
    });
    it("sin identidad: nada", async () => {
      expect(await como({}, contar)).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // saas_tenants — por USUARIO
  // ═════════════════════════════════════════════════════════════════════════

  describe("saas_tenants (por usuario)", () => {
    const contar = cuantas(
      `SELECT count(*) AS n FROM saas_tenants WHERE id IN ('${TENANT_A}','${TENANT_B}')`,
    );

    it("A ve el suyo y SOLO el suyo", async () => {
      expect(await como({ usuario: USUARIO_A }, contar)).toBe(1);
    });
    it("B ve el suyo y SOLO el suyo", async () => {
      expect(await como({ usuario: USUARIO_B }, contar)).toBe(1);
    });
    it("sin identidad: nada", async () => {
      expect(await como({}, contar)).toBe(0);
    });
    it("identidad invalida: nada", async () => {
      expect(await como({ usuario: "99999999-9999-4999-8999-999999999999" }, contar)).toBe(0);
    });

    it("y la funcion de la que dependen 596 politicas SIGUE resolviendo", async () => {
      /**
       * LA COMPROBACION QUE PODIA ROMPERLO TODO.
       *
       * `nelvyon_current_saas_tenant_uuid()` LEE `saas_tenants`. Con RLS puesto,
       * si la funcion dejara de encontrar la fila, las 596 politicas que
       * dependen de ella devolverian NULL y TODAS sus tablas quedarian a cero.
       *
       * No pasa porque la funcion es SECURITY DEFINER y su propietario salta
       * RLS. Se comprueba en vez de suponerlo.
       */
      const t = await como({ usuario: USUARIO_A }, async (c) =>
        (await c.query<{ t: string | null }>(`SELECT nelvyon_current_saas_tenant_uuid() AS t`)).rows[0].t,
      );
      expect(t, "la funcion dejo de resolver con RLS puesto: 596 politicas caerian").toBe(TENANT_A);
    });
  });
});
