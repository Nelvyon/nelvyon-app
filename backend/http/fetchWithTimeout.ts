/**
 * `fetch` con plazo, para que un servicio externo lento no cuelgue un cron.
 *
 * QUÉ HACÍA MAL, y era justo lo que esta función existe para impedir:
 *
 *     signal: signal ?? AbortSignal.timeout(timeoutMs),
 *
 * Si quien llama pasaba SU propio `signal` —para poder cancelar—, el plazo se
 * descartaba entero. La función se llama `fetchWithTimeout` y se quedaba sin
 * plazo, en silencio y sin avisar.
 *
 * NO ERA UN FALLO VIVO: se comprobaron las 19 llamadas del árbol y ninguna pasa
 * `signal` hoy. Pero el tipo acepta `RequestInit`, así que la API lo invita, y
 * el primer sitio que necesite cancelar perdería la protección sin enterarse —
 * que es la peor forma de perderla.
 *
 * AHORA SE COMBINAN LAS DOS SEÑALES. Se aborta con la primera que salte: la de
 * quien llama, o el plazo. Ninguna anula a la otra.
 */
export const EXTERNAL_FETCH_TIMEOUT_MS = 30_000;
export const CRM_SYNC_FETCH_TIMEOUT_MS = 45_000;

export type FetchWithTimeoutInit = RequestInit & { timeoutMs?: number };

/**
 * La señal que gobierna una petición: el plazo, y la de quien llama si la hay.
 *
 * Se expone para poder probar la combinación sin abrir ninguna conexión: lo que
 * puede equivocarse aquí es a QUÉ se hace caso, y eso se comprueba con dos
 * señales y ningún servidor.
 */
export function senalCombinada(timeoutMs: number, delQueLlama?: AbortSignal | null): AbortSignal {
  const plazo = AbortSignal.timeout(timeoutMs);
  if (!delQueLlama) return plazo;
  // `AbortSignal.any` aborta con la PRIMERA que salte. Está en Node desde la
  // 20.3; este proyecto corre sobre `node:20-alpine`.
  if (typeof AbortSignal.any === "function") return AbortSignal.any([delQueLlama, plazo]);

  // Respaldo para un entorno sin `any`: se propaga a mano. Es la misma
  // semántica —la primera que salte— escrita a pelo.
  const control = new AbortController();
  const abortar = (razon: unknown) => control.abort(razon);
  if (delQueLlama.aborted) abortar(delQueLlama.reason);
  else delQueLlama.addEventListener("abort", () => abortar(delQueLlama.reason), { once: true });
  if (plazo.aborted) abortar(plazo.reason);
  else plazo.addEventListener("abort", () => abortar(plazo.reason), { once: true });
  return control.signal;
}

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: FetchWithTimeoutInit,
): Promise<Response> {
  const { timeoutMs = EXTERNAL_FETCH_TIMEOUT_MS, signal, ...rest } = init ?? {};
  return fetch(input, {
    ...rest,
    signal: senalCombinada(timeoutMs, signal),
  });
}
