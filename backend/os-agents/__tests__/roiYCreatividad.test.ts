/**
 * BLOQUE 3 · las cifras de retorno y los activos creativos.
 *
 * Dos sitios donde inventar es especialmente fácil y especialmente caro:
 *
 *   - **ROI**: una división mal protegida produce `Infinity` o `NaN`, y los dos
 *     se pintan en un panel como si fueran una cifra. Un cliente decide su
 *     presupuesto con eso.
 *   - **Creatividad**: cuando el proveedor de imagen falla, lo cómodo es
 *     devolver algo con una URL cualquiera. El resultado es un entregable con
 *     una imagen que no existe.
 */
import { describe, expect, it } from "vitest";

import { ClosedLoopRoiService } from "../ClosedLoopRoiService";

/** Base falsa que devuelve, por orden, las filas que se le indiquen. */
function baseFalsa(respuestas: Array<Array<Record<string, unknown>>>) {
  let i = 0;
  return {
    query: async () => respuestas[Math.min(i++, respuestas.length - 1)] ?? [],
  } as never;
}

/**
 * El gasto NO sale de la base: sale de los conectores de anuncios. Sin
 * inyectarlos, el servicio va a buscar el real y falla por falta de
 * `DATABASE_URL`, que no es lo que se quiere medir aqui.
 */
function servicio(
  respuestas: Array<Array<Record<string, unknown>>>,
  gasto: { google?: number; meta?: number } = {},
) {
  return new ClosedLoopRoiService({
    db: baseFalsa(respuestas),
    googleAdsService: {
      getAccountSummary: async () => ({ totalSpend: gasto.google ?? 0 }),
    },
    metaAdsService: {
      getAccountSummary: async () => ({ totalSpend: gasto.meta ?? 0 }),
      sendConversionEvent: async () => undefined,
    },
  } as never);
}

describe("BLOQUE 3 · métricas de retorno", () => {
  it("EL CONTROL: con datos reales, las cifras salen", async () => {
    // Sin esto, un servicio que devolviera ceros siempre pasaría las pruebas de
    // abajo y dejaría el panel mudo.
    const r = await servicio(
      [[{ total_revenue: "1000", conversions: "10" }]],
      { google: 250 },
    ).getRoiMetrics("u1");

    expect(r.totalRevenue).toBe(1000);
    expect(r.conversions).toBe(10);
    expect(r.totalSpend).toBe(250);
    expect(r.roiPercentage).toBeCloseTo(300);
    expect(r.costPerConversion).toBe(25);
  });

  it("sin gasto, el ROI es 0 y NO `Infinity`", async () => {
    // La división por cero de manual. `Infinity` se pinta en un panel como una
    // cifra más, y nadie lo lee como «no hay datos».
    const r = await servicio([[{ total_revenue: "500", conversions: "5" }]]).getRoiMetrics("u1");

    expect(Number.isFinite(r.roiPercentage)).toBe(true);
    expect(r.roiPercentage).toBe(0);
  });

  it("sin conversiones, el coste por conversión es 0 y no `Infinity`", async () => {
    const r = await servicio(
      [[{ total_revenue: "0", conversions: "0" }]],
      { google: 300 },
    ).getRoiMetrics("u1");

    expect(Number.isFinite(r.costPerConversion)).toBe(true);
    expect(r.costPerConversion).toBe(0);
  });

  it("sin ninguna fila, todo sale a cero y nada sale a `NaN`", async () => {
    // El caso de un cliente nuevo. `NaN` en una columna numérica se guarda sin
    // error en PostgreSQL y corrompe el informe en silencio; aquí se comprueba
    // que ni siquiera llega a formarse.
    const r = await servicio([[]]).getRoiMetrics("u1");
    for (const [clave, valor] of Object.entries(r)) {
      expect(Number.isFinite(valor as number), `${clave} no es finito`).toBe(true);
    }
  });

  it("un valor no numérico en la base no se convierte en `NaN`", async () => {
    // Una columna con texto basura -de una migración, de un import- no puede
    // acabar en un panel como si fuera dinero.
    const r = await servicio(
      [[{ total_revenue: "no-es-un-numero", conversions: "tampoco" }]],
      { google: Number.NaN },
    ).getRoiMetrics("u1");

    for (const [clave, valor] of Object.entries(r)) {
      expect(Number.isFinite(valor as number), `${clave} salió como ${String(valor)}`).toBe(true);
    }
  });

  it("un ROI negativo se reporta como negativo, no se maquilla", async () => {
    // Gastar más de lo que se ingresa es un dato, y esconderlo sería la mentira
    // más rentable a corto plazo y más cara después.
    const r = await servicio(
      [[{ total_revenue: "100", conversions: "2" }]],
      { google: 500 },
    ).getRoiMetrics("u1");

    expect(r.roiPercentage).toBeLessThan(0);
  });
});
