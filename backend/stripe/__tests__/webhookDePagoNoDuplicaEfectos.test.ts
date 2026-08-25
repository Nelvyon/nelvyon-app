/**
 * BLOQUE 4 · un webhook de pago repetido no produce el efecto dos veces.
 *
 * Stripe **reintenta ante cualquier respuesta que no sea 2xx**, y además puede
 * entregar el mismo evento más de una vez por su cuenta. Así que «llega dos
 * veces» no es un caso raro: es el funcionamiento normal del proveedor.
 *
 * El defecto que fijan estas pruebas: la guarda de recencia protegía la fila
 * —un evento repetido tiene el mismo `created`, así que `last_stripe_event_at <
 * $2` es falso y no reescribe— pero los efectos posteriores corrían **igual**.
 * `downgradeSaasTenantPlan` volvía a ejecutarse y el cliente recibía un **segundo
 * correo** diciéndole que su suscripción se ha cancelado.
 *
 * Que la fila quede bien no basta cuando el efecto sale hacia fuera.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Importacion ESTATICA a proposito.
//
// Con `await import(...)` dentro de cada prueba, la PRIMERA pagaba la carga del
// SDK de Stripe -2,7 s medidos- dentro de su presupuesto de 5 s. Aislada pasaba;
// en la suite completa, con la maquina cargada, se pasaba del limite y fallaba
// por tiempo. No era un defecto del producto ni un timeout que subir: era el
// coste del import contabilizado en el sitio equivocado.
//
// Estatico, vitest lo cuenta en la fase de import del fichero y las pruebas
// arrancan con el modulo ya cargado. `getStripe()` lee el entorno EN CADA
// LLAMADA, asi que las pruebas de autenticidad siguen pudiendo cambiarlo.
import { processStripeEvent, verifyStripeWebhook } from "../webhookHandler";

const correosEnviados: Array<{ plantilla: string; a: unknown }> = [];

vi.mock("../../email", () => ({
  sendEmail: async (plantilla: string, datos: Record<string, unknown>) => {
    correosEnviados.push({ plantilla, a: datos.email });
  },
}));

// `dunningService` y `cancellationService` instancian `DbClient` al construirse,
// que exige `DATABASE_URL`. Se sustituyen: lo que interesa medir es la
// idempotencia del webhook, no su cableado con el resto del sistema.
vi.mock("../../billing/dunningService", () => ({
  DunningService: {
    getInstance: () => ({
      handlePaymentFailed: async () => undefined,
      handleSuspension: async () => undefined,
    }),
  },
  resolveTenantIdFromUserId: async () => "tenant-1",
}));

vi.mock("../../billing/cancellationService", () => ({
  CancellationService: {
    getInstance: () => ({
      // `false`: la cancelacion NO es voluntaria, que es el camino que lleva al
      // UPDATE con guarda de recencia -el que se quiere certificar-.
      isVoluntaryCancellationPending: async () => false,
      processCancellation: async () => undefined,
    }),
  },
}));

vi.mock("../../onboarding", () => ({ completeStep: async () => undefined }));

vi.mock("../../email/resolveUserEmailLocale", () => ({
  resolveUserEmailLocale: async () => "es",
  dateLocaleTag: () => "es-ES",
}));

const USUARIO = "11111111-1111-4111-8111-111111111111";

/**
 * Base falsa que se comporta como PostgreSQL en lo que importa aquí: el UPDATE
 * con guarda de recencia devuelve filas solo si la guarda se cumple.
 */
function baseFalsa() {
  const estado = { ultimoEventoEn: null as Date | null };
  const sentencias: string[] = [];

  const db = {
    query: async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
      sentencias.push(sql.replace(/\s+/g, " ").trim().slice(0, 60));

        if (/SELECT status/i.test(sql) && /subscriptions/i.test(sql)) {
        return [{ status: "active" }] as unknown as T[];
      }
      if (/UPDATE subscriptions/i.test(sql) && /last_stripe_event_at </i.test(sql)) {
        const cuando = params[1] as Date;
        const aplica = estado.ultimoEventoEn === null || estado.ultimoEventoEn < cuando;
        if (!aplica) return [] as T[];
        estado.ultimoEventoEn = cuando;
        return [{ user_id: USUARIO }] as unknown as T[];
      }
      if (/FROM nelvyon_users/i.test(sql) || /SELECT email/i.test(sql)) {
        return [{ email: "cliente@ejemplo.test", locale: "es" }] as unknown as T[];
      }
      return [] as T[];
    },
  };

  return { db, estado, sentencias };
}

function eventoDeCancelacion(creadoEn: number) {
  return {
    id: `evt_${creadoEn}`,
    type: "customer.subscription.deleted",
    created: creadoEn,
    data: {
      object: {
        id: "sub_1",
        metadata: { user_id: USUARIO },
        current_period_end: 1_800_000_000,
      },
    },
  } as never;
}

beforeEach(() => {
  correosEnviados.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("BLOQUE 4 · webhook de pago: efecto exactamente una vez", () => {
  it("EL CONTROL: la primera entrega SÍ cancela y SÍ avisa", async () => {
    // Sin este control, una implementación que no hiciera nunca nada pasaría
    // todas las pruebas de duplicado y dejaría las cancelaciones sin procesar.
    const { db, estado } = baseFalsa();

    await processStripeEvent(eventoDeCancelacion(1_700_000_000), db as never);

    expect(estado.ultimoEventoEn, "no llego a cancelar").not.toBeNull();
    expect(correosEnviados).toHaveLength(1);
  });

  it("una SEGUNDA entrega del mismo evento no envía un segundo correo", async () => {
    // El defecto. Stripe reintenta ante cualquier no-2xx: recibir el mismo
    // evento dos veces es lo normal, no la excepción.
    const { db } = baseFalsa();
    const evento = eventoDeCancelacion(1_700_000_000);

    await processStripeEvent(evento, db as never);
    await processStripeEvent(evento, db as never);

    expect(correosEnviados, "el cliente recibio dos avisos de cancelacion").toHaveLength(1);
  });

  it("diez entregas del mismo evento siguen produciendo un solo efecto", async () => {
    // Un proveedor con problemas puede reintentar muchas veces seguidas.
    const { db } = baseFalsa();
    const evento = eventoDeCancelacion(1_700_000_000);

    for (let i = 0; i < 10; i++) await processStripeEvent(evento, db as never);

    expect(correosEnviados).toHaveLength(1);
  });

  it("un evento MÁS ANTIGUO no revierte un estado más nuevo", async () => {
    // Los webhooks llegan fuera de orden. Un `deleted` viejo que llega después
    // de una reactivación no puede volver a cancelar.
    const { db } = baseFalsa();

    await processStripeEvent(eventoDeCancelacion(1_700_000_500), db as never);
    expect(correosEnviados).toHaveLength(1);

    await processStripeEvent(eventoDeCancelacion(1_700_000_000), db as never);
    expect(correosEnviados, "un evento viejo volvio a cancelar").toHaveLength(1);
  });

  it("dos entregas CONCURRENTES del mismo evento producen un solo efecto", async () => {
    // El caso que no se ve probando en serie: dos instancias procesando la misma
    // entrega a la vez. La guarda vive en la base, así que la segunda no aplica.
    const { db } = baseFalsa();
    const evento = eventoDeCancelacion(1_700_000_000);

    await Promise.all([
      processStripeEvent(evento, db as never),
      processStripeEvent(evento, db as never),
    ]);

    expect(correosEnviados.length, "dos avisos por entrega concurrente").toBeLessThanOrEqual(1);
  });

  it("un evento NUEVO sí produce su efecto después de uno antiguo", async () => {
    // La otra mitad del control: si la guarda bloqueara todo lo posterior, una
    // cancelacion real después de otra quedaría sin procesar.
    const { db, estado } = baseFalsa();

    await processStripeEvent(eventoDeCancelacion(1_700_000_000), db as never);
    const primero = estado.ultimoEventoEn;

    await processStripeEvent(eventoDeCancelacion(1_700_000_900), db as never);
    expect(estado.ultimoEventoEn).not.toEqual(primero);
    expect(correosEnviados).toHaveLength(2);
  });
});

describe("BLOQUE 4 · webhook de pago: autenticidad", () => {
  // El valor previo se captura DENTRO del hook, no en el cuerpo del `describe`.
  //
  // Fuera de un hook, la captura ocurre al cargar el modulo, y vitest reutiliza
  // el proceso entre ficheros: lo que se congelaria no es el entorno original
  // sino lo que dejo otro fichero del mismo worker. Al restaurar, se le
  // devolveria a los siguientes un entorno que nunca existio.
  //
  // Hay un trinquete que lo vigila -`test_tests_no_capturan_env_al_cargar`- y
  // fue el que destapo esto en la puerta final del Bloque 4.
  let previo: string | undefined;
  let previoSecreto: string | undefined;

  beforeEach(() => {
    previo = process.env.STRIPE_SECRET_KEY;
    previoSecreto = process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (previo === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previo;
    if (previoSecreto === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previoSecreto;
  });

  it("una firma INVENTADA se rechaza", async () => {
    // La puerta de entrada. Si la firma no se comprobara, cualquiera podria
    // cancelar la suscripcion de otro con una peticion HTTP.
    //
    // Se usa la verificacion REAL de la libreria: es criptografia local, no sale
    // a la red y no cuesta nada. Sustituirla por un doble mediria el doble.
    process.env.STRIPE_SECRET_KEY = "sk_test_de_prueba_sin_uso";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_de_prueba";

    expect(() => verifyStripeWebhook('{"id":"evt_1"}', "t=1,v1=firmainventada")).toThrow();
  });

  it("un CUERPO manipulado con firma valida de otro cuerpo se rechaza", async () => {
    // El ataque real: coger una entrega legitima, cambiarle el importe o el
    // usuario, y reenviarla con su firma original.
    process.env.STRIPE_SECRET_KEY = "sk_test_de_prueba_sin_uso";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_de_prueba";

    const cuerpo = '{"id":"evt_1","type":"customer.subscription.deleted"}';
    const manipulado = cuerpo.replace("evt_1", "evt_manipulado");
    // Firma calculada para `cuerpo`; se presenta con `manipulado`.
    const crypto = await import("node:crypto");
    const t = 1_700_000_000;
    const firma = crypto
      .createHmac("sha256", "whsec_de_prueba")
      .update(`${t}.${cuerpo}`)
      .digest("hex");

    expect(() => verifyStripeWebhook(manipulado, `t=${t},v1=${firma}`)).toThrow();
  });

  it("EL CONTROL: la firma correcta del cuerpo correcto SI se acepta", async () => {
    // Sin este control, una verificacion que rechazara TODO pasaria las dos
    // pruebas de arriba y dejaria el producto sin poder cobrar.
    process.env.STRIPE_SECRET_KEY = "sk_test_de_prueba_sin_uso";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_de_prueba";

    const cuerpo = '{"id":"evt_1","type":"ping","created":1700000000,"data":{"object":{}}}';
    const crypto = await import("node:crypto");
    const t = Math.floor(Date.now() / 1000);
    const firma = crypto
      .createHmac("sha256", "whsec_de_prueba")
      .update(`${t}.${cuerpo}`)
      .digest("hex");

    const evento = verifyStripeWebhook(cuerpo, `t=${t},v1=${firma}`);
    expect(evento.id).toBe("evt_1");
  });

  it("una firma CADUCADA se rechaza (proteccion de repeticion)", async () => {
    // Una entrega legitima capturada hace horas no puede reenviarse. Es lo que
    // convierte la firma en una prueba de frescura y no solo de origen.
    process.env.STRIPE_SECRET_KEY = "sk_test_de_prueba_sin_uso";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_de_prueba";

    const cuerpo = '{"id":"evt_1","type":"ping","created":1,"data":{"object":{}}}';
    const crypto = await import("node:crypto");
    const hace3Horas = Math.floor(Date.now() / 1000) - 10_800;
    const firma = crypto
      .createHmac("sha256", "whsec_de_prueba")
      .update(`${hace3Horas}.${cuerpo}`)
      .digest("hex");

    expect(() => verifyStripeWebhook(cuerpo, `t=${hace3Horas},v1=${firma}`)).toThrow();
  });

  it("sin secreto configurado NO se acepta nada (fallo cerrado)", async () => {
    // Sin secreto no se puede verificar, asi que aceptar seria aceptar
    // cualquier cosa. Se comprueba que se niega, no COMO se niega.
    process.env.STRIPE_SECRET_KEY = "sk_test_de_prueba_sin_uso";
    delete process.env.STRIPE_WEBHOOK_SECRET;

    expect(() => verifyStripeWebhook("{}", "t=1,v1=abc")).toThrow();
  });
});
