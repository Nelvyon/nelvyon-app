/**
 * Leer el cuerpo de una peticion con un tope que NO depende del cliente.
 *
 * EL PROBLEMA
 * -----------
 * En el App Router de Next las rutas no tienen limite de cuerpo. El que traian
 * las API de `pages/` (1 MB) no existe aqui, y el `MAX_BODY_SIZE` de FastAPI
 * —10 MB— solo cubre el backend de Python: no protege una ruta de Next.
 *
 * Asi que `await req.json()` y `await req.formData()` en una ruta ANONIMA como
 * `/api/forms/[formId]/submit` bufferizaban lo que hiciera falta. El limite por
 * IP no ayuda: son 20 peticiones por minuto, pero cada una puede traer cientos
 * de megas.
 *
 * `Content-Length` NO BASTA
 * -------------------------
 * Es una DECLARACION, y no siempre viaja: una peticion con
 * `Transfer-Encoding: chunked` no la lleva. Comprobar solo esa cabecera se
 * esquiva omitiendola — es exactamente el defecto que ya se corrigio en
 * `middlewares/security.py`, y la razon de que exista
 * `test_request_body_limit.py`.
 *
 * Aqui se hace lo mismo que alli: la cabecera se mira porque corta ANTES de leer
 * nada, que es lo barato; y para las que no la traen, se lee por trozos y se
 * corta en cuanto se pasa.
 */

/** 10 MB, el mismo tope que `MAX_BODY_SIZE` en el lado Python. */
export const TOPE_DE_CUERPO = 10 * 1024 * 1024;

export class CuerpoDemasiadoGrande extends Error {
  readonly status = 413;
  constructor(leidos: number, tope: number) {
    super(`cuerpo de peticion demasiado grande (${leidos} > ${tope})`);
    this.name = "CuerpoDemasiadoGrande";
  }
}

/**
 * Los bytes del cuerpo, o `CuerpoDemasiadoGrande` si se pasa del tope.
 *
 * Lo que se lee ANTES de cortar esta acotado por el tope: se corta en cuanto se
 * supera, no despues de tenerlo todo en memoria.
 */
export async function bytesConTope(
  req: Request,
  tope: number = TOPE_DE_CUERPO,
): Promise<Uint8Array> {
  // Corte barato: si lo DECLARA, se cree para rechazar (nunca para aceptar).
  const declarado = req.headers.get("content-length");
  if (declarado && /^\d+$/.test(declarado) && Number(declarado) > tope) {
    throw new CuerpoDemasiadoGrande(Number(declarado), tope);
  }

  const cuerpo = req.body;
  if (!cuerpo) {
    // Sin flujo: queda `arrayBuffer()`, que ya no puede pasarse del tope si la
    // cabecera venia y era honesta. Se vuelve a comprobar por si no venia.
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength > tope) throw new CuerpoDemasiadoGrande(buf.byteLength, tope);
    return buf;
  }

  const trozos: Uint8Array[] = [];
  let leidos = 0;
  const lector = cuerpo.getReader();
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      if (!value) continue;
      leidos += value.byteLength;
      if (leidos > tope) {
        // Se deja de LEER y no se cancela el flujo.
        //
        // Cancelar seria lo natural —decirle al cliente que pare—, pero en Node
        // deja un rechazo SUELTO: undici sigue encolando en el flujo del cuerpo
        // despues de la cancelacion y lanza «Invalid state: ReadableStream is
        // already closed» fuera de toda promesa. Un rechazo no capturado tumba el
        // proceso por defecto, asi que la proteccion contra la caida seria la
        // caida. Medido con las tres variantes: cancelar por el lector, cancelar
        // por el flujo tras soltar el cerrojo, y no cancelar. Solo la ultima
        // queda limpia.
        //
        // Lo que se gana igual es lo que importa: NUNCA se acumula mas del tope
        // en memoria, que es el vector real. Lo que no se gana es ancho de banda
        // —el cliente puede seguir enviando hasta que la respuesta 413 cierre la
        // conexion—, y eso es un precio aceptable por no derribar el proceso.
        throw new CuerpoDemasiadoGrande(leidos, tope);
      }
      trozos.push(value);
    }
  } finally {
    lector.releaseLock();
  }

  const salida = new Uint8Array(leidos);
  let desplazamiento = 0;
  for (const t of trozos) {
    salida.set(t, desplazamiento);
    desplazamiento += t.byteLength;
  }
  return salida;
}

/** El cuerpo como texto, con tope. */
export async function textoConTope(
  req: Request,
  tope: number = TOPE_DE_CUERPO,
): Promise<string> {
  return new TextDecoder().decode(await bytesConTope(req, tope));
}

/**
 * El cuerpo como JSON, con tope.
 *
 * Devuelve `null` si no es JSON valido, igual que hacian los `catch {}` de las
 * rutas: el tope es lo unico que cambia, no como se trata un cuerpo malformado.
 */
export async function jsonConTope<T = Record<string, unknown>>(
  req: Request,
  tope: number = TOPE_DE_CUERPO,
): Promise<T | null> {
  const texto = await textoConTope(req, tope);
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

/**
 * El cuerpo como `FormData`, con tope.
 *
 * Se leen los bytes acotados y se reconstruye una `Response` con ellos para que
 * la analice la implementacion de la plataforma: asi el troceado multipart lo
 * sigue haciendo quien sabe hacerlo, pero sobre una entrada ya acotada.
 */
export async function formDataConTope(
  req: Request,
  tope: number = TOPE_DE_CUERPO,
): Promise<FormData> {
  const bytes = await bytesConTope(req, tope);
  const tipo = req.headers.get("content-type") ?? "application/octet-stream";
  // `Blob` y no el `Uint8Array` pelado: segun la `lib` de TypeScript que toque,
  // un `Uint8Array<ArrayBufferLike>` no encaja en `BodyInit` —podria estar
  // respaldado por un `SharedArrayBuffer`— y el tipo no compila.
  //
  // El `type` NO se le pone al `Blob`: lo normaliza a MINUSCULAS, y el `boundary`
  // de un multipart distingue mayusculas. Al bajarlo, el separador dejaba de
  // coincidir y el troceado fallaba con «no boundary found in multipart body».
  // La cabecera de la `Response` lo conserva tal cual.
  const blob = new Blob([bytes as unknown as BlobPart]);
  return new Response(blob, { headers: { "content-type": tipo } }).formData();
}
