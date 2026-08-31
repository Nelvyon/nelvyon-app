/**
 * UN «false» ENTRE COMILLAS NO ES UN APROBADO.
 *
 * ── EL DEFECTO ──────────────────────────────────────────────────────────────
 *
 * `QualityEvaluatorService.parseEvalJson` hacia:
 *
 *     passed: Boolean(parsed.passed) || n(parsed.score) >= 99
 *
 * En JavaScript `Boolean("false")` es `true`. Y `Boolean("no")`, y
 * `Boolean("0")`, y `Boolean([])`, y `Boolean({})`: cualquier cosa que no sea
 * cadena vacia, cero, null o undefined.
 *
 * Los modelos devuelven booleanos como cadena todo el rato — es de los
 * desajustes mas comunes al pedir JSON. Asi que una evaluacion que dijera
 *
 *     { "score": 40, "passed": "false" }
 *
 * quedaba registrada como APROBADA.
 *
 * ── Y NO ERA SOLO UNA FILA MAL ESCRITA ──────────────────────────────────────
 *
 * `improveUntilExcellent` usa ese `passed` para cortar el bucle de mejora:
 *
 *     if (evalResult.passed) return { output: currentOutput, ... }
 *
 * O sea que el entregable salia en el PRIMER intento, sin mejorar, con un 40 de
 * cien y marcado como bueno. El evaluador de calidad no evaluaba nada.
 *
 * ── LO QUE NO SE TOCA, y es deliberado ──────────────────────────────────────
 *
 * El `|| n(parsed.score) >= 99` se queda. Endurecerlo haria que el bucle
 * agotara siempre los intentos, y cada intento es una llamada al modelo que
 * cuesta dinero. Cambiar la severidad de la puerta es una decision de producto;
 * que `"false"` signifique falso no lo es.
 *
 * COSTE EXTERNO: 0 EUR. No se llama a ningun modelo: se prueba el parser.
 */
import { describe, expect, it } from "vitest";

import { parseEvalJsonParaPruebas as parseEvalJson } from "../quality/QualityEvaluatorService";

/** Una evaluacion con nota baja: lo unico que decide es el campo `passed`. */
function conPassed(valor: unknown): ReturnType<typeof parseEvalJson> {
  return parseEvalJson(JSON.stringify({ score: 40, feedback: "flojo", passed: valor }));
}

describe("lo que el modelo dice que NO, es que no", () => {
  const NOES = [
    ["false", "el booleano como cadena, el caso real"],
    ["False", "con mayuscula"],
    ["FALSE", "en mayusculas"],
    ["no", "en ingles coloquial: NO se acepta, y es a proposito"],
    ["yes", "tampoco: aceptar mas formas de decir «si» solo puede abrir puertas"],
    ["si", "idem"],
    ["0", "el cero como cadena"],
    ["null", "la palabra null"],
    ["undefined", "la palabra undefined"],
  ] as const;

  for (const [valor, porque] of NOES) {
    it(`«${valor}» no aprueba (${porque})`, () => {
      expect(conPassed(valor).passed, `«${valor}» se leyo como aprobado`).toBe(false);
    });
  }

  it("y tampoco un objeto o un array, que en JS son truthy", () => {
    expect(conPassed({}).passed).toBe(false);
    expect(conPassed([]).passed).toBe(false);
    expect(conPassed([false]).passed).toBe(false);
  });

  it("ni un numero suelto", () => {
    // `Boolean(1)` es true, pero el contrato pide un booleano. Un 1 puede ser
    // cualquier cosa: un indice, un contador de intentos, un error de plantilla.
    expect(conPassed(1).passed).toBe(false);
    expect(conPassed(0).passed).toBe(false);
  });

  it("ni la ausencia del campo", () => {
    expect(parseEvalJson(JSON.stringify({ score: 40, feedback: "x" })).passed).toBe(false);
  });
});

describe("EL CONTROL: lo que el modelo dice que SI, aprueba", () => {
  /**
   * Sin esto, un `passed: false` fijo pasaria todas las pruebas de arriba y el
   * bucle de mejora agotaria siempre los intentos — cada uno una llamada al
   * modelo que cuesta dinero.
   */
  it("el booleano de verdad", () => {
    expect(conPassed(true).passed).toBe(true);
  });

  const SIES = ["true", "True", "TRUE", " true ", "1"] as const;
  for (const valor of SIES) {
    it(`«${valor}» aprueba`, () => {
      expect(conPassed(valor).passed).toBe(true);
    });
  }
});

describe("la otra puerta sigue abierta: una nota de 99 aprueba sola", () => {
  it("con score 99 y sin passed, aprueba", () => {
    // Es el contrato declarado en el propio prompt: «passed: true si score>=99».
    // Se fija aqui para que si alguien lo endurece sea a sabiendas: endurecerlo
    // hace que el bucle agote los intentos, y cada intento cuesta dinero.
    expect(parseEvalJson(JSON.stringify({ score: 99, feedback: "" })).passed).toBe(true);
  });

  it("con score 98, no", () => {
    expect(parseEvalJson(JSON.stringify({ score: 98, feedback: "" })).passed).toBe(false);
  });
});

describe("el resto del parser sigue siendo fail-closed", () => {
  it("un JSON que no se puede leer LANZA, no devuelve un aprobado vacio", () => {
    // Es lo correcto: quien llama tiene que enterarse. Devolver un objeto por
    // defecto convertiria una respuesta ilegible en una evaluacion con score 0
    // que parece una evaluacion real.
    expect(() => parseEvalJson("esto no es json")).toThrow();
    expect(() => parseEvalJson("")).toThrow();
  });

  it("los campos que faltan valen 0, no valores inventados", () => {
    const r = parseEvalJson(JSON.stringify({}));
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
    expect(Object.values(r.breakdown).every((v) => v === 0)).toBe(true);
  });

  it("las notas se acotan a su rango en vez de creerse cualquier numero", () => {
    const r = parseEvalJson(
      JSON.stringify({ score: 5000, breakdown: { especificidad: -40, originalidad: 999 } }),
    );
    expect(r.score).toBe(100);
    expect(r.breakdown.especificidad).toBe(0);
    expect(r.breakdown.originalidad).toBe(20);
  });

  it("y el JSON entre vallas se sigue leyendo", () => {
    // Los modelos envuelven la respuesta en un bloque de codigo constantemente.
    const conVallas = ["```json", JSON.stringify({ score: 99 }), "```"].join("\n");
    expect(parseEvalJson(conVallas).score).toBe(99);
  });

  it("con prosa delante de las vallas, tambien", () => {
    const conProsa = ["Aqui tienes la evaluacion:", "```json", JSON.stringify({ score: 99 }), "```"].join("\n");
    expect(parseEvalJson(conProsa).score).toBe(99);
  });
});
