import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

/**
 * Aislamiento partner/client en el webhook de Stripe Connect.
 *
 * `handleSubscriptionUpdated` no está exportada; el único acceso es
 * `handleStripeConnectWebhook(rawBody, signature)`. Eso es una ventaja: el test
 * recorre el camino REAL —verificación de firma incluida— en lugar de invocar
 * la función interna por atajo.
 *
 * El control que se certifica es la CONJUNCIÓN del UPDATE:
 *
 *     WHERE partner_workspace_id=$1 AND client_workspace_id=$2
 *
 * Un par contradictorio no casa con ninguna fila. La `dbFalsa` honra la
 * condición realmente presente en la sentencia, así que si alguien relajase el
 * WHERE a un solo campo, el caso cruzado A/B pasaría a mutar y el test se
 * pondría rojo.
 */
const consultas: Array<{ sql: string; params: unknown[] }> = [];
const filaExistente = { partner_workspace_id: 10, client_workspace_id: 20, status: "active" };

vi.mock("../../../../../../backend/db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({
      query: async (sql: string, params: unknown[] = []) => {
        consultas.push({ sql, params });
        if (!/UPDATE partner_client_billing/i.test(sql)) return [];
        const exigePartner = /partner_workspace_id\s*=\s*\$\d/i.test(sql);
        const exigeClient = /client_workspace_id\s*=\s*\$\d/i.test(sql);
        const [partner, client] = params as [number, number];
        const casaPartner = !exigePartner || partner === filaExistente.partner_workspace_id;
        const casaClient = !exigeClient || client === filaExistente.client_workspace_id;
        if (casaPartner && casaClient) {
          filaExistente.status = String((params as unknown[])[3]);
          return [{ ...filaExistente }];
        }
        return [];
      },
    }),
  },
}));

import { handleStripeConnectWebhook } from "../partnerConnectWebhook";

const SECRET = "whsec_test_connect_secret_para_pruebas";

/** Firma con el esquema oficial de Stripe: t=<ts>,v1=HMAC(ts.payload). */
function firmar(payload: string, ts = Math.floor(Date.now() / 1000)): string {
  const mac = crypto.createHmac("sha256", SECRET).update(`${ts}.${payload}`).digest("hex");
  return `t=${ts},v1=${mac}`;
}

function eventoSubscription(partnerWs: unknown, clientWs: unknown): string {
  const metadata: Record<string, unknown> = {};
  if (partnerWs !== undefined) metadata.partner_workspace_id = String(partnerWs);
  if (clientWs !== undefined) metadata.client_workspace_id = String(clientWs);
  return JSON.stringify({
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type: "customer.subscription.updated",
    data: { object: { id: "sub_connect_1", object: "subscription", status: "canceled", metadata } },
  });
}

async function enviar(payload: string) {
  await handleStripeConnectWebhook(payload, firmar(payload)).catch(() => undefined);
}

describe("Connect — binding partner/client", () => {
  beforeEach(() => {
    consultas.length = 0;
    filaExistente.status = "active";
    process.env.STRIPE_WEBHOOK_CONNECT_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_para_pruebas";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("partner A + client A válido: muta", async () => {
    await enviar(eventoSubscription(10, 20));
    expect(filaExistente.status).toBe("canceled");
  });

  it("partner A + client B incorrecto: CERO mutación", async () => {
    await enviar(eventoSubscription(10, 999));
    expect(filaExistente.status).toBe("active");
  });

  it("partner inexistente: CERO mutación", async () => {
    await enviar(eventoSubscription(999, 20));
    expect(filaExistente.status).toBe("active");
  });

  it("ambos IDs de otro workspace: CERO mutación", async () => {
    await enviar(eventoSubscription(777, 888));
    expect(filaExistente.status).toBe("active");
  });

  it("metadata ausente: no llega a consultar", async () => {
    await enviar(eventoSubscription(undefined, undefined));
    expect(consultas.filter((c) => /UPDATE partner_client_billing/i.test(c.sql))).toHaveLength(0);
    expect(filaExistente.status).toBe("active");
  });

  it("solo partner sin client: fail-closed, sin consulta", async () => {
    await enviar(eventoSubscription(10, undefined));
    expect(consultas.filter((c) => /UPDATE partner_client_billing/i.test(c.sql))).toHaveLength(0);
  });

  it("firma inválida: cero mutación", async () => {
    const payload = eventoSubscription(10, 20);
    await handleStripeConnectWebhook(payload, "t=1,v1=firmafalsa").catch(() => undefined);
    expect(filaExistente.status).toBe("active");
  });

  it("el UPDATE exige AMBAS condiciones", async () => {
    await enviar(eventoSubscription(10, 20));
    const upd = consultas.find((c) => /UPDATE partner_client_billing/i.test(c.sql));
    expect(upd).toBeDefined();
    expect(upd!.sql).toMatch(/partner_workspace_id\s*=\s*\$/i);
    expect(upd!.sql).toMatch(/client_workspace_id\s*=\s*\$/i);
  });
});
