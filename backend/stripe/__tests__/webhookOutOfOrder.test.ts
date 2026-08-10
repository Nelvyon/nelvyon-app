import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * DEMOSTRACIÓN — eventos Stripe fuera de orden.
 *
 * Stripe NO garantiza el orden de entrega; lo documenta explícitamente. El
 * guard de idempotencia del repo opera sobre `stripe_event_id`, así que un
 * evento con OTRO `event.id` pasa limpio aunque sea anterior.
 *
 * `upsertSubscription` persiste con `ON CONFLICT (user_id) DO UPDATE SET
 * plan = EXCLUDED.plan, status = EXCLUDED.status, ...` sin ninguna condición de
 * recencia, y ni siquiera recibe el timestamp del evento.
 *
 * Estos tests fijan el comportamiento OBSERVADO. Si un evento antiguo puede
 * sobrescribir uno reciente, quedará demostrado aquí antes de clasificarlo.
 */
import type Stripe from "stripe";

// Algun helper interno resuelve el tenant via DbClient.getInstance(); sin esto
// el test exige DATABASE_URL real.
vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: async () => [] }) },
}));

vi.mock("../../saas/DunningService", () => ({
  DunningService: { getInstance: () => ({ onPaymentSucceeded: vi.fn(), onPaymentFailed: vi.fn() }) },
}));

import { processStripeEvent } from "../webhookHandler";

const USER_ID = "11111111-1111-4111-8111-111111111111";

/** Postgres falso que reproduce la semántica de ON CONFLICT (user_id). */
function dbFalsa() {
  const fila: Record<string, unknown> = {};
  const sentencias: string[] = [];

  const db = {
    query: async (sql: string, params: unknown[] = []) => {
      sentencias.push(sql.replace(/\s+/g, " ").trim());

      if (/INSERT INTO subscriptions/i.test(sql)) {
        // ON CONFLICT (user_id) DO UPDATE — sobrescribe si ya existe.
        const [userId, subId, custId, plan, status, periodEnd, cancelAtEnd] = params;
        // `eventAt` es el parámetro $8 (índice 7). NO usar `find`: `periodEnd`
        // también es Date y aparece antes, así que se cogería el equivocado.
        const nuevo = (params as unknown[])[7] as Date | undefined;
        const previo = fila.last_stripe_event_at as Date | undefined;
        const tieneGuarda =
          /subscriptions\.last_stripe_event_at\s*<\s*EXCLUDED\.last_stripe_event_at/i.test(sql);
        if (tieneGuarda && previo && nuevo && nuevo.getTime() < previo.getTime()) {
          return []; // evento antiguo rechazado por la propia sentencia
        }
        Object.assign(fila, {
          user_id: userId,
          stripe_subscription_id: subId ?? fila.stripe_subscription_id,
          stripe_customer_id: custId ?? fila.stripe_customer_id,
          plan,
          status,
          current_period_end: periodEnd,
          cancel_at_period_end: cancelAtEnd,
        });
        if (nuevo) fila.last_stripe_event_at = nuevo;
        return [];
      }

      if (/UPDATE subscriptions[\s\S]*status='canceled'/i.test(sql)) {
        const nuevo = params[1] as Date | undefined;
        const previo = fila.last_stripe_event_at as Date | undefined;
        const tieneGuarda = /last_stripe_event_at\s*<\s*\$\d/i.test(sql);
        if (tieneGuarda && previo && nuevo && nuevo.getTime() < previo.getTime()) return [];
        fila.status = "canceled";
        if (nuevo) fila.last_stripe_event_at = nuevo;
        return [];
      }
      // nelvyon_users / saas_tenants / resolución de tenant: sin efecto aquí.
      return [];
    },
  };

  return { db, fila, sentencias };
}

/** Evento `customer.subscription.updated` con timestamp e id explícitos. */
function eventoSuscripcion(opts: {
  id: string;
  createdSec: number;
  plan: "starter" | "agency";
  status: string;
}): Stripe.Event {
  const priceId =
    opts.plan === "agency"
      ? (process.env.STRIPE_PRICE_ID_AGENCY ?? "price_agency")
      : (process.env.STRIPE_PRICE_ID_STARTER ?? "price_starter");
  return {
    id: opts.id,
    object: "event",
    created: opts.createdSec,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_123",
        object: "subscription",
        customer: "cus_123",
        status: opts.status,
        cancel_at_period_end: false,
        current_period_end: 1893456000,
        metadata: { user_id: USER_ID },
        items: { data: [{ price: { id: priceId } }] },
      },
    },
  } as unknown as Stripe.Event;
}

const T1 = 1_700_000_000; // antiguo
const T2 = 1_700_009_999; // reciente

describe("Stripe — orden de eventos", () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_ID_STARTER = "price_starter";
    process.env.STRIPE_PRICE_ID_AGENCY = "price_agency";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("T1 → T2 (orden correcto): gana T2", async () => {
    const d = dbFalsa();
    await processStripeEvent(
      eventoSuscripcion({ id: "evt_old", createdSec: T1, plan: "agency", status: "active" }),
      d.db as never,
    );
    await processStripeEvent(
      eventoSuscripcion({ id: "evt_new", createdSec: T2, plan: "starter", status: "active" }),
      d.db as never,
    );
    expect(d.fila.plan).toBe("starter");
  });

  it("T2 → T1 (fuera de orden): el estado final DEBE seguir siendo T2", async () => {
    const d = dbFalsa();
    // Primero el reciente...
    await processStripeEvent(
      eventoSuscripcion({ id: "evt_new", createdSec: T2, plan: "starter", status: "active" }),
      d.db as never,
    );
    expect(d.fila.plan).toBe("starter");

    // ...y después llega, con retraso, uno ANTERIOR y con otro event.id.
    await processStripeEvent(
      eventoSuscripcion({ id: "evt_old", createdSec: T1, plan: "agency", status: "active" }),
      d.db as never,
    );

    // Si esto falla y queda "agency", el usuario recupera un plan que ya no
    // paga: es plan sin pago por desorden de entrega.
    expect(d.fila.plan).toBe("starter");
  });

  it("cancelación reciente no revive por un 'active' antiguo", async () => {
    const d = dbFalsa();
    await processStripeEvent(
      eventoSuscripcion({ id: "evt_cancel", createdSec: T2, plan: "starter", status: "canceled" }),
      d.db as never,
    );
    expect(d.fila.status).toBe("canceled");

    await processStripeEvent(
      eventoSuscripcion({ id: "evt_old_active", createdSec: T1, plan: "starter", status: "active" }),
      d.db as never,
    );
    expect(d.fila.status).toBe("canceled");
  });
});
