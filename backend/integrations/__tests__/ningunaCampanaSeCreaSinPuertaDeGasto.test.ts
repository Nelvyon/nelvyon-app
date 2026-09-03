/**
 * Nadie crea una campaña de pago sin pasar por la política de coste.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `GoogleAdsExecutor` crea presupuestos, campañas, grupos de anuncios y
 * anuncios contra la API REAL de Google Ads. No tenía ninguna puerta de gasto.
 *
 * Lo único que lo frenaba era que no hubiera una cuenta conectada. Eso es una
 * guarda por AUSENCIA, no por diseño: el día que alguien conecte una cuenta —que
 * es el objetivo del producto— el freno desaparece sin que nadie cambie una
 * línea ni se entere.
 *
 * Y la política ya lo tenía todo declarado: `google_ads` es `PAID` («el
 * presupuesto de una campaña es dinero del cliente») y `crear_campana` y
 * `cambiar_presupuesto` son `gasto_publicitario`. Lo único que faltaba era que
 * el ejecutor preguntara.
 *
 * ── DÓNDE SE COMPRUEBA ──────────────────────────────────────────────────────
 *
 * En `apiPost`, el punto único por el que pasan las cuatro mutaciones que hay
 * hoy y las que se añadan. Gatear cada método por separado deja fuera al quinto.
 *
 * Y la operación se deriva de la RUTA, no de quien llama: un método nuevo que
 * haga POST contra `campaigns` queda cubierto sin que su autor se acuerde.
 *
 * COSTE EXTERNO: 0 EUR. Ninguna prueba llega a la red: la política deniega
 * antes, que es justamente lo que se está comprobando.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAdsExecutor } from "../google/GoogleAdsExecutor";

/** El ejecutor pide credenciales antes de nada; se las damos válidas. */
const oauthFalso = {
  getConnection: async () => ({ accessToken: "t", refreshToken: "r", expiresAt: null }),
  getValidAccessToken: async () => "t",
};
vi.mock("../../oauth/OAuthService", () => ({
  OAuthService: { instance: () => oauthFalso, getInstance: () => oauthFalso },
}));

describe("ninguna campaña se crea sin pasar por la política de coste", () => {
  const antes = { ...process.env };
  let red: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Si alguna prueba llegara a la red, esto lo delata en vez de dejarlo pasar.
    red = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", red);
    vi.stubEnv("NELVYON_MODO_COSTE_CERO", "1");
  });

  afterEach(() => {
    process.env = { ...antes };
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("LA REGLA: crear un presupuesto se DENIEGA con el modo coste cero activo", async () => {
    const ex = new GoogleAdsExecutor();
    await expect(
      ex.createBudget("usr-1", "123", "presupuesto", 5_000_000),
    ).rejects.toThrow(/politica de coste/i);
  });

  it("y ni una petición llega a Google: se deniega ANTES de la red", async () => {
    // Denegar después de la llamada no sirve de nada: el gasto ya se hizo.
    const ex = new GoogleAdsExecutor();
    await expect(ex.createBudget("usr-1", "123", "p", 1_000_000)).rejects.toThrow();

    const aGoogle = red.mock.calls.filter((c) => String(c[0]).includes("googleads"));
    expect(aGoogle, "se llamó a Google Ads pese a estar denegado").toHaveLength(0);
  });

  it("crear una campaña también se deniega", async () => {
    const ex = new GoogleAdsExecutor();
    await expect(
      ex.createCampaign("usr-1", "123", "campana", "customers/1/campaignBudgets/2"),
    ).rejects.toThrow(/politica de coste/i);
  });

  it("el motivo dice que es GASTO PUBLICITARIO, no un error genérico", async () => {
    // Quien lea el error tiene que poder distinguir «no se pudo» de «no se
    // permite», que son dos incidencias completamente distintas.
    const ex = new GoogleAdsExecutor();
    const err = await ex
      .createCampaign("usr-1", "123", "c", "customers/1/campaignBudgets/2")
      .then(() => null)
      .catch((e: Error) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/gasto_publicitario/);
  });

  it("EL CONTROL: con el modo coste cero APAGADO sí se ejecuta", async () => {
    // Sin esto, un ejecutor que lanzara siempre pasaría todas las pruebas de
    // arriba y nadie notaría que Google Ads dejó de funcionar del todo.
    vi.stubEnv("NELVYON_MODO_COSTE_CERO", "0");
    const ex = new GoogleAdsExecutor();

    red.mockResolvedValue(
      new Response(JSON.stringify({ results: [{ resourceName: "customers/1/campaignBudgets/2" }] }), {
        status: 200,
      }),
    );

    await expect(ex.createBudget("usr-1", "123", "p", 1_000_000)).resolves.toBeTruthy();
    expect(red, "con la política apagada tampoco llamó a Google").toHaveBeenCalled();
  });

  it("una ruta DESCONOCIDA se trata como campaña, no como gratis", async () => {
    // Es la decisión que importa: un POST que no reconocemos contra la API de
    // Ads es exactamente el caso en el que NO se puede suponer que no gasta.
    const ex = new GoogleAdsExecutor() as unknown as {
      apiPost: (u: string, p: string, b: unknown) => Promise<unknown>;
    };
    await expect(ex.apiPost("usr-1", "/v16/customers/1:algoNuevo", {})).rejects.toThrow(
      /politica de coste/i,
    );
  });
});
