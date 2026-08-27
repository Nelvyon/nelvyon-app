/**
 * De qué objeto de Stripe sale la suscripción.
 *
 * VIVE APARTE DEL `route.ts` POR UNA RAZÓN CONCRETA
 * =================================================
 * Next sólo admite un conjunto cerrado de exportaciones en un fichero de ruta
 * —los manejadores y su configuración—, y cualquier otra rompe la comprobación
 * de tipos que genera en `.next/types`. Estaba escrita ahí y salió en la puerta
 * de tipos: un error nuevo sobre la línea base de once.
 *
 * Que no se pueda exportar desde la ruta no significa que no se deba certificar:
 * significa que la lógica no vive en la ruta. Ponerla aquí la hace comprobable
 * sin tocar la forma del fichero que Next controla.
 */
/**
 * El `sub_…` del evento, sea cual sea el objeto que traiga.
 *
 * Para una factura, la suscripción está en `subscription` (API clásica) o
 * colgando de `parent.subscription_details.subscription` (API nueva). Se miran
 * las dos: cuál llega depende de la versión de API con la que esté configurado
 * el endpoint en Stripe, y eso no se decide desde aquí.
 */
export function suscripcionDelEvento(
  tipo: string,
  obj: Record<string, unknown>,
): string {
  if (tipo.startsWith("invoice.")) {
    const directa = obj.subscription;
    if (typeof directa === "string" && directa.length > 0) return directa;
    const padre = obj.parent as Record<string, unknown> | undefined;
    const detalles = padre?.subscription_details as Record<string, unknown> | undefined;
    const anidada = detalles?.subscription;
    if (typeof anidada === "string" && anidada.length > 0) return anidada;
    return "";
  }
  return typeof obj.id === "string" ? obj.id : "";
}
