/**
 * BLOQUE 6 · los limites limitan de verdad.
 *
 * Un cortacircuitos y un limitador de concurrencia son las dos piezas que
 * impiden que un fallo de fuera se lleve por delante a NELVYON. Las dos tienen
 * la misma propiedad incomoda: **cuando funcionan no se nota nada**, asi que un
 * defecto puede vivir ahi durante meses sin que ninguna metrica lo delate.
 *
 * Lo que se comprueba:
 *
 *   1. Mirar el estado del cortacircuitos no puede CAMBIARLO.
 *   2. Medio abierto significa **una** sonda, no barra libre.
 *   3. El limitador de concurrencia nunca supera su propio limite.
 *   4. Un esperador abortado no deja a otro esperando para siempre.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { McpCircuitBreaker, resetAllCircuitsForTests } from "../CircuitBreaker";

beforeEach(() => {
  resetAllCircuitsForTests();
});

// ── 1 y 2 · el cortacircuitos ────────────────────────────────────────────────

describe("BLOQUE 6 · el cortacircuitos", () => {
  it("EL CONTROL: se abre al llegar al umbral y corta", () => {
    // Sin esto, un cortacircuitos que no se abriera nunca pasaria todo lo de
    // abajo y dejaria a NELVYON martilleando una dependencia caida.
    const cb = new McpCircuitBreaker(3, 60_000);
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
  });

  it("consultar el estado NO abre el paso", () => {
    /**
     * `getState()` llamaba a `isOpen()`, e `isOpen()` **muta**: si ha pasado el
     * tiempo de reposo, pasa el circuito de `open` a `half_open`.
     *
     * O sea que un panel de observabilidad sondeando el estado movia el
     * circuito por su cuenta. El observador cambiaba lo observado, y peor: la
     * siguiente peticion real se colaba por un `half_open` que no habia abierto
     * ella, sin ser la sonda de nadie.
     *
     * Consultar tiene que ser una lectura. Si no lo es, ni la metrica vale ni
     * el circuito protege.
     */
    vi.useFakeTimers();
    try {
      const cb = new McpCircuitBreaker(1, 1000);
      cb.recordFailure();
      expect(cb.getState()).toBe("open");

      vi.setSystemTime(new Date(Date.now() + 5000));

      // Mirar dos veces seguidas no puede dejarlo pasando.
      const observado = cb.getState();
      expect(observado, "consultar el estado lo cambio solo").toBe("open");
      expect(
        cb.getState(),
        "dos consultas seguidas dan resultados distintos sin que pase nada",
      ).toBe("open");
    } finally {
      vi.useRealTimers();
    }
  });

  it("medio abierto deja pasar UNA sonda, no a todo el mundo", () => {
    /**
     * `isOpen()` devolvia `false` en cuanto entraba en `half_open`, y seguia
     * devolviendolo en TODAS las llamadas siguientes hasta que alguien
     * registrase exito o fallo.
     *
     * Resultado: al cumplirse el tiempo de reposo, toda la cola de peticiones
     * acumuladas entra a la vez contra la dependencia que acababa de caerse.
     * Eso no es recuperarse: es rematarla, y es como una caida breve se
     * convierte en una larga.
     *
     * Medio abierto significa una sonda. Si va bien, se cierra; si va mal, se
     * vuelve a abrir. Mientras se decide, los demas siguen cortados.
     */
    vi.useFakeTimers();
    try {
      const cb = new McpCircuitBreaker(1, 1000);
      cb.recordFailure();
      vi.setSystemTime(new Date(Date.now() + 5000));

      const pasan = [cb.isOpen(), cb.isOpen(), cb.isOpen()].filter((abierto) => !abierto).length;
      expect(pasan, `pasaron ${pasan} peticiones por un circuito medio abierto`).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("si la sonda falla, se vuelve a cerrar el paso", () => {
    vi.useFakeTimers();
    try {
      const cb = new McpCircuitBreaker(1, 1000);
      cb.recordFailure();
      vi.setSystemTime(new Date(Date.now() + 5000));

      expect(cb.isOpen()).toBe(false); // la sonda pasa
      cb.recordFailure(); // y falla
      expect(cb.isOpen(), "la sonda fallo y el circuito siguio dejando pasar").toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("si la sonda va bien, se cierra el circuito", () => {
    vi.useFakeTimers();
    try {
      const cb = new McpCircuitBreaker(1, 1000);
      cb.recordFailure();
      vi.setSystemTime(new Date(Date.now() + 5000));
      expect(cb.isOpen()).toBe(false);
      cb.recordSuccess();
      expect(cb.getState()).toBe("closed");
      expect(cb.isOpen()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── 3 y 4 · el limitador de concurrencia ─────────────────────────────────────

describe("BLOQUE 6 · el limitador de concurrencia", () => {
  async function cargarLimitador(maxConcurrent: number) {
    vi.resetModules();
    process.env.ROUTER_MAX_CONCURRENT = String(maxConcurrent);
    return import("../../../local-ai/router/ExecutionLimiter");
  }

  it("nunca deja mas ejecuciones a la vez que su limite", async () => {
    /**
     * `active++` ocurria DESPUES del `await`, y `releaseSlot()` decrementaba
     * ANTES de despertar al esperador. Entre esas dos cosas hay una ventana en
     * la que `active` esta por debajo de lo real.
     *
     * Con limite 1: el que suelta baja a 0, el esperador todavia no se ha
     * despertado —su continuacion va en una microtarea— y un tercero que llegue
     * en ese hueco ve `0 < 1` y entra. Cuando el esperador despierta, hace
     * `active++` y quedan **dos** ejecutandose con limite de uno.
     *
     * Un limitador que puede superar su propio limite no limita: retrasa.
     */
    const { acquireExecutionSlot, resetExecutionLimiterForTests } = await cargarLimitador(1);
    resetExecutionLimiterForTests();

    let simultaneos = 0;
    let maximo = 0;

    async function tarea() {
      const slot = await acquireExecutionSlot();
      simultaneos += 1;
      maximo = Math.max(maximo, simultaneos);
      await new Promise((r) => setTimeout(r, 5));
      simultaneos -= 1;
      slot.release();
    }

    await Promise.all([tarea(), tarea(), tarea(), tarea(), tarea()]);
    expect(maximo, `hubo ${maximo} ejecuciones a la vez con limite 1`).toBeLessThanOrEqual(1);
  });

  it("soltar y pedir en el mismo turno no cuela a un tercero", async () => {
    /**
     * La ventana exacta, que la prueba de arriba NO abre porque crea las cinco
     * tareas de golpe y para cuando alguien libera ya no llega nadie nuevo.
     *
     * Aqui se reproduce a mano: se libera y **en el mismo turno sincrono** pide
     * otro. Con el codigo original `releaseSlot()` bajaba `active` a 0, el
     * esperador no habia despertado todavia —su continuacion va en una
     * microtarea— y el recien llegado veia `0 < 1` y entraba. Cuando el
     * esperador despertaba hacia `active++`: **dos ejecutandose con limite 1**.
     */
    const { acquireExecutionSlot, resetExecutionLimiterForTests } = await cargarLimitador(1);
    resetExecutionLimiterForTests();

    const primero = await acquireExecutionSlot();

    let esperadorEntro = false;
    const esperador = acquireExecutionSlot().then((s) => {
      esperadorEntro = true;
      return s;
    });

    // Sin ceder el control entre las dos lineas: esta es la ventana.
    primero.release();
    const colado = acquireExecutionSlot().then(() => "colado" as const);

    await esperador;
    expect(esperadorEntro).toBe(true);

    const resultado = await Promise.race([
      colado,
      new Promise<"esperando">((r) => setTimeout(() => r("esperando"), 100)),
    ]);
    expect(
      resultado,
      "un tercero se colo en la ventana entre soltar y despertar: dos ejecuciones con limite 1",
    ).toBe("esperando");
  });

  it("un esperador abortado no deja a otro colgado para siempre", async () => {
    /**
     * Al abortar, el esperador rechazaba su promesa **pero se quedaba en la
     * lista**. Al liberar el hueco, `releaseSlot()` sacaba a ese muerto y le
     * llamaba a `resolve()`, que ya no hacia nada: la senal de «te toca» se
     * gastaba en alguien que ya no estaba.
     *
     * El siguiente vivo se quedaba esperando otra liberacion que podia no
     * llegar nunca. Un trabajo colgado indefinidamente sin error, sin timeout y
     * sin nada que lo delate.
     */
    const { acquireExecutionSlot, resetExecutionLimiterForTests } = await cargarLimitador(1);
    resetExecutionLimiterForTests();

    const primero = await acquireExecutionSlot();

    const abortador = new AbortController();
    const abortado = acquireExecutionSlot(abortador.signal).catch(() => "abortado" as const);

    let vivoEntro = false;
    const vivo = acquireExecutionSlot().then((s) => {
      vivoEntro = true;
      return s;
    });

    abortador.abort();
    await abortado;

    // Se libera UNA vez. Esa liberacion tiene que llegar al que sigue vivo.
    primero.release();

    const resultado = await Promise.race([
      vivo.then(() => "entro" as const),
      new Promise<"colgado">((r) => setTimeout(() => r("colgado"), 200)),
    ]);

    expect(
      resultado,
      "el hueco se lo llevo un esperador abortado y el vivo se quedo colgado",
    ).toBe("entro");
    expect(vivoEntro).toBe(true);
  });
});
