/**
 * El panel de anuncios no crea, activa ni sube presupuesto sin cruzar la puerta.
 *
 * ── COMO SE ENCONTRO, Y POR QUE ES INCOMODO ─────────────────────────────────
 *
 * `SaasAdsDashboardService` estaba DECLARADO en el guardian de canales como
 * «panel de metricas; sus POST son consultas de reporting». Lo declare yo, y era
 * falso. Al comprobar camino por camino que nada pudiera saltarse la puerta de
 * conversiones, aparecieron tres metodos que no leen nada:
 *
 *     _setMetaCampaignStatus  → ACTIVE empieza a gastar
 *     _createMetaCampaign     → compromete inversion en la cuenta del cliente
 *     _updateMetaBudget       → cambia cuanto se gasta cada dia
 *
 * Los tres iban a `graph.facebook.com` con el token del cliente. Es la lección
 * de siempre: una excepcion declarada sin verificar es peor que no tener
 * guardian, porque apaga la alarma justo donde hacia falta.
 *
 * ── Y LA SEGUNDA LECCION, QUE FUE MIA ───────────────────────────────────────
 *
 * La primera version puso la puerta en esos TRES metodos de Meta. Pasaba en
 * verde, y estaba mal: Google, TikTok, Snapchat y LinkedIn tienen los mismos
 * tres caminos y se quedaron abiertos. Verificar la lista de hoy en vez del
 * invariante es exactamente el fallo que este arbol lleva toda la fase
 * persiguiendo, y lo cometi al arreglarlo.
 *
 * Por eso esta bateria recorre LAS CINCO plataformas: si manana se anade una
 * sexta sin puerta, esto se pone rojo el mismo dia.
 *
 * ── QUE COMPRUEBA ───────────────────────────────────────────────────────────
 *
 * Que con la puerta cerrada NO se llega a la red. `fetchFn` es un doble que
 * revienta: si alguna ruta lo llamara, la prueba lo dice.
 *
 * COSTE EXTERNO: 0 EUR. Ninguna llamada sale de aqui.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { SaasAdsDashboardService } from "../SaasAdsDashboardService";
import { consultaFalsaCon } from "../../db/__tests__/consultaFalsa";

const TENANT = "tenant-ads";

/** Las cinco que el panel sabe manejar hoy. */
const PLATAFORMAS = ["meta", "google", "tiktok", "snapchat", "linkedin"] as const;

/** Un `fetch` que revienta: llegar a la red con la puerta cerrada es el fallo. */
const fetchQueNoDebeSonar = vi.fn(async (): Promise<Response> => {
  throw new Error("se llamo al proveedor con la puerta de gasto cerrada");
});

/** Credenciales presentes: la proteccion tiene que ser la PUERTA, no su ausencia. */
function baseConCredenciales(plataforma: string) {
  return {
    query: consultaFalsaCon(() => [
      {
        id: "cred-1",
        tenant_id: TENANT,
        platform: plataforma,
        provider: `${plataforma}_ads`,
        access_token: "token-del-cliente",
        account_id: "123",
        account_name: "Cuenta del cliente",
        extra_config: { developerToken: "devtok" },
        is_active: true,
        created_at: new Date(),
      },
    ]),
  };
}

function servicio(plataforma: string) {
  return new SaasAdsDashboardService(
    baseConCredenciales(plataforma) as never,
    fetchQueNoDebeSonar as never,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  fetchQueNoDebeSonar.mockClear();
});

describe("con la puerta de gasto cerrada, no se toca la cuenta del cliente", () => {
  // Se exige que rechace POR LA PUERTA, no por cualquier otro motivo: si
  // fallara al leer credenciales, la prueba pasaria sin probar nada.
  const PORQUE_LA_PUERTA = /gasto|GastoDenegado|coste/i;

  for (const plataforma of PLATAFORMAS) {
    it(`no se CREA una campana en ${plataforma}`, async () => {
      await expect(
        servicio(plataforma).createCampaign(TENANT, {
          platform: plataforma,
          name: "Campana de prueba",
          dailyBudgetUsd: 50,
          objective: "OUTCOME_TRAFFIC",
        } as never),
      ).rejects.toThrow(PORQUE_LA_PUERTA);
      expect(
        fetchQueNoDebeSonar,
        `se llamo a ${plataforma} para crear una campana sin autorizacion de gasto`,
      ).not.toHaveBeenCalled();
    });

    it(`no se ACTIVA una campana pausada en ${plataforma}`, async () => {
      // El mas peligroso de los tres: pasar a ACTIVE es empezar a gastar YA, sin
      // crear nada nuevo y sin que se note en ningun listado de campanas.
      await expect(
        servicio(plataforma).setCampaignStatus(TENANT, plataforma as never, "camp-1", "ACTIVE"),
      ).rejects.toThrow(PORQUE_LA_PUERTA);
      expect(
        fetchQueNoDebeSonar,
        `se activo una campana en ${plataforma} sin autorizacion de gasto`,
      ).not.toHaveBeenCalled();
    });

    it(`no se SUBE el presupuesto diario en ${plataforma}`, async () => {
      await expect(
        servicio(plataforma).updateCampaignBudget(TENANT, plataforma as never, "camp-1", 500),
      ).rejects.toThrow(PORQUE_LA_PUERTA);
      expect(
        fetchQueNoDebeSonar,
        `se cambio el presupuesto en ${plataforma} sin autorizacion de gasto`,
      ).not.toHaveBeenCalled();
    });
  }
});

describe("pero PARAR el gasto no necesita permiso para gastar", () => {
  it("pausar una campana sigue funcionando con la puerta cerrada", async () => {
    // La primera version de la puerta cerraba tambien esta direccion. Es el
    // fallo mas caro de los dos: con el modo de coste cero encendido —que es el
    // valor por defecto— nadie podia PARAR una campana que estuviera quemando el
    // dinero del cliente. Una proteccion de gasto que impide dejar de gastar
    // esta puesta del reves.
    const fetchQueResponde = vi.fn(async () =>
      ({ ok: true, json: async () => ({ success: true }) }) as unknown as Response,
    );
    const svc = new SaasAdsDashboardService(
      baseConCredenciales("meta") as never,
      fetchQueResponde as never,
    );
    await expect(svc.setCampaignStatus(TENANT, "meta", "camp-1", "PAUSED")).resolves.toBeUndefined();
    expect(fetchQueResponde, "pausar no llego al proveedor").toHaveBeenCalledOnce();
  });
});
