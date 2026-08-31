/**
 * UNA PETICIÓN CON PLAZO NO PIERDE EL PLAZO POR PODER CANCELARSE.
 *
 * QUÉ ESTABA MAL. `fetchWithTimeout` hacía:
 *
 *     signal: signal ?? AbortSignal.timeout(timeoutMs),
 *
 * Si quien llama pasaba SU propio `signal` —para poder cancelar la petición—,
 * el plazo se descartaba entero. Una función llamada `fetchWithTimeout`
 * quedándose sin plazo, en silencio, y precisamente en el caso en que alguien
 * se había preocupado de controlar la petición.
 *
 * Su propio comentario decía para qué existe: «prevents cron/worker hangs on
 * slow upstreams». Un cron con un servicio lento al otro lado se habría
 * quedado colgado indefinidamente.
 *
 * NO ERA UN FALLO VIVO. Se comprobaron las 19 llamadas del árbol: ninguna pasa
 * `signal` hoy. Pero el tipo acepta `RequestInit`, así que la API lo invita, y
 * el primer sitio que necesitara cancelar habría perdido la protección sin
 * enterarse — que es la peor forma de perderla.
 *
 * POR QUÉ SE PRUEBA `senalCombinada` Y NO `fetchWithTimeout`. Lo que puede
 * equivocarse aquí es a QUÉ señal se hace caso, y eso se comprueba con dos
 * señales y ningún servidor. Probar el `fetch` exigiría levantar uno o doblar
 * el global, y mediría la red en vez de la decisión.
 *
 * COSTE EXTERNO: 0 €. No se abre ninguna conexión.
 */
import { describe, expect, it } from "vitest";

import {
  EXTERNAL_FETCH_TIMEOUT_MS,
  senalCombinada,
} from "../fetchWithTimeout";

/** Espera a que una señal aborte, o se rinde. */
function esperarAborto(senal: AbortSignal, ms = 300): Promise<string | null> {
  return new Promise((resolve) => {
    if (senal.aborted) return resolve(String((senal.reason as Error)?.name ?? "abortada"));
    const fin = setTimeout(() => resolve(null), ms);
    senal.addEventListener(
      "abort",
      () => {
        clearTimeout(fin);
        resolve(String((senal.reason as Error)?.name ?? "abortada"));
      },
      { once: true },
    );
  });
}

describe("sin señal de quien llama", () => {
  it("el plazo gobierna, como siempre", async () => {
    const s = senalCombinada(20);
    expect(await esperarAborto(s)).not.toBeNull();
  });

  it("EL CONTROL: antes de que venza, no está abortada", () => {
    // Sin esto, una señal ya abortada pasaría la prueba de arriba sin haber
    // esperado nada — y abortaría todas las peticiones al instante.
    expect(senalCombinada(10_000).aborted).toBe(false);
  });
});

describe("con señal de quien llama", () => {
  it("LA REGLA: el plazo SIGUE existiendo", async () => {
    // El defecto exacto: pasar una señal borraba el plazo.
    const mia = new AbortController();
    const s = senalCombinada(20, mia.signal);
    expect(await esperarAborto(s), "el plazo desapareció al pasar una señal").not.toBeNull();
  });

  it("y la cancelación de quien llama también funciona", async () => {
    // La otra mitad: arreglar el plazo no puede romper la cancelación.
    const mia = new AbortController();
    const s = senalCombinada(10_000, mia.signal);
    setTimeout(() => mia.abort(new Error("cancelado a mano")), 10);
    expect(await esperarAborto(s)).not.toBeNull();
  });

  it("aborta con la PRIMERA que salte, no con una fija", async () => {
    // Si siempre ganara el plazo, cancelar no serviría; si siempre ganara la
    // de quien llama, volveríamos al defecto.
    const mia = new AbortController();
    const s = senalCombinada(10_000, mia.signal);
    mia.abort(new Error("primero yo"));
    expect(s.aborted).toBe(true);
  });

  it("una señal que YA venía abortada se respeta", async () => {
    // No hay evento que escuchar: si no se comprueba el estado inicial, la
    // petición saldría igualmente.
    const mia = new AbortController();
    mia.abort(new Error("ya estaba"));
    expect(senalCombinada(10_000, mia.signal).aborted).toBe(true);
  });
});

describe("el plazo por defecto sigue siendo el declarado", () => {
  it("EXTERNAL_FETCH_TIMEOUT_MS no ha cambiado", () => {
    // Es el contrato con los 19 sitios que llaman sin decir plazo.
    expect(EXTERNAL_FETCH_TIMEOUT_MS).toBe(30_000);
  });
});
