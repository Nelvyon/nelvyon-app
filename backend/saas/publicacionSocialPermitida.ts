/**
 * El interruptor que faltaba: publicar en una red social es un efecto REAL.
 *
 * ── POR QUE EXISTE ──────────────────────────────────────────────────────────
 *
 * Todos los canales que hablan con el mundo tienen el suyo:
 *
 *     correo      `envioDeCorreoPermitido`
 *     SMS         permitido / ENABLED
 *     WhatsApp    permitido
 *     Google Ads  permitido + simulacion
 *     Meta Ads    `exigirPuertaDeGasto`
 *     redes       — NADA —
 *
 * `SaasSocialService.publishPost` llamaba a `graph.facebook.com` y a LinkedIn
 * con el token real del cliente sin cruzar ninguna puerta. Y no hacia falta que
 * alguien pulsara un boton: `processDueScheduled` lo llama desde el cron, asi
 * que un post programado salia solo.
 *
 * Publicar en la cuenta de un cliente es irreversible de hecho —se puede borrar,
 * pero ya lo han visto— y es exactamente la clase de accion que esta plataforma
 * no debe hacer por accidente.
 *
 * ── POR QUE LANZA Y NO DEVUELVE EN SILENCIO ─────────────────────────────────
 *
 * Es la leccion que ya dejo escrita el interruptor del correo: un envio que se
 * da por hecho sin salir es peor que un error, porque el cliente cree que ha
 * publicado. Aqui ademas importa el ESTADO: al lanzar ANTES de tocar la fila,
 * el post se queda en `scheduled` y el cron lo reintenta —no se marca `failed`,
 * que seria perder trabajo bueno por tener el interruptor bajado.
 *
 * ── POR DEFECTO, CERRADO ────────────────────────────────────────────────────
 *
 * Fuera de produccion no se publica. `NELVYON_SOCIAL_PUBLISH_ENABLED=1` lo
 * enciende a proposito para quien lo necesite.
 */

/** Se intento publicar con el interruptor bajado. */
export class PublicacionSocialDesactivadaError extends Error {
  readonly code = "SOCIAL_PUBLISH_DISABLED";
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "PublicacionSocialDesactivadaError";
  }
}

/** Si esta instancia puede publicar de verdad en una red social. */
export function publicacionSocialPermitida(): boolean {
  const explicito = process.env.NELVYON_SOCIAL_PUBLISH_ENABLED?.trim();
  if (explicito === "0" || explicito?.toLowerCase() === "false") return false;
  if (explicito === "1" || explicito?.toLowerCase() === "true") return true;
  return process.env.NODE_ENV === "production";
}

/** Puerta: lanza si publicar no esta permitido. Se llama ANTES de tocar nada. */
export function exigirPublicacionSocialPermitida(plataforma: string): void {
  if (!publicacionSocialPermitida()) {
    throw new PublicacionSocialDesactivadaError(
      `No se publica en ${plataforma}: NELVYON_SOCIAL_PUBLISH_ENABLED no esta ` +
        "activado y el entorno no es produccion",
    );
  }
}
