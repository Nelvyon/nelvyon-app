/**
 * Mandar conversiones a Meta exige que la puerta este abierta.
 *
 * ── POR QUE ESTO IMPORTA AUNQUE NO CUESTE EUROS ─────────────────────────────
 *
 * `sendConversionEvent` publica en la Conversions API con el pixel y el token
 * del cliente. Se quedo sin puerta cuando se pusieron las de los demas canales
 * porque «esto no factura».
 *
 * Pero manda datos de los usuarios del cliente a una plataforma externa —envio
 * que no se deshace— y alimenta la optimizacion de campanas: eventos falsos de
 * una suite ensucian el aprendizaje del anunciante y degradan campanas que SI
 * gastan.
 *
 * COSTE EXTERNO: 0 EUR. Si el codigo llegara a la red, el doble revienta.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EnvioDeConversionesDesactivadoError,
  envioDeConversionesPermitido,
  exigirEnvioDeConversionesPermitido,
} from "../envioDeConversionesPermitido";

afterEach(() => vi.unstubAllEnvs());

describe("la puerta de conversiones", () => {
  it("EL CONTROL: encendida a proposito, deja pasar", () => {
    // Sin este control, una puerta que cerrara siempre pasaria las pruebas de
    // abajo y dejaria el producto sin poder atribuir nada.
    vi.stubEnv("NELVYON_META_CAPI_ENABLED", "1");
    expect(envioDeConversionesPermitido()).toBe(true);
    expect(() => exigirEnvioDeConversionesPermitido("Meta")).not.toThrow();
  });

  it("apagada explicitamente, lanza", () => {
    vi.stubEnv("NELVYON_META_CAPI_ENABLED", "0");
    expect(envioDeConversionesPermitido()).toBe(false);
    expect(() => exigirEnvioDeConversionesPermitido("Meta")).toThrow(
      EnvioDeConversionesDesactivadoError,
    );
  });

  it("fuera de produccion esta CERRADA por defecto, sin declarar nada", () => {
    // Es donde corren las suites. El valor por defecto tiene que ser el seguro.
    vi.stubEnv("NODE_ENV", "test");
    expect(envioDeConversionesPermitido()).toBe(false);
  });

  it("LANZA en vez de devolver en silencio", () => {
    // Un hueco silencioso en la atribucion es peor que un error visible: quien
    // llama creeria que la conversion quedo registrada.
    vi.stubEnv("NELVYON_META_CAPI_ENABLED", "0");
    let capturado: unknown = null;
    try {
      exigirEnvioDeConversionesPermitido("Meta");
    } catch (e) {
      capturado = e;
    }
    expect(capturado, "no lanzo").toBeInstanceOf(EnvioDeConversionesDesactivadoError);
    expect((capturado as Error).message).toMatch(/NELVYON_META_CAPI_ENABLED/);
  });
});
