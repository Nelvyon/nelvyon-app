/**
 * EL ESQUEMA TIENE LO QUE EL CÓDIGO PIDE.
 *
 * De dónde sale esta prueba. Clasificar las 55 sentencias que la migración 507
 * no llega a aplicar destapó cinco consultas de servicios vivos que piden
 * columnas que la base no tiene. Ninguna puede haber devuelto un resultado
 * nunca; la peor pide seis columnas de una tabla que tiene siete, y ninguna de
 * las seis coincide.
 *
 * POR QUÉ NO SE VIO ANTES, que es lo que esta prueba arregla:
 *
 *   · el aplicador de migraciones se tragaba en silencio los fallos de la 507
 *     y la anotaba como aplicada igual;
 *   · las pantallas que usan esas consultas se visitan poco;
 *   · y no había nada que comparase lo que el código pide con lo que la base
 *     tiene. Doce mil pruebas, y ninguna hacía esa pregunta.
 *
 * LO QUE ESTA PRUEBA HACE, y lo que deliberadamente NO hace. Comprueba pares
 * `(tabla, columna)` concretos, sacados de consultas que se han leído una a
 * una. No intenta analizar todo el SQL del árbol: un analizador a medias daría
 * una lista larga de falsos avisos, dejaría de mirarse, y entonces no
 * protegería nada — que es cómo mueren las comprobaciones automáticas.
 *
 * MIENTRAS UN DEFECTO SIGA ABIERTO, su caso está en `PENDIENTES` y la prueba
 * lo AFIRMA como ausente. Suena al revés, y es a propósito: así el día que
 * alguien lo arregle, esta prueba se pone roja y obliga a mover la línea de
 * `PENDIENTES` a `EXIGIDAS`. Una lista de deuda que no avisa cuando la deuda se
 * paga acaba mintiendo en la otra dirección.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

let pool: pg.Pool;

/** Columnas que el código consulta HOY y la base SÍ tiene. Deben seguir ahí. */
const EXIGIDAS: ReadonlyArray<[tabla: string, columna: string, quienLaPide: string]> = [
  ["bookings", "workspace_id", "booking_service.py filtra por inquilino"],
  ["bookings", "booking_date", "booking_service.py ordena y filtra por fecha"],
  ["calendar_events", "tenant_id", "SaasCalendarService y calendar_service.py"],
  ["calendar_events", "event_date", "SaasCalendarService.list ordena por aquí"],
  ["calendar_events", "start_at", "calendar_service.py:464 ordena por aquí"],
  ["crm_activities", "metadata", "crm_service.py guarda aquí deal_id y outcome"],
  ["crm_activities", "workspace_id", "crm_service.py filtra por inquilino"],
  ["webhook_deliveries", "webhook_id", "webhook_service.py:378 registra la entrega"],
  ["webhook_deliveries", "workspace_id", "webhook_service.py filtra por inquilino"],
  ["chatbot_conversations", "chatbot_id", "chatbot_service.py une con chatbots"],
  ["affiliate_clicks", "landed_at", "affiliate_service.py ordena por aquí"],
];

/**
 * Los cinco defectos confirmados a mano. La prueba afirma que SIGUEN ausentes.
 * Ver `backend/db/verificacion_manual_507.json` para la consulta exacta.
 */
const PENDIENTES: ReadonlyArray<[tabla: string, columna: string, donde: string]> = [
  ["bookings", "start_at", "booking_service.py:293 ORDER BY start_at"],
  ["bookings", "zoom_meeting_id", "booking_service.py:331 WHERE zoom_meeting_id"],
  ["crm_activities", "deal_id", "crm_service.py:750 AND deal_id ="],
  ["chatbot_conversations", "workspace_id", "chatbot_service.py:541 y cdp_service.py:303"],
  ["chatbot_conversations", "started_at", "chatbot_service.py:541 SELECT started_at"],
  ["chatbot_conversations", "last_message_at", "chatbot_service.py:541 ORDER BY"],
  ["chatbot_conversations", "visitor_info", "chatbot_service.py:541 y cdp_service.py:303"],
  ["chatbot_conversations", "lead_captured", "chatbot_service.py:541 (la tabla tiene captured_lead)"],
  ["chatbot_conversations", "satisfaction", "chatbot_service.py:541 SELECT satisfaction"],
];

async function existe(tabla: string, columna: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [tabla, columna],
  );
  return rows.length > 0;
}

conBase("el esquema tiene lo que el código pide", () => {
  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DSN, max: 4 });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("lo que el código usa hoy sigue estando", () => {
    for (const [tabla, columna, quien] of EXIGIDAS) {
      it(`${tabla}.${columna} — ${quien}`, async () => {
        expect(
          await existe(tabla, columna),
          `${tabla}.${columna} ha desaparecido y ${quien}`,
        ).toBe(true);
      });
    }
  });

  describe("la deuda medida sigue medida", () => {
    for (const [tabla, columna, donde] of PENDIENTES) {
      it(`${tabla}.${columna} sigue ausente — la pide ${donde}`, async () => {
        expect(
          await existe(tabla, columna),
          `${tabla}.${columna} YA EXISTE. Si alguien lo ha arreglado, muy bien: ` +
          `mueve esta línea de PENDIENTES a EXIGIDAS y quítala de ` +
          `verificacion_manual_507.json. Esta prueba está roja a propósito para ` +
          `que la deuda no se pague en silencio.`,
        ).toBe(false);
      });
    }
  });

  it("chatbot_conversations sigue siendo el caso más grave", async () => {
    // Se afirma la FORMA, no una lista de nombres: si alguien reconstruye la
    // tabla, esta prueba lo nota aunque acierte con algún nombre suelto.
    const { rows } = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='chatbot_conversations'`,
    );
    const tiene = new Set(rows.map((r) => r.column_name));
    const pideLaConsulta = [
      "visitor_info", "lead_captured", "satisfaction",
      "started_at", "last_message_at", "workspace_id",
    ];
    const ausentes = pideLaConsulta.filter((c) => !tiene.has(c));

    expect(rows.length).toBeGreaterThan(0);
    expect(
      ausentes.length,
      `chatbot_service.py:541 pide ${pideLaConsulta.length} columnas y faltan ${ausentes.length}. ` +
      `Si este número ha bajado, alguien está arreglándolo: actualiza la lista.`,
    ).toBe(6);
  });
});
