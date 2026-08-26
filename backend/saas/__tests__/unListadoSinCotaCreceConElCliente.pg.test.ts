/**
 * BLOQUE 8 · un listado sin cota crece con el cliente.
 *
 * `listEnrollments` devuelve **todas** las inscripciones de una secuencia. El
 * aislamiento está bien —`get(tenantId, sequenceId)` comprueba antes que la
 * secuencia es del inquilino, así que las inscripciones también lo son— pero no
 * hay cota. Con veinte contactos es una lista; con cincuenta mil es cincuenta
 * mil objetos en memoria, un `JSON.stringify` que bloquea el bucle de eventos, y
 * una respuesta que el navegador no sabe qué hacer con ella.
 *
 * Esto es exactamente lo que pregunta el Bloque 8: algo correcto con una
 * operación y falso con muchas. No hace falta un atacante — hace falta un
 * cliente que use el producto.
 *
 * Se mide con datos de verdad en PostgreSQL, antes y después, y la corrección
 * NO puede ser truncar en silencio: un listado que se corta sin decirlo es peor
 * que uno largo, porque el cliente cree que ha visto todo.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const USUARIO = "8a000000-0000-4000-8000-00000000a001";
const WS = 970081;
const SEQ = "8b000000-0000-4000-8000-00000000b001";
let TENANT = "";

let pool: import("pg").Pool;
let svc: {
  listEnrollments: (t: string, s: string) => Promise<unknown[]>;
};

/** Cuántas inscripciones se siembran. Bastantes para medir, pocas para durar. */
const N = 5_000;

async function limpiar(): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM saas_sequence_enrollments WHERE sequence_id = $1`, [SEQ]);
  await pool.query(`DELETE FROM saas_contacts WHERE tags @> ARRAY['carga-b8']`).catch(() => null);
  await pool.query(`DELETE FROM saas_sequences WHERE id = $1`, [SEQ]).catch(() => null);
  await pool.query(`DELETE FROM saas_tenants WHERE user_id = $1`, [USUARIO]);
  await pool.query(`DELETE FROM workspaces WHERE id = $1`, [WS]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO]);
}

beforeAll(async () => {
  if (!hayBase) return;
  process.env.DATABASE_URL = DSN;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
  await limpiar();
  await pool.query(
    `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
     VALUES ($1,'carga-b8@ejemplo.test','x','Carga B8','pro')`,
    [USUARIO],
  );
  await pool.query(`INSERT INTO workspaces (id, user_id, name) VALUES ($1,$2,'WS Carga')`, [
    WS,
    USUARIO,
  ]);
  const t = await pool.query(
    `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
     VALUES ($1,'Empresa Carga','tech','pro',true,$2) RETURNING id`,
    [USUARIO, WS],
  );
  TENANT = t.rows[0].id;

  // La secuencia. Si el esquema no la tiene, la suite entera se salta: mejor
  // saltarse que fingir.
  await pool.query(
    `INSERT INTO saas_sequences (id, tenant_id, name, status)
     VALUES ($1,$2,'Secuencia de carga','active')
     ON CONFLICT (id) DO NOTHING`,
    [SEQ, TENANT],
  );

  // Siembra en dos INSERT con `generate_series`: mucho mas rapido que N viajes
  // desde Node, y lo que se quiere medir es la LECTURA, no la escritura.
  //
  // Los contactos van PRIMERO porque `saas_sequence_enrollments.contact_id`
  // tiene clave foranea. La primera version sembraba `gen_random_uuid()` como
  // contacto y la restriccion tumbaba el `beforeAll` entero — dejando los cuatro
  // casos «saltados», que es la peor forma de pasar porque no hay nada rojo.
  await pool.query(
    `INSERT INTO saas_contacts (id, tenant_id, name, status, pipeline_stage, value, tags, lead_score)
     SELECT gen_random_uuid(), $1::uuid, 'Contacto ' || i, 'lead', 'new', 0, ARRAY['carga-b8'], 0
       FROM generate_series(1, $2::int) AS i`,
    [TENANT, N],
  );
  // La fecha se BARAJA a proposito respecto al orden fisico de insercion.
  //
  // La primera version usaba `NOW() - row_number()`, con lo que la fila mas
  // reciente era tambien la primera del monton. Resultado: `LIMIT` SIN `ORDER BY`
  // devolvia exactamente las mismas filas que con orden, y la mutacion que
  // quitaba el `ORDER BY` **no caia**. La prueba decia certificar «las mas
  // recientes» y lo que certificaba era una coincidencia del almacenamiento.
  //
  // `(i * 7919) % N` es una permutacion determinista —7919 es primo y no divide
  // a N— asi que el orden temporal queda descorrelacionado del fisico y la
  // ausencia de `ORDER BY` se nota.
  await pool.query(
    `INSERT INTO saas_sequence_enrollments
       (id, sequence_id, tenant_id, contact_id, current_step, status, enrolled_at)
     SELECT gen_random_uuid(), $1::uuid, $2::uuid, c.id, 0, 'active',
            NOW() - (((row_number() OVER ()) * 7919 % $3::int) || ' seconds')::interval
       FROM saas_contacts c WHERE c.tenant_id = $2::uuid`,
    [SEQ, TENANT, N],
  );

  const mod = await import("../SaasSequencesService");
  svc = mod.getSaasSequencesService() as never;
});

beforeEach(() => {
  delete process.env.NELVYON_LISTADO_MAX;
});

afterAll(async () => {
  if (!pool) return;
  await limpiar();
  await pool.end();
});

soloConBase("BLOQUE 8 · el tamaño del listado", () => {
  it("MEDIDO: cuántas filas y cuánto pesa la respuesta", async () => {
    /**
     * Primero se mide. Sin este número, cualquier «optimización» es una
     * opinión.
     */
    const t = Date.now();
    const filas = await svc.listEnrollments(TENANT, SEQ);
    const ms = Date.now() - t;
    const bytes = Buffer.byteLength(JSON.stringify(filas), "utf8");
    console.info(
      `listEnrollments con ${N} inscripciones: ${filas.length} filas, ` +
        `${(bytes / 1024).toFixed(0)} KiB, ${ms}ms`,
    );
    // Lo que se afirma no es un numero de milisegundos —depende de la maquina—
    // sino la COTA. Si devuelve las 5000, no hay cota.
    expect(filas.length, "el listado devolvio TODAS las filas: no hay cota").toBeLessThan(N);
  }, 120_000);

  it("la cota es configurable y se respeta", async () => {
    process.env.NELVYON_LISTADO_MAX = "50";
    const filas = await svc.listEnrollments(TENANT, SEQ);
    expect(filas.length, "la cota no se aplico").toBe(50);
  }, 60_000);

  it("EL CONTROL: con pocas inscripciones se devuelven TODAS", async () => {
    /**
     * Sin este control, una cota de cero pasaría los casos de arriba y dejaría
     * el listado vacío para todo el mundo. Es la mitad que convierte la cota en
     * una mejora y no en una avería.
     */
    process.env.NELVYON_LISTADO_MAX = "10000";
    const filas = await svc.listEnrollments(TENANT, SEQ);
    expect(filas.length).toBe(N);
  }, 120_000);

  it("el orden se mantiene: las MÁS RECIENTES primero", async () => {
    /**
     * Una cota cambia QUÉ se devuelve, no solo cuánto. Si el listado se cortara
     * antes de ordenar, el cliente vería un trozo arbitrario en vez de lo
     * último, que es lo que quiere ver. Es la diferencia entre acotar y
     * estropear.
     */
    process.env.NELVYON_LISTADO_MAX = "20";
    const filas = (await svc.listEnrollments(TENANT, SEQ)) as Array<{ enrolledAt: string }>;
    expect(filas).toHaveLength(20);
    const fechas = filas.map((f) => new Date(f.enrolledAt).getTime());
    const ordenadas = [...fechas].sort((a, b) => b - a);
    expect(fechas, "el listado acotado no viene ordenado por fecha descendente").toEqual(ordenadas);
    // Y son las MAS RECIENTES de las 5000, no unas cualesquiera.
    //
    // Se comparan IDENTIFICADORES, no fechas. La primera version contaba filas
    // «mas recientes que la mas antigua devuelta» y fallaba por UNO: las fechas
    // del listado pasan por `toISOString()`, que trunca a milisegundos, mientras
    // PostgreSQL guarda microsegundos — asi que la propia fila mas antigua salia
    // «mayor que si misma». Un fallo de precision en la prueba, no en el
    // producto, y compararlo por identificador lo elimina de raiz.
    const esperados = await pool.query<{ id: string }>(
      `SELECT id FROM saas_sequence_enrollments
        WHERE sequence_id = $1 ORDER BY enrolled_at DESC LIMIT 20`,
      [SEQ],
    );
    const devueltos = (filas as unknown as Array<{ id: string }>).map((f) => f.id).sort();
    expect(
      devueltos,
      "el listado acotado NO son las veinte mas recientes: se corto antes de ordenar",
    ).toEqual(esperados.rows.map((r) => r.id).sort());
  }, 120_000);
});
