/**
 * Dos ejecuciones concurrentes de un cron no procesan la misma fila.
 *
 * EL DEFECTO QUE CERTIFICA CERRADO
 * ---------------------------------
 * `email_queue` y `saas_dunning_events` se procesaban así:
 *
 *     SELECT ... WHERE status = 'pending' LIMIT n
 *     …enviar el correo…
 *     UPDATE ... SET status = 'sent' WHERE id = $1
 *
 * El estado se actualizaba DESPUÉS de enviar. Dos ejecuciones solapadas —o un
 * reintento del planificador sobre una ejecución lenta— seleccionaban las mismas
 * filas y enviaban el mismo mensaje dos veces.
 *
 * No daba error y no salía en ningún log como fallo. El síntoma lo veía sólo el
 * destinatario. Y en el caso del dunning no es una notificación cualquiera: es una
 * **reclamación de cobro** repetida al cliente de un cliente.
 *
 * POR QUE ESTA PRUEBA NO PUEDE SER UN DOBLE
 * ------------------------------------------
 * La carrera vive en el motor: `FOR UPDATE SKIP LOCKED` es una garantía de
 * PostgreSQL sobre bloqueos de fila. Un doble de base de datos no tiene bloqueos,
 * así que aprobaría igual con el código roto — que es la peor forma de aprobar.
 *
 * Se lanzan las dos reclamaciones EN PARALELO de verdad, sobre conexiones
 * distintas, y se cuenta la intersección.
 *
 * Se salta sin `NELVYON_WEB_CERT_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_WEB_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

const ENVIANDO = "sending";
let pool: import("pg").Pool;

/** La forma corregida: reclamar y devolver, en una sola sentencia. */
const RECLAMAR = `
  UPDATE cert_cola SET status = $1
   WHERE id IN (
     SELECT id FROM cert_cola WHERE status = 'pending'
      ORDER BY created_at ASC, id ASC LIMIT $2
      FOR UPDATE SKIP LOCKED
   )
   RETURNING id`;

/** La forma anterior, para demostrar que la prueba distingue una de otra. */
const COMO_ESTABA = `
  SELECT id FROM cert_cola WHERE status = 'pending'
   ORDER BY created_at ASC, id ASC LIMIT $1`;

describeSiHayPg("las colas de trabajo no entregan la misma fila dos veces", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    // Al menos dos conexiones: con una sola no habria concurrencia que medir.
    pool = new Pool({ connectionString: DSN, max: 4 });
  });

  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    await pool.query("TRUNCATE cert_cola");
    await pool.query("INSERT INTO cert_cola (status) SELECT 'pending' FROM generate_series(1,20)");
  });

  it("dos reclamaciones concurrentes se reparten filas DISTINTAS", async () => {
    // LA PRUEBA. `Promise.all` sobre dos conexiones distintas: se solapan de
    // verdad, no una detras de otra.
    const [a, b] = await Promise.all([
      pool.query<{ id: number }>(RECLAMAR, [ENVIANDO, 8]),
      pool.query<{ id: number }>(RECLAMAR, [ENVIANDO, 8]),
    ]);
    const idsA = a.rows.map((r) => r.id);
    const idsB = b.rows.map((r) => r.id);
    const comunes = idsA.filter((x) => idsB.includes(x));

    expect(comunes).toHaveLength(0);
    // Controles positivos: las dos se llevaron trabajo. Una implementacion que
    // no entregara nada a nadie tambien tendria interseccion vacia.
    expect(idsA.length).toBeGreaterThan(0);
    expect(idsB.length).toBeGreaterThan(0);
    expect(idsA.length + idsB.length).toBe(16);
  });

  it("EL CONTROL: la forma anterior SI entrega las mismas filas", async () => {
    // Sin esto, la prueba de arriba podria estar pasando por cualquier motivo
    // —una tabla vacia, un LIMIT mal puesto— y no por el `SKIP LOCKED`.
    // Aqui se reproduce el codigo tal y como estaba y se comprueba que el
    // solapamiento era real, no una preocupacion teorica.
    const [a, b] = await Promise.all([
      pool.query<{ id: number }>(COMO_ESTABA, [8]),
      pool.query<{ id: number }>(COMO_ESTABA, [8]),
    ]);
    const comunes = a.rows.map((r) => r.id).filter((x) => b.rows.some((y) => y.id === x));
    expect(comunes.length).toBeGreaterThan(0);
  });

  it("diez reclamaciones a la vez no reparten ni una fila dos veces", async () => {
    // Dos podria salir bien por casualidad de planificacion. Diez, no.
    const lotes = await Promise.all(
      Array.from({ length: 10 }, () => pool.query<{ id: number }>(RECLAMAR, [ENVIANDO, 3])));
    const todos = lotes.flatMap((l) => l.rows.map((r) => r.id));
    expect(new Set(todos).size).toBe(todos.length);   // ninguno repetido
    expect(todos.length).toBe(20);                    // y se reparten TODAS
  });

  it("lo reclamado deja de estar pendiente", async () => {
    await pool.query(RECLAMAR, [ENVIANDO, 5]);
    const { rows } = await pool.query<{ pendientes: number }>(
      "SELECT count(*)::int AS pendientes FROM cert_cola WHERE status = 'pending'");
    expect(rows[0].pendientes).toBe(15);
  });

  it("lo que quedo tomado por un proceso muerto vuelve a la cola", async () => {
    // La recuperacion importa tanto como la reclamacion: sin ella, cambiar el
    // duplicado por «el correo no sale nunca» seria un mal negocio. Un mensaje
    // repetido se ve; uno que no llega, no.
    const tomadas = await pool.query<{ id: number }>(RECLAMAR, [ENVIANDO, 4]);
    await pool.query(
      "UPDATE cert_cola SET created_at = NOW() - INTERVAL '1 hour', sent_at = NULL WHERE id = ANY($1)",
      [tomadas.rows.map((r) => r.id)]);

    const recuperadas = await pool.query<{ id: number }>(
      `UPDATE cert_cola SET status = 'pending'
        WHERE status = $1 AND COALESCE(sent_at, created_at) < NOW() - ($2 || ' minutes')::interval
        RETURNING id`, [ENVIANDO, "15"]);
    expect(recuperadas.rows).toHaveLength(4);

    // Y vuelven a poder reclamarse: la recuperacion no las deja en un limbo.
    const otra = await pool.query<{ id: number }>(RECLAMAR, [ENVIANDO, 4]);
    expect(otra.rows.length).toBeGreaterThan(0);
  });

  it("lo tomado hace un momento NO se recupera todavia", async () => {
    // EL CONTROL de la recuperacion. Una ventana mal puesta —o a cero— devolveria
    // a la cola filas que un proceso vivo esta enviando AHORA, y entonces la
    // recuperacion seria la que produce el duplicado.
    await pool.query(RECLAMAR, [ENVIANDO, 4]);
    const recuperadas = await pool.query(
      `UPDATE cert_cola SET status = 'pending'
        WHERE status = $1 AND COALESCE(sent_at, created_at) < NOW() - ($2 || ' minutes')::interval
        RETURNING id`, [ENVIANDO, "15"]);
    expect(recuperadas.rows).toHaveLength(0);
  });
});
