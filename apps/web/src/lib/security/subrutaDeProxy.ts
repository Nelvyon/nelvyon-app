/**
 * La subruta que un proxy comodin reenvia al backend.
 *
 * Las rutas `[[...path]]` reciben los segmentos ya DECODIFICADOS por Next, los
 * unen con `/` y los pegan detras de una base fija:
 *
 *     const target = `${platformApiBase()}/api/dialer-advanced/${subpath}`;
 *
 * El host no se puede cambiar —es concatenacion, no `new URL(subpath, base)`—
 * asi que no hay salida hacia un tercero y esto NO es una SSRF. Lo que si se
 * puede es RECORRER: un segmento `..` (o su forma codificada `%2e%2e`, que Next
 * decodifica antes de entregarla) sobrevive hasta el `fetch`, que normaliza la
 * ruta y acaba llamando a
 *
 *     https://backend/api/otra-cosa
 *
 * con la cabecera `X-Workspace-Id` que ESTE proxy firma a partir del inquilino
 * autenticado. El backend valida el token por su cuenta, asi que no es una
 * escalada de privilegios; pero un proxy que solo debe hablar con su propia
 * familia de endpoints no tiene por que dejar salir de ella.
 *
 * Se RECHAZA en vez de sanear: reescribir en silencio una ruta que alguien pidio
 * mal esconde el intento, y aqui interesa que se vea.
 */

/** Un segmento aceptable: sin separadores, sin recorridos y sin bytes raros. */
const SEGMENTO_VALIDO = /^[A-Za-z0-9._~@-]+$/;

export class SubrutaNoPermitida extends Error {
  constructor(motivo: string) {
    super(`subruta de proxy no permitida: ${motivo}`);
    this.name = "SubrutaNoPermitida";
  }
}

/**
 * Devuelve la subruta unida, o lanza si algun segmento no es aceptable.
 *
 * `undefined` y la lista vacia son validos: significan «la raiz de la familia».
 */
export function subrutaDeProxy(segmentos: string[] | undefined): string {
  const partes = segmentos ?? [];
  for (const segmento of partes) {
    if (segmento === "") throw new SubrutaNoPermitida("segmento vacio");
    if (segmento === "." || segmento === "..") {
      throw new SubrutaNoPermitida(`recorrido de ruta (${segmento})`);
    }
    if (!SEGMENTO_VALIDO.test(segmento)) {
      // El segmento NO se repite en el mensaje: acaba en los registros y puede
      // llevar cualquier cosa que haya mandado quien llama.
      throw new SubrutaNoPermitida("caracter no permitido en un segmento");
    }
  }
  return partes.join("/");
}
