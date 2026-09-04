/**
 * Cuando calidad suspende, se intenta arreglarlo antes de molestar a nadie.
 *
 * ── QUÉ CIERRA ──────────────────────────────────────────────────────────────
 *
 * Una pieza suspendida iba directa a la bandeja de aprobación. Bien para lo que
 * no tiene arreglo automático —una afirmación inventada, una mezcla de
 * clientes—, desperdicio para lo que sí: «se pidió en «es» y está escrita en
 * «en»» no necesita una persona, necesita rehacerla en español.
 *
 * Y una bandeja llena de cosas que el sistema podría haber arreglado solo se
 * acaba mirando por encima. Entonces también se pasan por alto las que sí
 * necesitaban un ojo humano, que es el daño de verdad.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Que el bucle TERMINE. Un ciclo de corrección que no para es peor que no
 * tenerlo: cada vuelta cuesta una llamada al modelo y el trabajo nunca llega.
 * Hay cuatro formas distintas de parar y las cuatro están probadas.
 *
 * COSTE EXTERNO: 0 EUR. El productor es un doble.
 */
import { describe, expect, it, vi } from "vitest";

import { conCorreccion, pedirCorreccion, type VeredictoDeCalidad } from "../bucleDeCorreccion";

const suspende = (id: string, quePasa: string): VeredictoDeCalidad => ({
  aprobada: false,
  motivo: `calidad dice FAIL: ${quePasa}`,
  hallazgos: [{ id, quePasa }],
});

const aprueba: VeredictoDeCalidad = { aprobada: true, motivo: "PASS", hallazgos: [] };

const siempreSePuede = async () => ({ si: true, porQue: "" });

describe("el bucle de corrección", () => {
  // ── EL CAMINO BUENO ───────────────────────────────────────────────────────

  it("LA REGLA: lo que suspende se corrige y se entrega sin molestar a nadie", async () => {
    const producir = vi
      .fn()
      .mockResolvedValueOnce({ texto: "en inglés" })
      .mockResolvedValueOnce({ texto: "en español" });
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(suspende("en-el-idioma-del-cliente", "se pidió en «es» y está en «en»"))
      .mockResolvedValueOnce(aprueba);

    const r = await conCorreccion({ producir, revisar, sePuedeReintentar: siempreSePuede });

    expect(r.aprobada, "no se aprovechó una corrección que funcionaba").toBe(true);
    expect(r.intentos).toBe(2);
    expect(r.resultado).toEqual({ texto: "en español" });
  });

  it("y la corrección lleva las palabras EXACTAS del motor, no «hazlo mejor»", async () => {
    // Reintentar con la misma instrucción produce lo mismo: si el modelo escribió
    // en inglés fue porque nada le dijo que no.
    const producir = vi.fn().mockResolvedValue({ texto: "x" });
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(suspende("no-inventa-la-historia", "dice «desde 1985» y el año que consta es 2019"))
      .mockResolvedValueOnce(aprueba);

    await conCorreccion({ producir, revisar, sePuedeReintentar: siempreSePuede });

    const instruccion = producir.mock.calls[1][0] as string;
    expect(instruccion).toContain("desde 1985");
    expect(instruccion).toContain("2019");
  });

  it("EL CONTROL: lo que pasa a la primera no se reintenta", async () => {
    // Sin esto, un bucle que produjera siempre dos veces duplicaría la factura
    // sin arreglar nada.
    const producir = vi.fn().mockResolvedValue({ texto: "bien" });
    const revisar = vi.fn().mockResolvedValue(aprueba);

    const r = await conCorreccion({ producir, revisar, sePuedeReintentar: siempreSePuede });

    expect(r.intentos).toBe(1);
    expect(producir).toHaveBeenCalledTimes(1);
  });

  // ── LAS CUATRO FORMAS DE PARAR ────────────────────────────────────────────

  it("PARA 1: sin permiso de gasto no se reintenta, y se dice por qué", async () => {
    // Producir otra vez cuesta una llamada al modelo. Una capacidad que se
    // activa sola y multiplica la factura es justo lo que no puede pasar.
    const producir = vi.fn().mockResolvedValue({ texto: "mal" });
    const revisar = vi.fn().mockResolvedValue(suspende("x", "algo concreto que falla"));

    const r = await conCorreccion({
      producir,
      revisar,
      sePuedeReintentar: async () => ({ si: false, porQue: "modo coste cero activo" }),
    });

    expect(r.aprobada).toBe(false);
    expect(producir, "se pagó un reintento sin permiso").toHaveBeenCalledTimes(1);
    expect(r.porQueNoSeReintento).toMatch(/coste cero/);
  });

  it("PARA 2: si el segundo intento falla POR LO MISMO, escala", async () => {
    // Insistir esperando otro resultado es la definición de un bucle que no
    // termina, y cada vuelta cuesta dinero.
    const producir = vi.fn().mockResolvedValue({ texto: "mal" });
    const revisar = vi.fn().mockResolvedValue(suspende("mismo-id", "el mismo problema"));

    const r = await conCorreccion({
      producir,
      revisar,
      sePuedeReintentar: siempreSePuede,
      maxIntentos: 3,
    });

    expect(producir, "insistió más de una vez con el mismo fallo").toHaveBeenCalledTimes(2);
    expect(r.porQueNoSeReintento).toMatch(/lo mismo/);
    expect(r.aprobada).toBe(false);
  });

  it("PARA 3: sin hallazgos concretos no hay nada que corregir", async () => {
    // «Mejóralo» produce otra pieza distinta, no la misma arreglada — y se paga
    // igual.
    const producir = vi.fn().mockResolvedValue({ texto: "mal" });
    const revisar = vi
      .fn()
      .mockResolvedValue({ aprobada: false, motivo: "REVIEW_REQUIRED", hallazgos: [] });

    const r = await conCorreccion({ producir, revisar, sePuedeReintentar: siempreSePuede });

    expect(producir).toHaveBeenCalledTimes(1);
    expect(r.porQueNoSeReintento).toMatch(/hallazgos/);
  });

  it("PARA 4: el tope de intentos manda aunque cada vuelta falle por algo nuevo", async () => {
    const producir = vi.fn().mockResolvedValue({ texto: "mal" });
    let n = 0;
    const revisar = vi.fn().mockImplementation(async () => suspende(`fallo-${++n}`, `problema ${n}`));

    const r = await conCorreccion({
      producir,
      revisar,
      sePuedeReintentar: siempreSePuede,
      maxIntentos: 2,
    });

    expect(producir).toHaveBeenCalledTimes(2);
    expect(r.intentos).toBe(2);
    expect(r.aprobada).toBe(false);
  });

  it("y el tope está acotado por arriba: nadie puede pedir diez vueltas", async () => {
    const producir = vi.fn().mockResolvedValue({ texto: "mal" });
    let n = 0;
    const revisar = vi.fn().mockImplementation(async () => suspende(`f-${++n}`, `p ${n}`));

    await conCorreccion({
      producir,
      revisar,
      sePuedeReintentar: siempreSePuede,
      maxIntentos: 10,
    });

    expect(producir.mock.calls.length, "un tope enorme dejó correr el bucle").toBeLessThanOrEqual(3);
  });

  // ── OBSERVABILIDAD ────────────────────────────────────────────────────────

  it("queda registrado qué falló en cada intento y con qué se corrigió", async () => {
    // Un ciclo que arregla en silencio impide saber qué produce mal el sistema,
    // que es justo lo que hay que aprender.
    const producir = vi.fn().mockResolvedValue({ texto: "x" });
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(suspende("idioma", "está en inglés"))
      .mockResolvedValueOnce(aprueba);

    const r = await conCorreccion({ producir, revisar, sePuedeReintentar: siempreSePuede });

    expect(r.historial).toHaveLength(2);
    expect(r.historial[0].aprobada).toBe(false);
    expect(r.historial[0].correccionPedida).toBeNull();
    expect(r.historial[1].correccionPedida, "no consta qué se le pidió").toContain("inglés");
  });

  it("devuelve SIEMPRE la última pieza, aprobada o no", async () => {
    // Perder el trabajo de un intento fallido obligaría a rehacerlo para poder
    // mirarlo, y quien lo mira necesita ver justamente lo que falló.
    const producir = vi
      .fn()
      .mockResolvedValueOnce({ texto: "primera" })
      .mockResolvedValueOnce({ texto: "segunda, también mal" });
    let n = 0;
    const revisar = vi.fn().mockImplementation(async () => suspende(`f-${++n}`, `p ${n}`));

    const r = await conCorreccion({ producir, revisar, sePuedeReintentar: siempreSePuede });

    expect(r.aprobada).toBe(false);
    expect(r.resultado).toEqual({ texto: "segunda, también mal" });
  });

  // ── EL DIAGNÓSTICO, POR SEPARADO ──────────────────────────────────────────

  it("pedirCorreccion enumera los fallos y pide la pieza entera", async () => {
    const texto = pedirCorreccion(suspende("a", "el titular no cabe"));
    expect(texto).toContain("el titular no cabe");
    // Sin esto el modelo contesta «he cambiado el titular» en vez de la pieza.
    expect(texto).toMatch(/pieza completa/i);
  });

  it("y devuelve vacío cuando no hay nada concreto que arreglar", () => {
    expect(pedirCorreccion({ aprobada: false, motivo: "x", hallazgos: [] })).toBe("");
  });
});
