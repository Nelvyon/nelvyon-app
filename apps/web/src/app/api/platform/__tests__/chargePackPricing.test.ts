/**
 * El precio de un cobro no puede salir de un valor por defecto.
 *
 * HALLAZGO: `PACK_WHOLESALE[packSku] ?? 149`. Un SKU con errata o inventado no
 * se rechazaba: se cobraba a 149 EUR de mayorista, precio de un pack que no
 * existe. Y como el unico limite de `retailEur` es `>= wholesale`, ese 149
 * tambien fijaba el suelo del precio de venta.
 *
 * Los tres SKU reales estan en la propia ruta; el catalogo es cerrado.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const cobros: unknown[] = [];

vi.mock("@/lib/platformBffAuth", () => ({
  requirePlatformContext: vi.fn(async () => ({ workspaceId: 1, userId: "u1" })),
}));

vi.mock("@/lib/partners/partnerConnectStore", () => ({
  chargePartnerClientPack: vi.fn(async (args: unknown) => {
    cobros.push(args);
    return { ok: true, chargeId: "ch_fake" };
  }),
}));

function peticion(cuerpo: Record<string, unknown>): Request {
  return new Request("http://test/api/platform/partners/clients/7/charge-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-workspace-id": "1" },
    body: JSON.stringify(cuerpo),
  });
}

const ctx = { params: Promise.resolve({ wsId: "7" }) };

describe("precio del charge-pack", () => {
  beforeEach(() => {
    cobros.length = 0;
  });

  it("rechaza un SKU que no existe en el catalogo", async () => {
    const { POST } = await import(
      "../partners/clients/[wsId]/charge-pack/route"
    );
    const r = await POST(peticion({ packSku: "pack_inventado", retailEur: 500 }), ctx);
    expect(r.status).toBe(400);
    // Lo esencial: no llego a cobrarse nada.
    expect(cobros).toEqual([]);
  });

  it("rechaza una errata de un SKU real", async () => {
    const { POST } = await import(
      "../partners/clients/[wsId]/charge-pack/route"
    );
    const r = await POST(peticion({ packSku: "local_business_grow", retailEur: 500 }), ctx);
    expect(r.status).toBe(400);
    expect(cobros).toEqual([]);
  });

  it("un SKU real sigue cobrandose con SU mayorista, no con el de otro", async () => {
    // Contraprueba: los 400 anteriores no pueden venir de haber roto la ruta.
    const { POST } = await import(
      "../partners/clients/[wsId]/charge-pack/route"
    );
    const r = await POST(peticion({ packSku: "saas_b2b_growth", retailEur: 900 }), ctx);
    expect(r.status).toBe(200);
    expect(cobros).toHaveLength(1);
    expect(cobros[0]).toMatchObject({ packSku: "saas_b2b_growth", wholesaleEur: 249 });
  });
});
