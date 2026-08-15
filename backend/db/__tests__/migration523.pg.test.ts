import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Certificación de la migración 523 y del claim de idempotencia Stripe contra
 * PostgreSQL REAL.
 *
 * POR QUÉ NO BASTA EL DOBLE UNITARIO
 * ----------------------------------
 * Los negativos de Stripe certifican el claim contra un doble que reproduce la
 * semántica del `ON CONFLICT`. Eso demuestra que la RUTA se comporta bien dado
 * un motor que respeta la sentencia; no demuestra que PostgreSQL resuelva la
 * carrera sobre el índice único. Esa parte solo se puede probar con dos
 * conexiones reales compitiendo de verdad, y es lo que hace este fichero.
 *
 * EL SQL SE LEE DEL FICHERO DE PRODUCCIÓN
 * ---------------------------------------
 * Ni el claim ni el upsert se copian aquí. Se extraen de `route.ts` y de
 * `webhookHandler.ts` en tiempo de ejecución. Así el test no puede divergir en
 * silencio del código real, y una mutación sobre producción cambia
 * inmediatamente lo que PostgreSQL ejecuta — que es lo que hace que el mutation
 * testing signifique algo.
 *
 * CÓMO SE EJECUTA
 *   docker compose -f backend/local-ai/docker-compose.yml up -d postgres
 *   # crear una base desechable y aplicar backend/db/migrations con
 *   #   DATABASE_URL=... node scripts/migrate-pg.mjs
 *   MIG523_TEST_DATABASE_URL='postgres://<rol>:<pass>@127.0.0.1:5434/<db_test>' \
 *     pnpm -C apps/web exec vitest run ../../backend/db/__tests__/migration523.pg.test.ts
 *
 * Sin esa variable el fichero no corre. No es un skip que tape un fallo: sin
 * base real no hay nada que certificar, y ninguna otra suite depende de Docker.
 * La credencial llega por entorno; aquí no hay ninguna escrita.
 */
import { Client, Pool } from "pg";

const URL_TEST = process.env.MIG523_TEST_DATABASE_URL?.trim();
const describeSiHayDb = URL_TEST ? describe : describe.skip;

const RAIZ = path.resolve(__dirname, "..", "..", "..");
const RUTA_WEBHOOK = path.join(RAIZ, "apps", "web", "src", "app", "api", "webhooks", "stripe", "route.ts");
const HANDLER = path.join(RAIZ, "backend", "stripe", "webhookHandler.ts");

/** Extrae el template literal que contiene `marcador` del fichero indicado. */
function sqlDeProduccion(fichero: string, marcador: string): string {
  const src = fs.readFileSync(fichero, "utf8");
  const i = src.indexOf(marcador);
  if (i < 0) throw new Error(`no se encontró "${marcador}" en ${fichero}`);
  const abre = src.lastIndexOf("`", i);
  const cierra = src.indexOf("`", i);
  if (abre < 0 || cierra < 0) throw new Error(`no se pudo delimitar el SQL de "${marcador}"`);
  return src.slice(abre + 1, cierra);
}

const SQL_CLAIM = () => sqlDeProduccion(RUTA_WEBHOOK, "INSERT INTO stripe_webhook_events");
const SQL_UPSERT = () => sqlDeProduccion(HANDLER, "INSERT INTO subscriptions");

/**
 * Identidad fresca por caso. Deliberadamente aleatoria y no un patrón fijo:
 * `subscriptions.user_id` es UNIQUE, y unos UUID fijos chocarían con cualquier
 * fila que ya viva en la base de test — el propio test fallaría por colisión de
 * fixture y no por la propiedad que quiere certificar.
 */
const U = () => crypto.randomUUID();

describeSiHayDb("523 + PostgreSQL real", () => {
  let cli: Client;
  const sufijo = `cert_${process.pid}_${Math.floor(Math.random() * 1e6)}`;
  const creados: string[] = [];

  beforeAll(async () => {
    cli = new Client({ connectionString: URL_TEST });
    await cli.connect();
    // Precondición explícita: si las migraciones no están aplicadas, este
    // fichero debe fallar diciendo por qué, no certificar sobre un esquema a medias.
    const m = await cli.query("SELECT 1 FROM _migrations WHERE name = '523_subscriptions_stripe_event_recency.sql'");
    expect(m.rowCount, "la migración 523 debe estar aplicada en la base de test").toBe(1);
  }, 60_000);

  afterAll(async () => {
    if (!cli) return;
    await cli.query("DELETE FROM stripe_webhook_events WHERE stripe_event_id LIKE $1", [`%${sufijo}%`]).catch(() => {});
    if (creados.length) {
      await cli.query("DELETE FROM subscriptions WHERE user_id = ANY($1::uuid[])", [creados]).catch(() => {});
    }
    await cli.end();
  });

  // ---------------------------------------------------------------- esquema
  describe("esquema resultante, leído del catálogo (no del SQL declarado)", () => {
    it("las dos columnas existen, son NULLABLE y sin default", async () => {
      const r = await cli.query(
        `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
          WHERE table_name='subscriptions' AND column_name LIKE 'last_stripe_event%'
          ORDER BY column_name`,
      );
      expect(r.rows).toHaveLength(2);
      const at = r.rows.find((x) => x.column_name === "last_stripe_event_at");
      const id = r.rows.find((x) => x.column_name === "last_stripe_event_id");
      expect(at.data_type).toBe("timestamp with time zone");
      expect(id.data_type).toBe("text");
      // Nullable es deliberado: las filas preexistentes quedan sin evento
      // aplicado y la guarda trata NULL como "nunca aplicado".
      for (const c of r.rows) {
        expect(c.is_nullable).toBe("YES");
        expect(c.column_default).toBeNull();
      }
    });

    it("523 NO introduce constraints: la invariante vive en la sentencia, no en el esquema", async () => {
      // Se afirma explícitamente para que quede constancia. Si alguien añadiese
      // un NOT NULL o un CHECK a estas columnas sin migración, este test lo ve.
      const r = await cli.query(
        `SELECT c.conname, pg_get_constraintdef(c.oid) AS def
           FROM pg_constraint c
          WHERE c.conrelid = 'subscriptions'::regclass
            AND pg_get_constraintdef(c.oid) ILIKE '%last_stripe_event%'`,
      );
      expect(r.rows).toEqual([]);
    });

    it("el árbitro del ON CONFLICT (user_id) existe de verdad en el catálogo", async () => {
      // Sin un índice único sobre user_id, el upsert de 523 no compila siquiera.
      // Se comprueba en pg_catalog, no deduciéndolo de la migración 256.
      const r = await cli.query(
        `SELECT i.relname, ix.indisunique
           FROM pg_index ix
           JOIN pg_class i ON i.oid = ix.indexrelid
          WHERE ix.indrelid = 'subscriptions'::regclass AND ix.indisunique
            AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
                   FROM pg_attribute a
                  WHERE a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)) = ARRAY['user_id']`,
      );
      expect(r.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("los comentarios de trazabilidad quedaron aplicados", async () => {
      const r = await cli.query(
        `SELECT a.attname, col_description(a.attrelid, a.attnum) AS c
           FROM pg_attribute a
          WHERE a.attrelid='subscriptions'::regclass AND a.attname LIKE 'last_stripe_event%'`,
      );
      for (const row of r.rows) expect(row.c, `${row.attname} sin comentario`).toBeTruthy();
    });
  });

  // ------------------------------------------- invariante real: la recencia
  describe("guarda de recencia — SQL de producción contra PostgreSQL real", () => {
    async function upsert(userId: string, plan: string, status: string, eventAt: Date, eventId: string) {
      return cli.query(SQL_UPSERT(), [userId, `sub_${userId.slice(0, 8)}`, `cus_${userId.slice(0, 8)}`, plan, status, null, false, eventAt, eventId]);
    }
    const T1 = new Date("2026-01-01T00:00:00Z"); // antiguo
    const T2 = new Date("2026-06-01T00:00:00Z"); // reciente

    it("orden correcto T1 -> T2: gana T2", async () => {
      const u = U(); creados.push(u);
      await upsert(u, "agency", "active", T1, "evt_t1");
      await upsert(u, "starter", "active", T2, "evt_t2");
      const r = await cli.query("SELECT plan, last_stripe_event_id FROM subscriptions WHERE user_id=$1", [u]);
      expect(r.rows[0].plan).toBe("starter");
      expect(r.rows[0].last_stripe_event_id).toBe("evt_t2");
    });

    it("fuera de orden T2 -> T1: PostgreSQL rechaza el antiguo, el estado sigue en T2", async () => {
      const u = U(); creados.push(u);
      await upsert(u, "starter", "active", T2, "evt_t2");
      const res = await upsert(u, "agency", "active", T1, "evt_t1");
      // La propia sentencia no afecta ninguna fila: no hay SELECT-comparar-UPDATE.
      expect(res.rowCount).toBe(0);
      const r = await cli.query("SELECT plan, last_stripe_event_id FROM subscriptions WHERE user_id=$1", [u]);
      // Si esto fallase, el usuario recuperaría un plan que ya no paga.
      expect(r.rows[0].plan).toBe("starter");
      expect(r.rows[0].last_stripe_event_id).toBe("evt_t2");
    });

    it("una cancelación reciente no revive con un 'active' antiguo", async () => {
      const u = U(); creados.push(u);
      await upsert(u, "starter", "canceled", T2, "evt_cancel");
      await upsert(u, "starter", "active", T1, "evt_old_active");
      const r = await cli.query("SELECT status FROM subscriptions WHERE user_id=$1", [u]);
      expect(r.rows[0].status).toBe("canceled");
    });

    it("empate exacto de timestamp: NO degrada el estado ya aplicado", async () => {
      // Politica documentada en 523: Stripe puede emitir varios eventos en el
      // mismo segundo y `evt_...` no es cronológico, así que ante empate se
      // conserva lo escrito en vez de inventar un orden.
      const u = U(); creados.push(u);
      await upsert(u, "starter", "active", T2, "evt_primero");
      const res = await upsert(u, "agency", "active", T2, "evt_segundo_mismo_ts");
      expect(res.rowCount).toBe(0);
      const r = await cli.query("SELECT plan, last_stripe_event_id FROM subscriptions WHERE user_id=$1", [u]);
      expect(r.rows[0].plan).toBe("starter");
      expect(r.rows[0].last_stripe_event_id).toBe("evt_primero");
    });

    it("fila preexistente con NULL: el primer evento posterior a la migración entra", async () => {
      // Retrocompatibilidad declarada por 523. Se construye la fila legacy a
      // mano, sin las columnas nuevas, como quedaron las de producción.
      const u = U(); creados.push(u);
      await cli.query(
        `INSERT INTO subscriptions (user_id, plan, status, cancel_at_period_end)
         VALUES ($1,'free','inactive',false)`, [u],
      );
      const res = await upsert(u, "agency", "active", T1, "evt_primero_tras_migracion");
      expect(res.rowCount).toBe(1);
      const r = await cli.query("SELECT plan FROM subscriptions WHERE user_id=$1", [u]);
      expect(r.rows[0].plan).toBe("agency");
    });
  });

  // ------------------------------------------------------ fail cases reales
  describe("PostgreSQL hace cumplir las invariantes de las que 523 depende", () => {
    it("user_id duplicado viola el UNIQUE que arbitra el ON CONFLICT (23505)", async () => {
      const u = U(); creados.push(u);
      await cli.query(
        `INSERT INTO subscriptions (user_id, plan, status, cancel_at_period_end) VALUES ($1,'free','inactive',false)`, [u],
      );
      // Sin ON CONFLICT, el segundo insert debe reventar. Si no lo hiciera, el
      // upsert de 523 no tendría árbitro y la recencia no sería aplicable.
      await expect(
        cli.query(`INSERT INTO subscriptions (user_id, plan, status, cancel_at_period_end) VALUES ($1,'free','inactive',false)`, [u]),
      ).rejects.toMatchObject({ code: "23505" });
    });

    it("stripe_event_id duplicado viola el UNIQUE que arbitra el claim (23505)", async () => {
      const id = `evt_uq_${sufijo}`;
      await cli.query(`INSERT INTO stripe_webhook_events (stripe_event_id, event_type) VALUES ($1,'t')`, [id]);
      await expect(
        cli.query(`INSERT INTO stripe_webhook_events (stripe_event_id, event_type) VALUES ($1,'t')`, [id]),
      ).rejects.toMatchObject({ code: "23505" });
    });

    it("user_id NULL viola el NOT NULL (23502)", async () => {
      await expect(
        cli.query(`INSERT INTO subscriptions (user_id, plan, status, cancel_at_period_end) VALUES (NULL,'free','inactive',false)`),
      ).rejects.toMatchObject({ code: "23502" });
    });

    it("un timestamp inválido en last_stripe_event_at es rechazado por el tipo (22007)", async () => {
      const u = U(); creados.push(u);
      await expect(
        cli.query(
          `INSERT INTO subscriptions (user_id, plan, status, cancel_at_period_end, last_stripe_event_at)
           VALUES ($1,'free','inactive',false,'no-es-una-fecha')`, [u],
        ),
      ).rejects.toMatchObject({ code: "22007" });
    });
  });

  // ------------------------------------------ carrera real del claim Stripe
  describe("claim de idempotencia — carrera real sobre el índice único", () => {
    /** Ejecuta el claim de producción en una conexión propia, como hace la ruta. */
    async function claimEnConexionPropia(pool: Pool, eventId: string) {
      const c = await pool.connect();
      try {
        const r = await c.query(SQL_CLAIM(), [eventId, "customer.subscription.updated"]);
        return r.rowCount ?? 0;
      } finally {
        c.release();
      }
    }

    it("el índice único que sustenta el claim existe en el catálogo", async () => {
      const r = await cli.query(
        `SELECT i.relname FROM pg_index ix JOIN pg_class i ON i.oid = ix.indexrelid
          WHERE ix.indrelid='stripe_webhook_events'::regclass AND ix.indisunique
            AND (SELECT array_agg(a.attname::text) FROM pg_attribute a
                  WHERE a.attrelid=ix.indrelid AND a.attnum = ANY(ix.indkey)) = ARRAY['stripe_event_id']`,
      );
      expect(r.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("dos claims concurrentes con conexiones independientes: exactamente uno gana", async () => {
      const pool = new Pool({ connectionString: URL_TEST, max: 4 });
      try {
        const id = `evt_race2_${sufijo}`;
        // Sin await entre medias: compiten de verdad en el servidor. La
        // serialización la impone PostgreSQL sobre el índice único, no el test.
        const [a, b] = await Promise.all([
          claimEnConexionPropia(pool, id),
          claimEnConexionPropia(pool, id),
        ]);
        expect(a + b).toBe(1);
        const r = await cli.query("SELECT count(*)::int AS n FROM stripe_webhook_events WHERE stripe_event_id=$1", [id]);
        expect(r.rows[0].n).toBe(1); // una sola fila, no dos
      } finally {
        await pool.end();
      }
    });

    it("un evento ya 'processed' no puede reclamarse otra vez", async () => {
      const id = `evt_done_${sufijo}`;
      const primero = await cli.query(SQL_CLAIM(), [id, "t"]);
      expect(primero.rowCount).toBe(1);
      await cli.query(`UPDATE stripe_webhook_events SET status='processed', processed_at=now() WHERE stripe_event_id=$1`, [id]);
      const replay = await cli.query(SQL_CLAIM(), [id, "t"]);
      expect(replay.rowCount).toBe(0);
    });

    it("un 'processing' colgado más de 10 minutos SÍ se libera (recuperación deliberada)", async () => {
      // Sin esta rama, un proceso que muera a mitad dejaría el evento
      // bloqueado para siempre. Es parte de la semántica, no un agujero.
      const id = `evt_stale_${sufijo}`;
      await cli.query(SQL_CLAIM(), [id, "t"]);
      await cli.query(`UPDATE stripe_webhook_events SET received_at = now() - INTERVAL '11 minutes' WHERE stripe_event_id=$1`, [id]);
      const recuperado = await cli.query(SQL_CLAIM(), [id, "t"]);
      expect(recuperado.rowCount).toBe(1);
    });

    it("20 claims concurrentes sobre el mismo event.id: un único ganador", async () => {
      const pool = new Pool({ connectionString: URL_TEST, max: 20 });
      try {
        const id = `evt_race20_${sufijo}`;
        const resultados = await Promise.all(
          Array.from({ length: 20 }, () => claimEnConexionPropia(pool, id)),
        );
        const ganadores = resultados.filter((n) => n === 1).length;
        expect(ganadores).toBe(1);
        expect(resultados.filter((n) => n === 0)).toHaveLength(19);
        const r = await cli.query("SELECT count(*)::int AS n FROM stripe_webhook_events WHERE stripe_event_id=$1", [id]);
        expect(r.rows[0].n).toBe(1);
      } finally {
        await pool.end();
      }
    }, 60_000);
  });
});
