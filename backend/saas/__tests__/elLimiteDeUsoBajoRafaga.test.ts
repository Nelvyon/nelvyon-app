/**
 * BLOQUE 8 · el límite de uso bajo ráfaga.
 *
 * `checkPublicApiRateLimit` es lo único que separa una integración de un cliente
 * de un bucle infinito contra la API pública. Vive en un `Map` del proceso, y
 * eso tiene dos consecuencias que conviene no confundir:
 *
 *   - Dentro de un proceso, **es exacto**. JavaScript es de un solo hilo y el
 *     contador se incrementa sin `await` por medio, así que no hay carrera: una
 *     ráfaga de mil llamadas simultáneas cuenta mil. Eso se mide aquí.
 *   - Entre procesos, **es una aproximación**. Con N instancias el límite
 *     efectivo es N × el configurado, porque cada una tiene su `Map`.
 *
 * Lo segundo no es un defecto oculto: es un compromiso, y lo que hace falta es
 * que esté escrito y que falle en la dirección buena. Un límite que se pasa de
 * generoso deja pasar tráfico de más; uno que contara mal **de menos** cortaría a
 * clientes legítimos, que es peor. Se comprueba cuál de las dos cosas hace.
 *
 * Y hay una propiedad que sí es de corrección y no de capacidad: **el gasto de
 * una clave no puede consumir la cuota de otra**. Eso ya se certificó en el
 * Bloque 7; aquí se mide bajo ráfaga concurrente, que es distinto.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  checkPublicApiRateLimit,
  getRateLimitRemaining,
  resetRateLimitForTests,
} from "../requirePublicApiContext";

const LIMITE = 60;

beforeEach(() => resetRateLimitForTests());
afterEach(() => resetRateLimitForTests());

describe("BLOQUE 8 · el contador no se pierde cuentas", () => {
  it("EL CONTROL: las primeras del minuto pasan", () => {
    /**
     * Sin este control, un limitador que rechazara todo pasaría los casos de
     * abajo y dejaría la API pública inservible — la avería más cara, porque el
     * cliente no ve un error suyo sino que NELVYON no funciona.
     */
    for (let i = 0; i < LIMITE; i += 1) {
      expect(checkPublicApiRateLimit("clave-A", LIMITE), `llamada ${i + 1}`).toBe(true);
    }
  });

  it("MEDIDO: una ráfaga de 1000 cuenta exactamente 1000", () => {
    /**
     * La propiedad que un `Map` con `count++` sí garantiza dentro de un proceso.
     * Se mide en vez de suponerse: si alguna vez se metiera un `await` en medio
     * del incremento, aparecería la carrera y esta prueba lo vería.
     */
    const N = 1_000;
    let permitidas = 0;
    for (let i = 0; i < N; i += 1) {
      if (checkPublicApiRateLimit("clave-rafaga", LIMITE)) permitidas += 1;
    }
    console.info(`rafaga de ${N} sobre limite ${LIMITE}: ${permitidas} permitidas`);
    expect(
      permitidas,
      `se permitieron ${permitidas} de ${N} con limite ${LIMITE}: el contador pierde cuentas`,
    ).toBe(LIMITE);
  });

  it("MEDIDO: una ráfaga CONCURRENTE tampoco pierde cuentas", async () => {
    /**
     * Lo mismo, pero con las llamadas repartidas por el bucle de eventos. Si el
     * incremento y la comprobación estuvieran separados por un `await`, dos
     * llamadas leerían el mismo valor y las dos se creerían dentro del límite.
     */
    const N = 500;
    const rs = await Promise.all(
      Array.from({ length: N }, async () => {
        await Promise.resolve();
        return checkPublicApiRateLimit("clave-concurrente", LIMITE);
      }),
    );
    const permitidas = rs.filter(Boolean).length;
    console.info(`rafaga concurrente de ${N}: ${permitidas} permitidas`);
    expect(permitidas, "el contador perdio cuentas con llamadas entrelazadas").toBe(LIMITE);
  });

  it("falla en la dirección BUENA: nunca corta por debajo del límite", () => {
    /**
     * De las dos formas de equivocarse, una es mucho peor. Dejar pasar de más es
     * tráfico; cortar de menos es un cliente legítimo al que le dices que no.
     * Se comprueba con varios límites que las N primeras SIEMPRE pasan.
     */
    for (const limite of [1, 5, 60, 1000]) {
      resetRateLimitForTests();
      for (let i = 0; i < limite; i += 1) {
        expect(
          checkPublicApiRateLimit(`clave-${limite}`, limite),
          `con limite ${limite}, la llamada ${i + 1} se corto ANTES de tiempo`,
        ).toBe(true);
      }
      expect(checkPublicApiRateLimit(`clave-${limite}`, limite)).toBe(false);
    }
  });

  it("lo que queda coincide con lo gastado", () => {
    // Si el contador y el informe de «cuánto te queda» divergieran, el cliente
    // no podría regular su propio ritmo — y regularse es justo lo que se le pide.
    expect(getRateLimitRemaining("clave-resto", LIMITE)).toBe(LIMITE);
    for (let i = 0; i < 10; i += 1) checkPublicApiRateLimit("clave-resto", LIMITE);
    expect(getRateLimitRemaining("clave-resto", LIMITE)).toBe(LIMITE - 10);
  });

  it("el gasto de una clave NO consume la cuota de otra, ni bajo ráfaga", async () => {
    /**
     * Aislamiento entre clientes por la puerta de atrás: si el limitador
     * agrupara dos claves, un cliente ruidoso dejaría a otro sin API sin
     * tocarle nada.
     */
    await Promise.all(
      Array.from({ length: 500 }, async () => {
        await Promise.resolve();
        checkPublicApiRateLimit("clave-ruidosa", LIMITE);
      }),
    );
    expect(checkPublicApiRateLimit("clave-ruidosa", LIMITE)).toBe(false);
    expect(
      checkPublicApiRateLimit("clave-tranquila", LIMITE),
      "una clave ruidosa dejo sin cuota a otra",
    ).toBe(true);
  });

  it("el minuto se renueva: la saturación no es permanente", () => {
    /**
     * Un limitador que no se renovara sería un interruptor de apagado. Se
     * comprueba adelantando el reloj, no esperando un minuto de verdad: una
     * prueba que tarda un minuto es una prueba que alguien acaba saltándose.
     */
    for (let i = 0; i < LIMITE + 5; i += 1) checkPublicApiRateLimit("clave-renueva", LIMITE);
    expect(checkPublicApiRateLimit("clave-renueva", LIMITE)).toBe(false);

    const real = Date.now;
    try {
      Date.now = () => real() + 61_000;
      expect(
        checkPublicApiRateLimit("clave-renueva", LIMITE),
        "pasado el minuto la cuota no se renovo: el limite es un apagado permanente",
      ).toBe(true);
    } finally {
      Date.now = real;
    }
  });
});

describe("BLOQUE 8 · lo que este limitador NO garantiza", () => {
  it("es POR PROCESO, y eso queda escrito", () => {
    /**
     * Residuo aceptado y medido, no escondido. Con N instancias el límite
     * efectivo es N × 60/min, porque cada proceso tiene su `Map`. Se simula con
     * dos «procesos» —dos claves distintas para el mismo cliente— para dejar
     * claro el orden de magnitud.
     *
     * Que sea una aproximación es aceptable para regular el ritmo. NO lo sería
     * si el límite fuera la única defensa contra el abuso económico: para eso
     * hacen falta contadores persistentes, y eso está fuera de este bloque.
     */
    const porProceso = LIMITE;
    const instancias = 3;
    let permitidasEnTotal = 0;
    for (let p = 0; p < instancias; p += 1) {
      resetRateLimitForTests(); // cada «proceso» arranca con su Map vacio
      for (let i = 0; i < porProceso + 10; i += 1) {
        if (checkPublicApiRateLimit("mismo-cliente", porProceso)) permitidasEnTotal += 1;
      }
    }
    console.info(
      `limite ${porProceso}/min por proceso x ${instancias} instancias = ` +
        `${permitidasEnTotal} llamadas efectivas`,
    );
    expect(permitidasEnTotal).toBe(porProceso * instancias);
  });
});
