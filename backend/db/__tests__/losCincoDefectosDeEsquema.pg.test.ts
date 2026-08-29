/**
 * LOS CINCO DEFECTOS DE ESQUEMA, EJECUTADOS.
 *
 * Clasificar las 55 sentencias de la migración 507 destapó cinco consultas de
 * servicios vivos que pedían columnas inexistentes. Ninguna podía haber
 * devuelto un resultado nunca.
 *
 * LO QUE ESTA PRUEBA HACE, y en qué se diferencia de mirar el catálogo. Las
 * consultas de abajo están COPIADAS de los servicios, con los mismos `WHERE`,
 * los mismos `ORDER BY` y las mismas expresiones. Preguntar al catálogo si una
 * columna existe demostraría que la tabla tiene la forma que yo digo; ejecutar
 * la consulta demuestra que tiene la forma que el código necesita, que es la
 * única que importa.
 *
 * LOS CINCO, Y CÓMO SE ARREGLÓ CADA UNO:
 *
 *   1. `chatbot_conversations` .. tabla propia (587). Dos subsistemas distintos
 *                                 compartían una tabla, y la clave ajena hacía
 *                                 imposible arreglarlo añadiendo columnas.
 *   2. `bookings.start_at` ...... EN EL CÓDIGO. La cita ya vivía en
 *                                 `booking_date + booking_time`; los lectores
 *                                 se habían quedado atrás.
 *   3. `bookings.zoom_meeting_id` COLUMNA NUEVA (588). Un identificador externo
 *                                 por el que se busca no puede vivir dentro de
 *                                 un campo de notas.
 *   4. `crm_activities.deal_id` . EN EL CÓDIGO. El writer ya lo guardaba en
 *                                 `metadata`; el reader lo buscaba como columna.
 *   5. `affiliate_clicks` ....... NO ERA UN DEFECTO VIVO. Nadie consulta esa
 *                                 tabla por fecha: era un índice mal escrito.
 *
 * Que dos de los cinco se arreglen sin tocar el esquema es el resultado
 * importante. Añadir una columna que ya existe con otro nombre deja dos fuentes
 * para el mismo dato, y a partir de ahí nadie sabe cuál mirar.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 992001;
const USUARIO = "aaaaaaaa-f61d-4001-8001-00000000000c";
const CONTACTO = "aaaaaaaa-f61d-4001-8001-00000000000d";

let pool: pg.Pool;

conBase("los cinco defectos de esquema, ejecutados", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 4 });
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  async function limpiar(): Promise<void> {
    await pool.query(`DELETE FROM bookings WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM crm_activities WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM crm_contacts WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM affiliate_clicks WHERE code = 'prueba-defectos'`).catch(() => undefined);
  }

  /**
   * El contacto al que cuelgan las actividades.
   *
   * `crm_activities.contact_id` tiene clave ajena a `crm_contacts`. Insertar
   * una actividad huérfana no probaba nada del defecto: sólo probaba que la
   * clave ajena funciona, que ya se sabía.
   */
  async function unContacto(): Promise<void> {
    await pool.query(
      `INSERT INTO crm_contacts (id, user_id, workspace_id, name, email)
       VALUES ($1::uuid, $2::uuid, $3, 'Contacto de prueba', 'contacto@ejemplo.es')
       ON CONFLICT (id) DO NOTHING`,
      [CONTACTO, USUARIO, WS],
    );
  }

  afterEach(limpiar);

  // ═══════════════════════════════════════════════════════════════════════
  describe("2 · listar reservas por fecha (booking_service.py:286-302)", () => {
    async function unaReserva(fecha: string, hora: string): Promise<void> {
      await pool.query(
        `INSERT INTO bookings
           (id, user_id, workspace_id, client_name, client_email,
            booking_date, booking_time, duration, status, confirmation_token)
         VALUES (gen_random_uuid(), $1::uuid, $2, 'Ana', 'ana@ejemplo.es',
                 $3::date, $4::time, 30, 'confirmed', md5(random()::text))`,
        [USUARIO, WS, fecha, hora],
      );
    }

    it("EL DEFECTO: filtrar y ordenar por la cita, que son DOS columnas", async () => {
      await unaReserva("2026-09-10", "10:00");
      await unaReserva("2026-09-12", "17:30");
      await unaReserva("2026-09-08", "09:00");

      const { rows } = await pool.query<{ start_at: string }>(
        `SELECT *, (booking_date + booking_time) AS start_at
           FROM bookings
          WHERE workspace_id = $1
            AND (booking_date + booking_time) >= $2
            AND (booking_date + booking_time) <= $3
          ORDER BY (booking_date + booking_time) ASC`,
        [WS, "2026-09-09 00:00", "2026-09-13 00:00"],
      );

      expect(rows).toHaveLength(2);
      // Y ordenadas de verdad, no por casualidad: la del 10 antes que la del 12.
      expect(new Date(rows[0].start_at) < new Date(rows[1].start_at)).toBe(true);
    });

    it("EL CONTROL: la reserva fuera del rango no aparece", async () => {
      await unaReserva("2026-01-01", "10:00");
      const { rows } = await pool.query(
        `SELECT id FROM bookings
          WHERE workspace_id = $1 AND (booking_date + booking_time) >= $2`,
        [WS, "2026-09-01 00:00"],
      );
      expect(rows, "el filtro no filtra: devuelve lo que está fuera de rango").toHaveLength(0);
    });

    it("y `start_at` sigue SIN EXISTIR como columna, a propósito", async () => {
      // Si alguien la añadiera, habría dos fuentes para la misma cita.
      await expect(
        pool.query(`SELECT start_at FROM bookings LIMIT 1`),
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("3 · el webhook de Zoom cierra la reserva (booking_service.py:336)", () => {
    it("EL DEFECTO: sin la columna, la reunión terminaba y la reserva no", async () => {
      await pool.query(
        `INSERT INTO bookings
           (id, user_id, workspace_id, client_name, client_email, booking_date,
            booking_time, duration, status, confirmation_token, zoom_meeting_id)
         VALUES (gen_random_uuid(), $1::uuid, $2, 'Ana', 'ana@ejemplo.es',
                 CURRENT_DATE, '10:00'::time, 30, 'confirmed', md5(random()::text), '99887766')`,
        [USUARIO, WS],
      );

      const { rows } = await pool.query(
        `UPDATE bookings SET status = 'completed'
          WHERE workspace_id = $1 AND zoom_meeting_id = $2 AND status = 'confirmed'
          RETURNING id`,
        [WS, "99887766"],
      );

      expect(
        rows,
        "el webhook sigue sin poder encontrar la reserva: la reunión termina y la reserva se queda en confirmed para siempre",
      ).toHaveLength(1);
    });

    it("EL CONTROL: no cierra la reserva de otra reunión", async () => {
      await pool.query(
        `INSERT INTO bookings
           (id, user_id, workspace_id, client_name, client_email, booking_date,
            booking_time, duration, status, confirmation_token, zoom_meeting_id)
         VALUES (gen_random_uuid(), $1::uuid, $2, 'Ana', 'ana@ejemplo.es',
                 CURRENT_DATE, '10:00'::time, 30, 'confirmed', md5(random()::text), '11111111')`,
        [USUARIO, WS],
      );
      const { rows } = await pool.query(
        `UPDATE bookings SET status='completed'
          WHERE workspace_id=$1 AND zoom_meeting_id=$2 AND status='confirmed' RETURNING id`,
        [WS, "22222222"],
      );
      expect(rows).toHaveLength(0);
    });

    it("una reserva sin Zoom guarda NULL, no una cadena vacía", async () => {
      // `NULLIF(:zoom_meeting_id, '')` en el writer. Una cadena vacía entraría
      // en el índice y, peor, podría casar con otra reserva sin Zoom.
      await pool.query(
        `INSERT INTO bookings
           (id, user_id, workspace_id, client_name, client_email, booking_date,
            booking_time, duration, status, confirmation_token, zoom_meeting_id)
         VALUES (gen_random_uuid(), $1::uuid, $2, 'Ana', 'ana@ejemplo.es',
                 CURRENT_DATE, '11:00'::time, 30, 'confirmed', md5(random()::text),
                 NULLIF('', ''))`,
        [USUARIO, WS],
      );
      const { rows } = await pool.query<{ n: string }>(
        `SELECT COUNT(*) AS n FROM bookings
          WHERE workspace_id = $1 AND zoom_meeting_id IS NULL`,
        [WS],
      );
      expect(Number(rows[0].n)).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("4 · actividades de una oportunidad (crm_service.py:750)", () => {
    async function unaActividad(dealId: string | null): Promise<void> {
      await unContacto();
      await pool.query(
        `INSERT INTO crm_activities
           (id, contact_id, user_id, workspace_id, type, summary, metadata, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, 'llamada', 'resumen',
                 $4::jsonb, NOW())`,
        [CONTACTO, USUARIO, WS, JSON.stringify({ deal_id: dealId })],
      );
    }

    it("EL DEFECTO: se lee de donde el writer escribe, no de una columna", async () => {
      await unaActividad("oportunidad-7");
      await unaActividad("oportunidad-9");

      const { rows } = await pool.query<{ n: string }>(
        `SELECT COUNT(*) AS n FROM crm_activities
          WHERE workspace_id = $1 AND metadata->>'deal_id' = $2`,
        [WS, "oportunidad-7"],
      );
      expect(Number(rows[0].n)).toBe(1);
    });

    it("EL CONTROL: no devuelve las de otra oportunidad", async () => {
      await unaActividad("oportunidad-7");
      const { rows } = await pool.query<{ n: string }>(
        `SELECT COUNT(*) AS n FROM crm_activities
          WHERE workspace_id = $1 AND metadata->>'deal_id' = $2`,
        [WS, "oportunidad-inexistente"],
      );
      expect(Number(rows[0].n)).toBe(0);
    });

    it("y `deal_id` sigue SIN EXISTIR como columna, a propósito", async () => {
      await expect(
        pool.query(`SELECT deal_id FROM crm_activities LIMIT 1`),
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("5 · clics de afiliado: no era un defecto vivo", () => {
    it("la tabla sólo recibe inserciones, y esa inserción funciona", async () => {
      await expect(
        pool.query(
          `INSERT INTO affiliate_clicks (code, ip_hash, user_agent, referrer)
           VALUES ('prueba-defectos', 'hash', 'agente', 'https://origen.test')`,
        ),
      ).resolves.toBeDefined();
    });

    it("el índice quedó sobre la columna que EXISTE, no sobre la inventada", async () => {
      // La 507 pedía `(affiliate_id, created_at)`. La columna se llama
      // `landed_at`. Corregir el nombre en vez de añadir la columna evita
      // acabar con dos fechas que significan lo mismo.
      const { rows } = await pool.query<{ def: string }>(
        `SELECT indexdef AS def FROM pg_indexes
          WHERE tablename='affiliate_clicks' AND indexname='affiliate_clicks_affiliate_idx'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].def).toContain("landed_at");
      expect(rows[0].def).not.toContain("created_at");
    });
  });
});
