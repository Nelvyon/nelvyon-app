/**
 * Una solicitud aceptada es un contrato, y hasta hoy no había ni lo uno ni lo otro.
 *
 * ── LO QUE SE MIDIÓ ─────────────────────────────────────────────────────────
 *
 * `os_service_requests` declara seis estados —solicitado, en_revisión,
 * propuesto, aceptado, rechazado, cancelado— y sólo se escribía el primero. En
 * todo el repositorio no había ni una sentencia que moviera una solicitud a
 * `aceptado`.
 *
 * Un cliente pedía un servicio y se quedaba pedido para siempre.
 *
 * Y `os_service_contracts` lo leen CUATRO módulos —comprobación de salud,
 * informes, analítica de administración y el cron de mantenimiento— y no lo
 * escribía nadie. `OsHealthCheck` recorría cero clientes y no informaba de
 * ningún problema: un verde falso, que es peor que un rojo.
 *
 * Las dos cosas eran la misma pieza que faltaba: la transición.
 *
 * ── POR QUÉ CONTRA POSTGRESQL DE VERDAD ─────────────────────────────────────
 *
 * El `CHECK` de estados, el `ON CONFLICT` de la idempotencia y el cruce
 * workspace → inquilino no existen en un doble en memoria. Lo que se comprueba
 * aquí es justo que la base acepta lo que se le manda.
 *
 * COSTE EXTERNO: 0 EUR. Base local.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";

import { CicloDelClienteService } from "../CicloDelClienteService";

const DSN =
  process.env.NELVYON_COLA_CERT_DSN ??
  process.env.NELVYON_WEB_CERT_DSN ??
  process.env.DATABASE_URL ??
  "";

const suite = DSN ? describe : describe.skip;

const WS = 940505;
let pg: Client;
let clientId = "";
let tenantId = "";
let usuarioId = "";
let servicio: CicloDelClienteService;

const db = {
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const r = await pg.query(sql, params as never[]);
    return r.rows as T[];
  },
};

suite("una solicitud aceptada es un contrato", () => {
  beforeAll(async () => {
    pg = new Client({ connectionString: DSN });
    await pg.connect();
    await limpiar();

    const c = await pg.query(
      `INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, status)
       VALUES ($1, 'certificacion-local', 'Cliente de prueba', 'active') RETURNING id`,
      [WS],
    );
    clientId = c.rows[0].id as string;

    // `saas_tenants.user_id` tiene clave foránea a `nelvyon_users`: hace falta
    // un usuario real. Es justo lo que un doble en memoria no habría exigido.
    const u = await pg.query(
      `INSERT INTO nelvyon_users (email, password_hash, full_name)
       VALUES ($1, 'x', 'Certificacion local') RETURNING user_id`,
      [`cert-${WS}@local.test`],
    );
    usuarioId = u.rows[0].user_id as string;

    const t = await pg.query(
      `INSERT INTO saas_tenants (workspace_id, user_id, company_name, industry)
       VALUES ($1, $2, 'Agencia de prueba', 'marketing') RETURNING id`,
      [WS, usuarioId],
    );
    tenantId = t.rows[0].id as string;

    servicio = new CicloDelClienteService(db as never, {} as never);
  });

  afterAll(async () => {
    await limpiar();
    await pg.end();
  });

  beforeEach(async () => {
    await pg.query(`DELETE FROM os_service_contracts WHERE tenant_id = $1::uuid`, [tenantId]);
    await pg.query(`DELETE FROM os_service_requests WHERE workspace_id = $1`, [WS]);
  });

  async function limpiar() {
    await pg.query(`DELETE FROM os_service_requests WHERE workspace_id = $1`, [WS]);
    await pg.query(
      `DELETE FROM os_service_contracts WHERE tenant_id IN
         (SELECT id FROM saas_tenants WHERE workspace_id = $1)`,
      [WS],
    );
    await pg.query(`DELETE FROM saas_tenants WHERE workspace_id = $1`, [WS]);
    await pg.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [WS]);
    await pg.query(`DELETE FROM nelvyon_users WHERE email = $1`, [`cert-${WS}@local.test`]);
  }

  async function pedir(serviceId = "seo_premium"): Promise<string> {
    const r = await pg.query(
      `INSERT INTO os_service_requests
         (workspace_id, client_id, service_id, solicitada_por, estado)
       VALUES ($1, $2::uuid, $3, 'cliente', 'solicitado') RETURNING id`,
      [WS, clientId, serviceId],
    );
    return r.rows[0].id as string;
  }

  it("LA REGLA: aceptar mueve la solicitud y crea el contrato", async () => {
    const id = await pedir();

    const r = await servicio.aceptarSolicitud({
      workspaceId: WS,
      clientId,
      solicitudId: id,
      aceptadaPor: "daniel@nelvyon.com",
    });

    expect(r.aceptada).toBe(true);
    expect(r.contratoId, "se aceptó sin crear contrato").toBeTruthy();

    const sol = await pg.query(`SELECT estado, decidida_en FROM os_service_requests WHERE id = $1`, [id]);
    expect(sol.rows[0].estado).toBe("aceptado");
    expect(sol.rows[0].decidida_en, "no consta cuándo se decidió").not.toBeNull();
  });

  it("y el contrato es el que leen la salud y los informes", async () => {
    // `OsHealthCheck` consulta exactamente esto. Antes recorría cero clientes.
    await servicio.aceptarSolicitud({
      workspaceId: WS, clientId, solicitudId: await pedir(), aceptadaPor: "d@n.com",
    });

    const activos = await pg.query(
      `SELECT DISTINCT client_id, tenant_id::text AS tenant_id
         FROM os_service_contracts WHERE status = 'active' AND tenant_id = $1::uuid`,
      [tenantId],
    );
    expect(activos.rowCount, "la comprobación de salud sigue sin ver a nadie").toBe(1);
    expect(activos.rows[0].client_id).toBe(clientId);
  });

  it("IDEMPOTENTE: aceptar dos veces no crea dos contratos", async () => {
    const id = await pedir();
    await servicio.aceptarSolicitud({ workspaceId: WS, clientId, solicitudId: id, aceptadaPor: "d@n.com" });
    const segunda = await servicio.aceptarSolicitud({
      workspaceId: WS, clientId, solicitudId: id, aceptadaPor: "d@n.com",
    });

    expect(segunda.aceptada, "la segunda vez dijo que no").toBe(true);
    expect(segunda.motivo).toMatch(/ya estaba/);

    const n = await pg.query(
      `SELECT COUNT(*)::int AS n FROM os_service_contracts WHERE tenant_id = $1::uuid`,
      [tenantId],
    );
    expect(n.rows[0].n, "un doble clic duplicó el contrato").toBe(1);
  });

  it("EL CONTROL: no se puede aceptar lo que ya se rechazó", async () => {
    // Sin esto, aceptar sería una forma de reabrir cualquier cosa cancelada.
    const id = await pedir();
    await pg.query(`UPDATE os_service_requests SET estado = 'rechazado' WHERE id = $1`, [id]);

    const r = await servicio.aceptarSolicitud({
      workspaceId: WS, clientId, solicitudId: id, aceptadaPor: "d@n.com",
    });

    expect(r.aceptada).toBe(false);
    const sol = await pg.query(`SELECT estado FROM os_service_requests WHERE id = $1`, [id]);
    expect(sol.rows[0].estado).toBe("rechazado");
  });

  it("y NO se puede aceptar la solicitud de otro cliente", async () => {
    // El alcance no depende de que quien llame se porte bien.
    const id = await pedir();
    const otro = await pg.query(
      `INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, status)
       VALUES ($1, 'x', 'Otro cliente', 'active') RETURNING id`,
      [WS],
    );

    const r = await servicio.aceptarSolicitud({
      workspaceId: WS,
      clientId: otro.rows[0].id as string,
      solicitudId: id,
      aceptadaPor: "d@n.com",
    });

    expect(r.aceptada).toBe(false);
    await pg.query(`DELETE FROM os_clients WHERE id = $1`, [otro.rows[0].id]);
  });

  it("sin inquilino, el servicio queda aceptado y se dice que no hay contrato", async () => {
    // Meter el contrato con un inquilino equivocado se lo enseñaría a otra
    // agencia. Aceptar sin contrato es peor que nada, pero es honesto.
    const sinInquilino = WS + 1;
    const c = await pg.query(
      `INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, status)
       VALUES ($1, 'x', 'Sin inquilino', 'active') RETURNING id`,
      [sinInquilino],
    );
    const cid = c.rows[0].id as string;
    const sol = await pg.query(
      `INSERT INTO os_service_requests (workspace_id, client_id, service_id, solicitada_por, estado)
       VALUES ($1, $2::uuid, 'seo_premium', 'cliente', 'solicitado') RETURNING id`,
      [sinInquilino, cid],
    );

    const r = await servicio.aceptarSolicitud({
      workspaceId: sinInquilino,
      clientId: cid,
      solicitudId: sol.rows[0].id as string,
      aceptadaPor: "d@n.com",
    });

    expect(r.aceptada).toBe(true);
    expect(r.contratoId, "se inventó un inquilino").toBeUndefined();

    await pg.query(`DELETE FROM os_service_requests WHERE workspace_id = $1`, [sinInquilino]);
    await pg.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [sinInquilino]);
  });
});
