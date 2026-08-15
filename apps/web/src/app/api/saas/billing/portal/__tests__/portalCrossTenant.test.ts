import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Billing Portal — aislamiento cross-tenant.
 *
 * Una sesión de Billing Portal da control total sobre la facturación del
 * `customer` con el que se abre: método de pago, facturas, cancelación. Si la
 * ruta aceptase un `customer` influido por el cliente, o si la selección dejase
 * de estar atada a la identidad autenticada, A podría abrir el portal de B.
 *
 * Lo que se certifica es que el `customerId` que llega a Stripe procede
 * EXCLUSIVAMENTE de `ctx.claims.userId` — el sujeto del JWT verificado — a
 * través de `WHERE user_id = $1`. El doble de Postgres honra esa condición tal y
 * como aparece en la sentencia: si alguien la relaja, la fila de B pasa a ser
 * alcanzable desde A y estos tests se ponen rojos.
 */

const USER_A = "aaaaaaaa-1111-4111-8111-111111111111";
const USER_B = "bbbbbbbb-2222-4222-8222-222222222222";
const CUS_A = "cus_de_A";
const CUS_B = "cus_de_B";

const { estado } = vi.hoisted(() => ({
  estado: {
    /** Identidad que devuelve `requireSaasContext`, es decir, quién está autenticado. */
    autenticado: "",
    /** Todo lo que la ruta pidió a Stripe. Es la superficie que se audita. */
    stripeRecibio: [] as Array<{ customerId: string; returnUrl: string }>,
    consultas: [] as Array<{ sql: string; params: unknown[] }>,
  },
}));

/** Dos filas reales: cada usuario con SU customer. */
const FILAS = [
  { user_id: USER_A, stripe_customer_id: CUS_A },
  { user_id: USER_B, stripe_customer_id: CUS_B },
];

vi.mock("../../../../../../../../../backend/db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({
      query: async (sql: string, params: unknown[] = []) => {
        estado.consultas.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
        if (!/FROM subscriptions/i.test(sql)) return [];
        // Se honra el filtro REALMENTE presente en la sentencia.
        const filtraPorUsuario = /user_id\s*=\s*\$\d/i.test(sql);
        if (!filtraPorUsuario) return FILAS.map((f) => ({ ...f })); // sin filtro: todo visible
        return FILAS.filter((f) => f.user_id === params[0]).map((f) => ({ ...f }));
      },
    }),
  },
}));

vi.mock("../../../../../../../../../backend/stripe/stripeApi", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createBillingPortalSession: async (customerId: string, returnUrl: string) => {
    estado.stripeRecibio.push({ customerId, returnUrl });
    return `https://billing.stripe.test/session/${customerId}`;
  },
}));

vi.mock("@nelvyon/saas", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // La identidad procede del JWT verificado. Aquí se fija directamente para
  // poder ejecutar la ruta como A o como B sin montar sesiones completas: lo
  // que se audita no es la autenticación, sino qué hace la ruta CON ella.
  requireSaasContext: async () => ({
    claims: { userId: estado.autenticado },
    tenant: { id: "tenant-irrelevante" },
    role: "owner",
  }),
}));

import { POST } from "../route";

const peticion = () =>
  new Request("https://nelvyon.test/api/saas/billing/portal", { method: "POST" });

beforeEach(() => {
  estado.stripeRecibio = [];
  estado.consultas = [];
  estado.autenticado = "";
  process.env.NEXT_PUBLIC_APP_URL = "https://nelvyon.test";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Billing Portal — el customer sale de la identidad autenticada", () => {
  it("ejecutada como A: Stripe recibe EXCLUSIVAMENTE cus_A", async () => {
    estado.autenticado = USER_A;
    const res = await POST(peticion());

    expect(res.status).toBe(200);
    // Una sola llamada, con el customer de A y ningún otro.
    expect(estado.stripeRecibio).toHaveLength(1);
    expect(estado.stripeRecibio[0]!.customerId).toBe(CUS_A);
    // Aserción explícita sobre lo que NO debe cruzar la frontera.
    expect(estado.stripeRecibio.map((s) => s.customerId)).not.toContain(CUS_B);
  });

  it("ejecutada como B: Stripe recibe EXCLUSIVAMENTE cus_B", async () => {
    estado.autenticado = USER_B;
    await POST(peticion());

    expect(estado.stripeRecibio).toHaveLength(1);
    expect(estado.stripeRecibio[0]!.customerId).toBe(CUS_B);
    expect(estado.stripeRecibio.map((s) => s.customerId)).not.toContain(CUS_A);
  });

  it("la consulta se parametriza con el userId del JWT, no con nada del cuerpo", async () => {
    estado.autenticado = USER_A;
    await POST(peticion());

    const sel = estado.consultas.find((c) => /FROM subscriptions/i.test(c.sql));
    expect(sel).toBeDefined();
    expect(sel!.sql).toMatch(/user_id\s*=\s*\$1/i);
    expect(sel!.params[0]).toBe(USER_A);
    // El customer NO viaja interpolado en el SQL: va como parámetro.
    expect(sel!.sql).not.toContain(CUS_A);
  });

  it("un usuario sin suscripción no hereda el customer de otro: 404 y cero llamadas a Stripe", async () => {
    estado.autenticado = "cccccccc-3333-4333-8333-333333333333";
    const res = await POST(peticion());

    expect(res.status).toBe(404);
    // Lo importante no es el 404, sino que no se abrió portal de NADIE.
    expect(estado.stripeRecibio).toHaveLength(0);
  });

  it("la ruta nunca abre portal para un customer que no sea el de su propio usuario", async () => {
    // Barrido: para cada identidad, el customer entregado a Stripe es el suyo.
    for (const { user_id, stripe_customer_id } of FILAS) {
      estado.stripeRecibio = [];
      estado.autenticado = user_id;
      await POST(peticion());
      expect(estado.stripeRecibio).toHaveLength(1);
      expect(estado.stripeRecibio[0]!.customerId).toBe(stripe_customer_id);
    }
  });
});
