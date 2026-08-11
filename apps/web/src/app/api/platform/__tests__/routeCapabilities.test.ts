import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cableado ruta → capability del Tramo 1.
 *
 * La capa central ya está certificada en `lib/__tests__/platformRbac.test.ts`.
 * Lo que falta demostrar es que cada ruta pide la autoridad CORRECTA y que lo
 * hace ANTES de su primer side effect: una ruta podía pedir una capability
 * demasiado débil, o pedirla después de cobrar, y la capa central seguiría
 * estando bien.
 *
 * Por eso el doble de `requirePlatformContext` registra la acción pedida y
 * puede denegar: si deniega y aun así el store se ejecutó, la autorización
 * llegó tarde. Ningún test toca Stripe.
 */
const { estado } = vi.hoisted(() => ({
  estado: {
    accionesPedidas: [] as string[],
    denegar: false,
    efectos: [] as string[],
  },
}));

vi.mock("@/lib/platformBffAuth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    requirePlatformContext: async (_req: Request, action: string) => {
      estado.accionesPedidas.push(action);
      if (estado.denegar) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return { claims: { userId: "user-A", email: "a@test.local" }, workspaceId: 10, role: "owner", capabilities: [] };
    },
    requirePlatformClaims: async () => ({ userId: "user-A", email: "a@test.local" }),
  };
});

vi.mock("@/lib/partners/partnerConnectStore", () => ({
  chargePartnerClientPack: async () => {
    estado.efectos.push("chargePartnerClientPack");
    return { ok: true, ledgerId: "led_1" };
  },
  upsertPartnerClientBilling: async () => {
    estado.efectos.push("upsertPartnerClientBilling");
    return { id: 1 };
  },
  getPartnerClientBilling: async () => null,
}));

vi.mock("@/lib/partners/partnerConnectService", () => ({
  startPartnerConnectOnboarding: async () => {
    estado.efectos.push("startPartnerConnectOnboarding");
    return { url: "https://connect.test/onboard" };
  },
}));

vi.mock("@/lib/portal/portalInviteStore", () => ({
  createPortalInviteBff: async () => {
    estado.efectos.push("createPortalInviteBff");
    return { id: "inv_1" };
  },
  listPortalInvitesBff: async () => ({ items: [] }),
}));

vi.mock("@/lib/platformDbFallback", () => ({ platformDbFallbackEnabled: () => true }));

import { POST as chargePack } from "../partners/clients/[wsId]/charge-pack/route";
import { POST as billingPost, GET as billingGet } from "../partners/clients/[wsId]/billing/route";
import { POST as onboardPost } from "../partners/connect/onboard/route";
import { POST as invitesPost, GET as invitesGet } from "../portal/invites/route";

const req = (body?: unknown, qs = "") =>
  new Request(`https://nelvyon.test/api/platform/x${qs}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "x-workspace-id": "10", "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const ctxWs = { params: Promise.resolve({ wsId: "20" }) };

beforeEach(() => {
  estado.accionesPedidas = [];
  estado.denegar = false;
  estado.efectos = [];
});

/** [nombre, invocación, capability esperada, side effect que NO debe ocurrir si deniega] */
const RUTAS: Array<[string, () => Promise<unknown>, string, string]> = [
  [
    "charge-pack POST",
    () => chargePack(req({ packSku: "local_business_growth", retailEur: 500 }), ctxWs),
    "partners.billing.charge",
    "chargePartnerClientPack",
  ],
  [
    "partner billing POST",
    () => billingPost(req({ retailPlanId: "starter" }), ctxWs),
    "partners.billing.manage",
    "upsertPartnerClientBilling",
  ],
  ["partner billing GET", () => billingGet(req(), ctxWs), "partners.billing.manage", ""],
  [
    "connect onboard POST",
    () => onboardPost(req({})),
    "partners.connect.manage",
    "startPartnerConnectOnboarding",
  ],
  [
    "portal invites POST",
    () => invitesPost(req({ client_id: "c1", email: "x@test.local" })),
    "partners.portal.invite",
    "createPortalInviteBff",
  ],
  [
    "portal invites GET",
    () => invitesGet(req(undefined, "?client_id=c1")),
    "partners.portal.invite",
    "",
  ],
];

describe("cada ruta declara su capability", () => {
  it.each(RUTAS)("%s declara su capability", async (_n, invocar, esperada) => {
    await invocar();
    expect(estado.accionesPedidas).toEqual([esperada]);
  });
});

describe("la autorización ocurre ANTES del primer side effect", () => {
  it.each(RUTAS.filter((r) => r[3] !== ""))(
    "%s denegada no ejecuta su side effect",
    async (_n, invocar, _cap, efecto) => {
      estado.denegar = true;
      const res = (await invocar()) as { status: number };
      expect(res.status).toBe(403);
      // Lo decisivo: el store no llegó a ejecutarse.
      expect(estado.efectos).not.toContain(efecto);
      expect(estado.efectos).toEqual([]);
    },
  );

  it("permitida sí ejecuta el side effect (el test anterior no pasa por vacío)", async () => {
    estado.denegar = false;
    await chargePack(req({ packSku: "local_business_growth", retailEur: 500 }), ctxWs);
    expect(estado.efectos).toContain("chargePartnerClientPack");
  });
});

describe("ninguna ruta del Tramo 1 autoriza solo con pertenencia", () => {
  it("las seis piden capability, y son capabilities distintas según el dominio", async () => {
    const pedidas: string[] = [];
    for (const [, invocar] of RUTAS) {
      estado.accionesPedidas = [];
      await invocar();
      pedidas.push(...estado.accionesPedidas);
    }
    expect(pedidas).toHaveLength(6);
    expect(new Set(pedidas)).toEqual(
      new Set([
        "partners.billing.charge",
        "partners.billing.manage",
        "partners.connect.manage",
        "partners.portal.invite",
      ]),
    );
  });
});
