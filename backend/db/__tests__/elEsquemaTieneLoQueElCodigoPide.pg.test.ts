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
 * LOS CINCO YA ESTÁN ARREGLADOS. Esta prueba dejó de ser una lista de deuda y
 * pasó a ser lo que protege el arreglo, con DOS listas:
 *
 *   EXIGIDAS ................. columnas que el código usa y deben seguir ahí.
 *   AUSENTES_A_PROPÓSITO ..... columnas que NO deben aparecer, con el sitio
 *                              donde vive el dato de verdad.
 *
 * La segunda es la menos obvia y la más útil. Dos de los cinco defectos se
 * arreglaron SIN tocar el esquema: el dato ya existía con otro nombre. Si
 * alguien añade luego la columna «para que funcione», habrá dos fuentes para lo
 * mismo y nadie sabrá cuál mirar — así que esta prueba se pone roja y le cuenta
 * dónde está el dato.
 *
 * Cuando la lista de deuda se vació, esta prueba se puso roja avisando de que
 * la deuda se había pagado. Funcionó como debía.
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
  ["bookings", "booking_time", "la hora de la cita; con la fecha forman el instante"],
  ["bookings", "zoom_meeting_id", "el webhook de Zoom cierra la reserva por aquí (migración 588)"],
  ["calendar_events", "tenant_id", "SaasCalendarService y calendar_service.py"],
  ["calendar_events", "event_date", "SaasCalendarService.list ordena por aquí"],
  ["calendar_events", "start_at", "calendar_service.py:464 ordena por aquí"],
  ["crm_activities", "metadata", "crm_service.py guarda aquí deal_id y outcome, y los lee de aquí"],
  ["crm_activities", "workspace_id", "crm_service.py filtra por inquilino"],
  ["webhook_deliveries", "webhook_id", "webhook_service.py:378 registra la entrega"],
  ["webhook_deliveries", "workspace_id", "webhook_service.py filtra por inquilino"],
  ["chatbot_conversations", "chatbot_id", "el subsistema LEGADO une con chatbot_configs"],
  ["chatbot_conversations", "captured_lead", "el legado guarda aquí los datos del contacto"],
  ["affiliate_clicks", "landed_at", "la fecha real del clic; el índice va sobre ésta"],

  // El subsistema por inquilino, en su propia tabla (migración 587).
  ["workspace_chatbot_conversations", "workspace_id", "chatbot_service.py filtra por inquilino"],
  ["workspace_chatbot_conversations", "visitor_info", "chatbot_service.py y cdp_service.py"],
  ["workspace_chatbot_conversations", "lead_captured", "el panel lo usa en un FILTER; es BOOLEANA"],
  ["workspace_chatbot_conversations", "started_at", "chatbot_service.py cuenta las de hoy"],
  ["workspace_chatbot_conversations", "last_message_at", "ordena la bandeja por actividad"],
  ["workspace_chatbot_conversations", "satisfaction", "valoración de la conversación"],
];

/**
 * Columnas que NO deben existir, y el motivo.
 *
 * Ésta es la lista que sustituye a la antigua de «deuda pendiente», y no es lo
 * mismo: aquellas faltaban por descuido, éstas faltan POR DECISIÓN. El dato ya
 * vive en otro sitio, y añadir la columna dejaría dos fuentes para lo mismo —
 * momento a partir del cual nadie sabe cuál mirar.
 *
 * Si alguien las añade «para que funcione», esta prueba se pone roja y le
 * cuenta dónde está el dato de verdad.
 */
const AUSENTES_A_PROPOSITO: ReadonlyArray<[tabla: string, columna: string, dondeVive: string]> = [
  [
    "bookings", "start_at",
    "la cita vive en `booking_date + booking_time`. Los lectores usan esa suma.",
  ],
  [
    "crm_activities", "deal_id",
    "el writer lo guarda en `metadata->>'deal_id'`, y el reader lo lee de ahí.",
  ],
  [
    "chatbot_conversations", "workspace_id",
    "el legado no tiene inquilino. El subsistema por inquilino usa " +
    "`workspace_chatbot_conversations`, que sí lo tiene.",
  ],
  [
    "chatbot_conversations", "lead_captured",
    "en el legado el campo es `captured_lead` y es JSONB con los datos del " +
    "contacto. El booleano vive en la tabla por inquilino.",
  ],
  [
    "affiliate_clicks", "created_at",
    "la fecha del clic se llama `landed_at`. Era un índice mal escrito en la 507, " +
    "no una columna que faltara.",
  ],
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

  describe("lo que falta, falta A PROPÓSITO", () => {
    for (const [tabla, columna, dondeVive] of AUSENTES_A_PROPOSITO) {
      it(`${tabla}.${columna} no existe — ${dondeVive.slice(0, 50)}…`, async () => {
        expect(
          await existe(tabla, columna),
          `${tabla}.${columna} EXISTE ahora. Si se ha añadido «para que funcione», ` +
          `hay dos fuentes para el mismo dato y nadie sabrá cuál mirar. ` +
          `El dato vive aquí: ${dondeVive}`,
        ).toBe(false);
      });
    }
  });

  it("los dos subsistemas de chatbot NO comparten forma", async () => {
    // El defecto era que dos productos distintos compartían una tabla. La
    // comprobación de que está resuelto no es que existan las columnas: es que
    // cada tabla tiene SU forma y ninguna tiene la de la otra.
    const columnas = async (t: string): Promise<Set<string>> => {
      const { rows } = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name=$1`,
        [t],
      );
      return new Set(rows.map((r) => r.column_name));
    };

    const legado = await columnas("chatbot_conversations");
    const porInquilino = await columnas("workspace_chatbot_conversations");

    expect(legado.size, "el legado ha desaparecido").toBeGreaterThan(0);
    expect(porInquilino.size, "falta la migración 587").toBeGreaterThan(0);

    // Cada uno lo suyo, y nada de lo del otro.
    expect(legado.has("captured_lead")).toBe(true);
    expect(legado.has("lead_captured"), "se han mezclado las dos formas").toBe(false);
    expect(porInquilino.has("lead_captured")).toBe(true);
    expect(porInquilino.has("captured_lead"), "se han mezclado las dos formas").toBe(false);
  });
});
