/**
 * El reclamo de idempotencia de Stripe, contra PostgreSQL de verdad.
 *
 * POR QUE CONTRA UNA BASE REAL
 * ----------------------------
 * Lo que se afirma aqui es una propiedad del `INSERT ... ON CONFLICT ... WHERE`,
 * no del TypeScript que lo rodea. Con un doble en memoria se estaria probando el
 * doble: la atomicidad bajo concurrencia, el `WHERE` de la rama `DO UPDATE` y el
 * hecho de que `RETURNING` no devuelva fila cuando la condicion no se cumple son
 * cosas que solo decide el motor.
 *
 * QUE SE CERTIFICA
 * ----------------
 * Las dimensiones que importan en un webhook de dinero:
 *
 *   replay              el mismo evento reenviado no se procesa dos veces
 *   duplicados          dos entregas simultaneas -> exactamente un ganador
 *   concurrencia        el reclamo es atomico, no leer-luego-escribir
 *   estado terminal     `processed` no se vuelve a reclamar nunca
 *   atasco              un `processing` colgado se recupera pasados 10 minutos
 *   aislamiento         eventos distintos no se estorban
 *
 * Stripe reintenta durante dias y no garantiza el orden. Sin esto, un
 * `invoice.paid` reenviado se aplicaria dos veces.
 *
 * Se salta sin `NELVYON_WEB_CERT_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_WEB_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

/** El reclamo, copiado TAL CUAL de la ruta. Si divergen, esto deja de valer. */
const RECLAMO = `
  INSERT INTO cert_stripe_eventos (stripe_event_id, event_type, status, received_at)
  VALUES ($1, $2, 'processing', now())
  ON CONFLICT (stripe_event_id) DO UPDATE
    SET event_type = EXCLUDED.event_type, received_at = now()
    WHERE cert_stripe_eventos.status NOT IN ('processed')
      AND (
        cert_stripe_eventos.status <> 'processing'
        OR cert_stripe_eventos.received_at < NOW() - INTERVAL '10 minutes'
      )
  RETURNING status`;

/** `true` si este intento gano el derecho a procesar. */
async function reclamar(id: string, tipo = "invoice.paid"): Promise<boolean> {
  const r = await pool.query(RECLAMO, [id, tipo]);
  return r.rows.length > 0;
}

describeSiHayPg("reclamo de evento de Stripe", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    // Varias conexiones: con una sola no habria concurrencia que medir.
    pool = new Pool({ connectionString: DSN, max: 8 });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cert_stripe_eventos (
        stripe_event_id text PRIMARY KEY,
        event_type text NOT NULL,
        status text NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now()
      )`);
  });

  afterAll(async () => {
    await pool?.query("DROP TABLE IF EXISTS cert_stripe_eventos");
    await pool?.end();
  });

  beforeEach(async () => { await pool.query("TRUNCATE cert_stripe_eventos"); });

  it("el SQL de esta prueba SIGUE siendo el de la ruta", async () => {
    // La advertencia de arriba —«copiado tal cual; si divergen, esto deja de
    // valer»— no vale como comentario: se comprueba. Si alguien cambia el
    // reclamo en la ruta y no aqui, estas diez pruebas seguirian en verde
    // certificando una consulta que ya no existe.
    const { readFileSync, existsSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    // Se busca hacia arriba desde el directorio de trabajo en vez de resolver
    // contra `import.meta.url`: bajo vitest ese URL no siempre es la ruta real
    // del fichero en disco, y `readFileSync` fallaba con ENOENT — un ENOENT que
    // habria dejado esta comprobacion en rojo permanente y acabaria desactivada.
    const RELATIVA = "apps/web/src/app/api/webhooks/stripe/route.ts";
    let base = process.cwd();
    let encontrada = "";
    for (let i = 0; i < 6 && !encontrada; i++) {
      const intento = resolve(base, RELATIVA);
      if (existsSync(intento)) encontrada = intento;
      base = resolve(base, "..");
    }
    expect(encontrada, "no se encontro la ruta del webhook de Stripe").not.toBe("");
    const ruta = readFileSync(encontrada, "utf8");

    // Se compara la FORMA, con el nombre de tabla neutralizado y sin espacios:
    // la tabla de certificacion se llama distinto a proposito para no tocar la
    // de verdad.
    const forma = (sql: string) => sql
      .replace(/cert_stripe_eventos|stripe_webhook_events/g, "T")
      .replace(/\s+/g, " ")
      .trim();

    const enLaRuta = ruta.slice(ruta.indexOf("INSERT INTO stripe_webhook_events"));
    expect(forma(enLaRuta).startsWith(forma(RECLAMO))).toBe(true);
  });

  it("EL CONTROL: un evento nuevo SI se reclama", async () => {
    // Sin esto, un reclamo que rechazara siempre aprobaria todo lo de abajo — y
    // NELVYON dejaria de procesar cobros sin que nada lo dijera.
    expect(await reclamar("evt_1")).toBe(true);
  });

  it("replay: el mismo evento reenviado no se procesa dos veces", async () => {
    expect(await reclamar("evt_1")).toBe(true);
    await pool.query("UPDATE cert_stripe_eventos SET status='processed'");
    expect(await reclamar("evt_1")).toBe(false);
  });

  it("estado terminal: `processed` no se reclama NUNCA mas", async () => {
    await reclamar("evt_1");
    await pool.query("UPDATE cert_stripe_eventos SET status='processed'");
    // Ni ahora, ni dentro de un ano: el `NOT IN ('processed')` no caduca.
    await pool.query(
      "UPDATE cert_stripe_eventos SET received_at = now() - INTERVAL '365 days'");
    expect(await reclamar("evt_1")).toBe(false);
  });

  it("duplicados simultaneos: exactamente UN ganador", async () => {
    // La prueba que de verdad importa. Ocho entregas a la vez sobre conexiones
    // distintas: se solapan de verdad, no una detras de otra.
    const veredictos = await Promise.all(
      Array.from({ length: 8 }, () => reclamar("evt_carrera")));
    expect(veredictos.filter(Boolean)).toHaveLength(1);
  });

  it("atasco: un `processing` colgado se recupera pasados 10 minutos", async () => {
    // Sin esta rama, un proceso que muriera a mitad dejaria el evento reclamado
    // para siempre y ese cobro no se aplicaria jamas.
    expect(await reclamar("evt_1")).toBe(true);
    expect(await reclamar("evt_1")).toBe(false);   // aun fresco: no se toca

    await pool.query(
      "UPDATE cert_stripe_eventos SET received_at = now() - INTERVAL '11 minutes'");
    expect(await reclamar("evt_1")).toBe(true);
  });

  it("un `processing` reciente NO se roba", async () => {
    // El otro lado del atasco: si la ventana fuera demasiado corta, dos
    // instancias procesarian el mismo cobro a la vez.
    await reclamar("evt_1");
    await pool.query(
      "UPDATE cert_stripe_eventos SET received_at = now() - INTERVAL '9 minutes'");
    expect(await reclamar("evt_1")).toBe(false);
  });

  it("un evento fallido SI se reintenta", async () => {
    // `failed` no es terminal: el reintento de Stripe tiene que poder recogerlo.
    await reclamar("evt_1");
    await pool.query("UPDATE cert_stripe_eventos SET status='failed'");
    expect(await reclamar("evt_1")).toBe(true);
  });

  it("aislamiento: eventos distintos no se estorban", async () => {
    const veredictos = await Promise.all(
      ["evt_a", "evt_b", "evt_c", "evt_d"].map((id) => reclamar(id)));
    expect(veredictos).toEqual([true, true, true, true]);
  });

  it("el tipo de evento se actualiza al re-reclamar, y no se pierde", async () => {
    await reclamar("evt_1", "invoice.paid");
    await pool.query("UPDATE cert_stripe_eventos SET status='failed'");
    await reclamar("evt_1", "invoice.payment_failed");

    const r = await pool.query<{ event_type: string }>(
      "SELECT event_type FROM cert_stripe_eventos WHERE stripe_event_id='evt_1'");
    expect(r.rows[0]?.event_type).toBe("invoice.payment_failed");
  });

  it("EL CONTROL DEL DEFECTO: leer-luego-escribir SI dejaba pasar dos", async () => {
    // Para saber que la prueba de concurrencia distingue una forma de otra, se
    // reproduce la forma ingenua —SELECT y luego INSERT— y se comprueba que
    // ESA si deja pasar mas de uno. Sin este control, «exactamente un ganador»
    // podria estar midiendo la suerte del planificador.
    const ingenuo = async (id: string): Promise<boolean> => {
      const c = await pool.connect();
      try {
        const hay = await c.query(
          "SELECT 1 FROM cert_stripe_eventos WHERE stripe_event_id=$1", [id]);
        if (hay.rows.length > 0) return false;
        // La ventana: entre el SELECT y el INSERT caben los demas.
        await new Promise((r) => setTimeout(r, 25));
        await c.query(
          "INSERT INTO cert_stripe_eventos (stripe_event_id, event_type, status)"
          + " VALUES ($1,'invoice.paid','processing') ON CONFLICT DO NOTHING", [id]);
        return true;
      } finally {
        c.release();
      }
    };

    const veredictos = await Promise.all(
      Array.from({ length: 8 }, () => ingenuo("evt_ingenuo")));
    expect(veredictos.filter(Boolean).length).toBeGreaterThan(1);
  });
});
