/**
 * BLOQUE 2 · ERP — la instantánea de dominio, con control de versión optimista.
 *
 * El ERP no guarda filas sueltas: guarda una INSTANTÁNEA por dominio (inventario,
 * compras, fabricación, proyectos) con un número de versión. Eso hace que la
 * prueba que importa no sea el CRUD, sino la CONCURRENCIA:
 *
 * dos personas editando el mismo almacén a la vez no pueden pisarse. Si la
 * segunda escritura no comprueba la versión, la primera desaparece sin dejar
 * rastro — y en un inventario eso son unidades que existen en pantalla y no en
 * el almacén.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/**
 * La escritura con versión esperada, tal como la hace el almacén: se compara la
 * versión y solo entonces se escribe. Es la forma que se certifica.
 */
const GUARDAR = `
  UPDATE erp_domain_snapshots
     SET payload = $3::jsonb, version = version + 1, updated_at = NOW()
   WHERE tenant_id = $1 AND domain = $2 AND version = $4
   RETURNING version`;

describeSiHayPg("BLOQUE 2 · ERP — instantáneas de dominio", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 8 });
  });

  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    await pool.query("DELETE FROM erp_domain_snapshots WHERE tenant_id = ANY($1)", [[A, B]]);
    for (const t of [A, B]) {
      await pool.query(
        `INSERT INTO erp_domain_snapshots (tenant_id, domain, payload, version, updated_at)
         VALUES ($1, 'inventory', $2::jsonb, 1, NOW())`,
        [t, JSON.stringify({ almacenes: [{ id: "alm-1", unidades: 100 }] })]);
    }
  });

  it("la instantánea se lee con su versión", async () => {
    const r = await pool.query<{ payload: { almacenes: unknown[] }; version: number }>(
      "SELECT payload, version FROM erp_domain_snapshots WHERE tenant_id=$1 AND domain='inventory'",
      [A]);
    expect(Number(r.rows[0]!.version)).toBe(1);
    // El payload es jsonb: tiene que volver como objeto con su array dentro, no
    // como texto ni como `{}`.
    expect(Array.isArray(r.rows[0]!.payload.almacenes)).toBe(true);
  });

  it("guardar con la versión correcta escribe y SUBE la versión", async () => {
    const r = await pool.query<{ version: number }>(GUARDAR,
      [A, "inventory", JSON.stringify({ almacenes: [{ id: "alm-1", unidades: 90 }] }), 1]);
    expect(Number(r.rows[0]!.version)).toBe(2);

    const leido = await pool.query<{ payload: { almacenes: Array<{ unidades: number }> } }>(
      "SELECT payload FROM erp_domain_snapshots WHERE tenant_id=$1 AND domain='inventory'", [A]);
    expect(leido.rows[0]!.payload.almacenes[0]!.unidades).toBe(90);
  });

  it("guardar con una versión VIEJA no escribe nada", async () => {
    // El control de versión optimista: quien llega con una foto antigua no pisa
    // el trabajo de quien ya guardó.
    await pool.query(GUARDAR, [A, "inventory", JSON.stringify({ almacenes: [] }), 1]);
    const tardio = await pool.query(GUARDAR,
      [A, "inventory", JSON.stringify({ almacenes: [{ id: "alm-1", unidades: 0 }] }), 1]);

    expect(tardio.rows).toHaveLength(0);   // no escribió
  });

  it("cuatro escrituras SIMULTÁNEAS desde la misma versión: solo una gana", async () => {
    // La prueba que de verdad importa. Cuatro personas editando el mismo almacén
    // a la vez, todas partiendo de la versión 1. Si el control de versión no
    // funcionara, las cuatro escribirían y tres cambios desaparecerían sin dejar
    // rastro: unidades que existen en pantalla y no en el almacén.
    const intentos = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        pool.query(GUARDAR,
          [A, "inventory", JSON.stringify({ almacenes: [{ id: "alm-1", unidades: 90 - i }] }), 1])));

    const ganadores = intentos.filter((r) => r.rows.length > 0);
    expect(ganadores).toHaveLength(1);

    const final = await pool.query<{ version: number }>(
      "SELECT version FROM erp_domain_snapshots WHERE tenant_id=$1 AND domain='inventory'", [A]);
    expect(Number(final.rows[0]!.version)).toBe(2);   // una sola subida
  });

  it("EL CONTROL: escribir en A no toca la instantánea de B", async () => {
    await pool.query(GUARDAR,
      [A, "inventory", JSON.stringify({ almacenes: [{ id: "alm-1", unidades: 5 }] }), 1]);

    const deB = await pool.query<{ payload: { almacenes: Array<{ unidades: number }> }; version: number }>(
      "SELECT payload, version FROM erp_domain_snapshots WHERE tenant_id=$1 AND domain='inventory'", [B]);
    expect(Number(deB.rows[0]!.version)).toBe(1);
    expect(deB.rows[0]!.payload.almacenes[0]!.unidades).toBe(100);
  });

  it("cada dominio lleva su propia versión", async () => {
    // Inventario y compras son dominios distintos: mover uno no puede invalidar
    // la foto que otra persona tiene del otro.
    await pool.query(
      `INSERT INTO erp_domain_snapshots (tenant_id, domain, payload, version, updated_at)
       VALUES ($1, 'purchases', '{"pedidos":[]}'::jsonb, 1, NOW())`, [A]);
    await pool.query(GUARDAR, [A, "inventory", JSON.stringify({ almacenes: [] }), 1]);

    const compras = await pool.query<{ version: number }>(
      "SELECT version FROM erp_domain_snapshots WHERE tenant_id=$1 AND domain='purchases'", [A]);
    expect(Number(compras.rows[0]!.version)).toBe(1);
  });

  it("un inquilino sin instantánea no hereda la de otro", async () => {
    const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const r = await pool.query(
      "SELECT 1 FROM erp_domain_snapshots WHERE tenant_id=$1", [C]);
    expect(r.rows).toHaveLength(0);
  });
});
