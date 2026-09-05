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
 * ── QUE COMPRUEBA ESTA BATERIA ──────────────────────────────────────────────
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

/** Un `fetch` que revienta: llegar a la red con la puerta cerrada es el fallo. */
const fetchQueNoDebeSonar = vi.fn(async (): Promise<Response> => {
  throw new Error("se llamo a Meta con la puerta de gasto cerrada");
});

/** Credenciales presentes: la proteccion tiene que ser la PUERTA, no su ausencia. */
function baseConCredenciales() {
  return {
    query: consultaFalsaCon(() => [
      {
        id: "cred-1",
        tenant_id: TENANT,
        provider: "meta_ads",
        access_token: "token-del-cliente",
        ad_account_id: "act_123",
        account_id: "123",
        external_account_id: "123",
      },
    ]),
  };
}

function servicio() {
  return new SaasAdsDashboardService(
    baseConCredenciales() as never,
    fetchQueNoDebeSonar as never,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  fetchQueNoDebeSonar.mockClear();
});

describe("con la puerta de gasto cerrada, no se toca la cuenta del cliente", () => {
  it("no se CREA una campana", async () => {
    await expect(
      servicio().createCampaign(TENANT, {
        platform: "meta",
        name: "Campana de prueba",
        dailyBudgetUsd: 50,
        objective: "OUTCOME_TRAFFIC",
      } as never),
    ).rejects.toThrow(/gasto|GastoDenegado|coste/i);
    expect(
      fetchQueNoDebeSonar,
      "se llamo a Meta para crear una campana sin autorizacion de gasto",
    ).not.toHaveBeenCalled();
  });

  it("no se ACTIVA una campana pausada", async () => {
    // El mas peligroso de los tres: pasar a ACTIVE es empezar a gastar YA, sin
    // crear nada nuevo y sin que se note en ningun listado de campanas.
    await expect(
      servicio().setCampaignStatus(TENANT, "meta", "camp-1", "ACTIVE"),
      // Se exige que rechace POR LA PUERTA, no por cualquier otro motivo: si
      // fallara al leer credenciales, la prueba pasaria sin probar nada.
    ).rejects.toThrow(/gasto|GastoDenegado|coste/i);
    expect(
      fetchQueNoDebeSonar,
      "se activo una campana sin autorizacion de gasto",
    ).not.toHaveBeenCalled();
  });

  it("no se SUBE el presupuesto diario", async () => {
    await expect(
      servicio().updateCampaignBudget(TENANT, "meta", "camp-1", 500),
    ).rejects.toThrow(/gasto|GastoDenegado|coste/i);
    expect(
      fetchQueNoDebeSonar,
      "se cambio el presupuesto sin autorizacion de gasto",
    ).not.toHaveBeenCalled();
  });
});
