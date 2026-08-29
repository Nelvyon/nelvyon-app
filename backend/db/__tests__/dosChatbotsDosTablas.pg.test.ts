/**
 * DOS SISTEMAS DE CHATBOT, DOS TABLAS.
 *
 * EL DEFECTO QUE ESTO ARREGLA, y no era «faltan columnas».
 *
 * En NELVYON conviven dos subsistemas de chatbot que nunca debieron compartir
 * tabla. El legado (TypeScript) guarda los bots en `chatbot_configs` por
 * usuario; el de inquilino (Python) los guarda en `chatbots` por workspace, con
 * RLS. La migración 051 creó `chatbot_conversations` con la forma del legado y
 * la 507 la volvió a declarar con la forma de inquilino usando
 * `CREATE TABLE IF NOT EXISTS` — que sobre una tabla existente no hace nada y
 * no avisa.
 *
 * Resultado: durante meses el subsistema por inquilino escribía contra seis
 * columnas que no existían. Y no se podía arreglar añadiéndolas, porque la
 * clave ajena apuntaba a `chatbot_configs` y sus bots viven en `chatbots`: la
 * clave ajena habría rechazado cada fila.
 *
 * QUÉ COMPRUEBA ESTA PRUEBA, y por qué así. No comprueba que las columnas
 * existan —eso lo diría cualquier consulta al catálogo— sino que
 * **LAS CONSULTAS REALES DEL SERVICIO SE EJECUTAN**. Son las mismas de
 * `backend/services/chatbot_service.py`, copiadas. Una prueba que consulta el
 * catálogo demostraría que la tabla tiene la forma que yo digo; ésta demuestra
 * que tiene la forma que el código necesita, que es otra cosa.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 991001;
const OTRO_WS = 991002;

let pool: pg.Pool;
let botId: string;
let botAjenoId: string;

conBase("dos sistemas de chatbot, dos tablas", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 4 });
    const { rows } = await pool.query(
      `SELECT to_regclass('public.workspace_chatbot_conversations') t`,
    );
    if (!rows[0].t) throw new Error("falta la migración 587 en la base de pruebas");
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  async function limpiar(): Promise<void> {
    for (const ws of [WS, OTRO_WS]) {
      await pool.query(
        `DELETE FROM workspace_chatbot_conversations WHERE workspace_id = $1`, [ws],
      );
      await pool.query(`DELETE FROM chatbots WHERE workspace_id = $1`, [ws]);
    }
  }

  async function crearBot(ws: number): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO chatbots (workspace_id, name, config, embed_token)
       VALUES ($1, 'bot de prueba', '{}'::jsonb, gen_random_uuid())
       RETURNING id`,
      [ws],
    );
    return rows[0].id;
  }

  afterEach(limpiar);

  // ═══════════════════════════════════════════════════════════════════════
  describe("las consultas REALES del servicio se ejecutan", () => {
    beforeAll(async () => {
      await limpiar();
    });

    it("la que CREA una conversación (chatbot_service.py:466)", async () => {
      botId = await crearBot(WS);
      await expect(
        pool.query(
          `INSERT INTO workspace_chatbot_conversations (
             chatbot_id, workspace_id, session_id, visitor_info, messages
           )
           VALUES (CAST($1 AS uuid), $2, $3, CAST($4 AS jsonb), '[]'::jsonb)
           RETURNING *`,
          [botId, WS, "sesion-1", JSON.stringify({ nombre: "Ana" })],
        ),
        "la consulta que crea una conversación sigue sin poder ejecutarse",
      ).resolves.toBeDefined();
    });

    it("la que ACTUALIZA tras cada mensaje (chatbot_service.py:363)", async () => {
      botId = await crearBot(WS);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO workspace_chatbot_conversations
           (chatbot_id, workspace_id, session_id) VALUES ($1::uuid, $2, 'sesion-2')
         RETURNING id`,
        [botId, WS],
      );
      await expect(
        pool.query(
          `UPDATE workspace_chatbot_conversations
              SET messages = CAST($1 AS jsonb),
                  visitor_info = CAST($2 AS jsonb),
                  lead_captured = $3,
                  escalated = $4,
                  last_message_at = NOW()
            WHERE id = CAST($5 AS uuid)`,
          ["[]", "{}", true, false, rows[0].id],
        ),
      ).resolves.toBeDefined();
    });

    it("la del PANEL, con el FILTER que antes era un error de tipos", async () => {
      // `FILTER (WHERE conv.lead_captured)` exige una columna BOOLEANA. En el
      // legado `captured_lead` es JSONB, así que este FILTER lanzaba. Es el
      // fallo que el parche anterior no vio porque estaba mirando el nombre.
      botId = await crearBot(WS);
      await pool.query(
        `INSERT INTO workspace_chatbot_conversations
           (chatbot_id, workspace_id, session_id, lead_captured)
         VALUES ($1::uuid, $2, 'sesion-3', TRUE)`,
        [botId, WS],
      );

      const { rows } = await pool.query<{ leads_captured: string; conversations_total: string }>(
        `SELECT COUNT(conv.id) FILTER (WHERE conv.started_at >= NOW() - interval '1 day') AS conversations_today,
                COUNT(conv.id) AS conversations_total,
                COUNT(conv.id) FILTER (WHERE conv.lead_captured) AS leads_captured
           FROM chatbots c
           LEFT JOIN workspace_chatbot_conversations conv ON conv.chatbot_id = c.id
          WHERE c.workspace_id = $1
          GROUP BY c.id`,
        [WS],
      );
      expect(Number(rows[0].leads_captured)).toBe(1);
      expect(Number(rows[0].conversations_total)).toBe(1);
    });

    it("la del PERFIL UNIFICADO (cdp_service.py:303)", async () => {
      botId = await crearBot(WS);
      await pool.query(
        `INSERT INTO workspace_chatbot_conversations
           (chatbot_id, workspace_id, session_id, visitor_info)
         VALUES ($1::uuid, $2, 'sesion-4', '{"email":"ana@ejemplo.es"}'::jsonb)`,
        [botId, WS],
      );
      const { rows } = await pool.query<{ n: string }>(
        `SELECT COUNT(*) AS n FROM workspace_chatbot_conversations
          WHERE workspace_id = $1
            AND lower(COALESCE(visitor_info->>'email', '')) = $2`,
        [WS, "ana@ejemplo.es"],
      );
      expect(Number(rows[0].n)).toBe(1);
    });

    it("la de AFINADO, que lee los mensajes (finetuning_service.py:232)", async () => {
      botId = await crearBot(WS);
      await pool.query(
        `INSERT INTO workspace_chatbot_conversations
           (chatbot_id, workspace_id, session_id, messages)
         VALUES ($1::uuid, $2, 'sesion-5', '[{"rol":"usuario"}]'::jsonb)`,
        [botId, WS],
      );
      const { rows } = await pool.query(
        `SELECT messages FROM workspace_chatbot_conversations WHERE workspace_id = $1`,
        [WS],
      );
      expect(rows).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("lo que la tabla IMPIDE", () => {
    it("un bot que no existe NO puede tener conversación", async () => {
      // La clave ajena. Es lo que hacía imposible arreglar el defecto añadiendo
      // columnas a la tabla del legado: apuntaba a `chatbot_configs`.
      await expect(
        pool.query(
          `INSERT INTO workspace_chatbot_conversations
             (chatbot_id, workspace_id, session_id)
           VALUES (gen_random_uuid(), $1, 'huerfana')`,
          [WS],
        ),
      ).rejects.toThrow();
    });

    it("la misma sesión no abre dos conversaciones", async () => {
      // Sin esto, un visitante que recarga la página parte su historial en dos.
      botId = await crearBot(WS);
      await pool.query(
        `INSERT INTO workspace_chatbot_conversations (chatbot_id, workspace_id, session_id)
         VALUES ($1::uuid, $2, 'repetida')`,
        [botId, WS],
      );
      await expect(
        pool.query(
          `INSERT INTO workspace_chatbot_conversations (chatbot_id, workspace_id, session_id)
           VALUES ($1::uuid, $2, 'repetida')`,
          [botId, WS],
        ),
      ).rejects.toThrow();
    });

    it("una satisfacción fuera de escala no se guarda", async () => {
      botId = await crearBot(WS);
      await expect(
        pool.query(
          `INSERT INTO workspace_chatbot_conversations
             (chatbot_id, workspace_id, session_id, satisfaction)
           VALUES ($1::uuid, $2, 'mal-valorada', 9)`,
          [botId, WS],
        ),
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("el subsistema LEGADO sigue intacto", () => {
    it("`chatbot_conversations` conserva su forma", async () => {
      // La migración es aditiva. Si al arreglar el subsistema por inquilino se
      // hubiera tocado el legado, se habría cambiado un defecto por otro.
      const { rows } = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name='chatbot_conversations'`,
      );
      const tiene = new Set(rows.map((r) => r.column_name));
      expect(tiene.has("captured_lead"), "el legado ha perdido captured_lead").toBe(true);
      expect(tiene.has("created_at")).toBe(true);
      // Y NO se le han añadido las del otro subsistema.
      expect(tiene.has("workspace_id"), "se han mezclado las dos formas").toBe(false);
    });

    it("y su clave ajena sigue apuntando a chatbot_configs", async () => {
      const { rows } = await pool.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='chatbot_conversations'::regclass AND contype='f'`,
      );
      expect(rows.some((r) => r.def.includes("chatbot_configs"))).toBe(true);
    });

    it("y la nueva apunta a chatbots, que es la corrección", async () => {
      const { rows } = await pool.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='workspace_chatbot_conversations'::regclass AND contype='f'`,
      );
      expect(
        rows.some((r) => r.def.includes("chatbots(")),
        "si apuntara a chatbot_configs estaríamos repitiendo el defecto con otro nombre",
      ).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("aislamiento por inquilino", () => {
    it("la tabla nueva tiene RLS", async () => {
      const { rows } = await pool.query<{ rls: boolean }>(
        `SELECT c.relrowsecurity AS rls FROM pg_class c
           JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relname='workspace_chatbot_conversations'`,
      );
      expect(rows[0].rls).toBe(true);
    });

    it("y un índice que empieza por workspace_id", async () => {
      // Toda consulta filtra por inquilino, porque RLS lo impone. Sin índice,
      // cada lectura recorre las conversaciones de todos los clientes.
      const { rows } = await pool.query<{ primera: string }>(
        `SELECT a.attname AS primera
           FROM pg_index i
           JOIN pg_class pc ON pc.oid = i.indrelid
           JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
          WHERE pc.relname = 'workspace_chatbot_conversations'`,
      );
      expect(rows.some((r) => r.primera === "workspace_id")).toBe(true);
    });

    it("las conversaciones de un inquilino no se cuentan en las de otro", async () => {
      botId = await crearBot(WS);
      botAjenoId = await crearBot(OTRO_WS);
      await pool.query(
        `INSERT INTO workspace_chatbot_conversations (chatbot_id, workspace_id, session_id)
         VALUES ($1::uuid, $2, 'mia'), ($3::uuid, $4, 'ajena')`,
        [botId, WS, botAjenoId, OTRO_WS],
      );
      const { rows } = await pool.query<{ n: string }>(
        `SELECT COUNT(*) AS n FROM workspace_chatbot_conversations WHERE workspace_id = $1`,
        [WS],
      );
      expect(Number(rows[0].n)).toBe(1);
    });
  });
});
