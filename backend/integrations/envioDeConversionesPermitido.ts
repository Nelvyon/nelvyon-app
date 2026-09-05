/**
 * Mandar eventos de conversion a Meta es un efecto REAL, aunque no cueste euros.
 *
 * ── POR QUE HACE FALTA UNA PUERTA ───────────────────────────────────────────
 *
 * `MetaAdsService.sendConversionEvent` publica en la Conversions API de Meta con
 * el pixel y el token del cliente. No gasta dinero directamente, y por eso se
 * quedo sin puerta cuando se pusieron las de los demas canales: la comprobacion
 * mental fue «esto no factura».
 *
 * Pero manda DATOS DE LOS USUARIOS DEL CLIENTE a una plataforma externa, y ese
 * envio no se deshace. Ademas alimenta la optimizacion de campanas: eventos
 * falsos —de una suite, de un entorno de pruebas— ensucian el aprendizaje del
 * anunciante y degradan campanas que si gastan.
 *
 * ── CERRADO POR DEFECTO ─────────────────────────────────────────────────────
 *
 * Mismo patron que el correo y las redes: fuera de produccion no se envia.
 * `NELVYON_META_CAPI_ENABLED=1` lo enciende a proposito.
 *
 * ── POR QUE LANZA ───────────────────────────────────────────────────────────
 *
 * Devolver en silencio haria creer a quien llama que la conversion quedo
 * registrada, y la atribucion de una campana se construye sobre eso. Un hueco
 * silencioso en la atribucion es peor que un error visible.
 */

/** Se intento enviar una conversion con la puerta cerrada. */
export class EnvioDeConversionesDesactivadoError extends Error {
  readonly code = "CAPI_SEND_DISABLED";
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "EnvioDeConversionesDesactivadoError";
  }
}

/** Si esta instancia puede mandar conversiones de verdad. */
export function envioDeConversionesPermitido(): boolean {
  const explicito = process.env.NELVYON_META_CAPI_ENABLED?.trim();
  if (explicito === "0" || explicito?.toLowerCase() === "false") return false;
  if (explicito === "1" || explicito?.toLowerCase() === "true") return true;
  return process.env.NODE_ENV === "production";
}

/** Puerta: lanza si enviar conversiones no esta permitido. */
export function exigirEnvioDeConversionesPermitido(destino: string): void {
  if (!envioDeConversionesPermitido()) {
    throw new EnvioDeConversionesDesactivadoError(
      `No se envian conversiones a ${destino}: NELVYON_META_CAPI_ENABLED no esta ` +
        "activado y el entorno no es produccion",
    );
  }
}
