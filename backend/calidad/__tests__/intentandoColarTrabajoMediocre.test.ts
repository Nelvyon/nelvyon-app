/**
 * INTENTANDO COLAR TRABAJO MEDIOCRE.
 *
 * EN QUÉ SE DIFERENCIA DE LAS DEMÁS PRUEBAS. Las otras comprueban que el motor
 * detecta lo que dice detectar. Ésta da por sentado que se puede esquivar y
 * busca el camino — desde la posición de alguien que quiere que su trabajo
 * flojo pase.
 *
 * Y persigue una cosa distinta: no busca que el sistema REVIENTE, sino que
 * APRUEBE algo mediocre. Una salida puede ser técnicamente correcta y aun así
 * no valer nada, y ése es el fallo que ninguna prueba de código detecta.
 *
 * LOS DIEZ INTENTOS:
 *
 *    1. la misma pieza para clientes distintos, cambiando sólo el nombre
 *    2. una cifra inventada, disfrazada de aproximación
 *    3. una fuente inventada, con un enlace que no es la fuente
 *    4. relleno repartido para que no se acumule
 *    5. una acción larga pero que no dice qué hacer
 *    6. un plan que cabe en el presupuesto porque no dice cuánto cuesta
 *    7. un experimento que evita declarar el tráfico
 *    8. una campaña que evita declarar canales
 *    9. un sector regulado con la restricción escrita de otra forma
 *   10. contaminación entre clientes con el nombre partido
 *
 * Los que pasan no son fallos del motor: son sus LÍMITES, y quedan escritos
 * como tales. Un evaluador determinista no puede juzgarlo todo, y fingir que sí
 * sería el mismo error que fingir que una evaluación de reglas es de modelo.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { MotorDeCalidad, type Pieza } from "../MotorDeCalidad";

const motor = new MotorDeCalidad();
const juzgar = (p: Partial<Pieza>) =>
  motor.evaluar({ dominio: "copy", autor: "productor", contenido: {}, ...p }, "qa");

beforeEach(() => {
  delete process.env.NELVYON_QA_MODO;
  delete process.env.AUTONOMOUS_LLM_MODE;
});

// ═══════════════════════════════════════════════════════════════════════════
describe("1 · la misma pieza para dos clientes, cambiando el nombre", () => {
  it("el motor NO lo detecta, y hay que decirlo", () => {
    // EL LÍMITE, escrito a propósito. El motor evalúa UNA pieza; no ve las
    // otras, así que no puede saber que ésta es la misma con otro nombre.
    //
    // Eso NO significa que el problema esté sin cubrir: lo cubre el banco
    // anti-genérico, que ejecuta cada agente con cinco clientes distintos y
    // mide cuánto se parecen sus instrucciones. Son dos defensas para dos
    // preguntas, y confundirlas dejaría un hueco creyendo que está tapado.
    const contenido = { cuerpo: "Plan de crecimiento en tres fases para su empresa." };
    const a = juzgar({ contenido: { ...contenido, cliente: "Casa Manuela" } });
    const b = juzgar({ contenido: { ...contenido, cliente: "Rutalia" } });

    expect(a.veredicto).toBe(b.veredicto);
    expect(
      a.veredicto,
      "si esto empieza a fallar es que alguien ha metido detección de duplicados aquí; " +
      "revisa que no se solape con el banco anti-genérico",
    ).not.toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("2 · disfrazar una cifra inventada", () => {
  it("«en torno a un 40 % más» sigue siendo una promesa numérica", () => {
    expect(
      juzgar({ contenido: { cuerpo: "Vas a conseguir en torno a un 40 % más de leads." } })
        .hallazgos.map((h) => h.id),
    ).toContain("sin-metricas-inventadas");
  });

  it("y «multiplicar x3 las ventas» también", () => {
    expect(
      juzgar({ contenido: { cuerpo: "Con esto vamos a multiplicar x3 en ventas." } })
        .hallazgos.map((h) => h.id),
    ).toContain("sin-metricas-inventadas");
  });

  it("EL LÍMITE: escrita con letras, se escapa", () => {
    // «Duplicar» no lleva número, así que el detector no la ve. Está escrito
    // aquí para que nadie crea que la cobertura es total: quien quiera
    // esquivarlo, puede. Lo que impide es el descuido, no la mala fe.
    const r = juzgar({ contenido: { cuerpo: "Vamos a duplicar tus ventas este trimestre." } });
    expect(r.hallazgos.map((h) => h.id)).not.toContain("sin-metricas-inventadas");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("3 · una fuente que parece fuente", () => {
  it("un enlace cualquiera hace pasar la cita, y es un límite conocido", () => {
    // El detector exige que haya un enlace, no que el enlace SEA el estudio.
    // Verificar eso exigiría salir a la red desde el evaluador, que es
    // exactamente lo que no debe hacer: un evaluador que depende de internet
    // falla cuando internet falla, y entonces se desactiva.
    const r = juzgar({
      contenido: {
        cuerpo: "Según un estudio, el vídeo convierte más. Más info en https://nuestra-web.test",
      },
    });
    expect(r.hallazgos.map((h) => h.id)).not.toContain("sin-fuentes-inventadas");
  });

  it("EL CONTROL: sin ningún enlace, sí se caza", () => {
    expect(
      juzgar({ contenido: { cuerpo: "Según un estudio, el vídeo convierte más." } })
        .hallazgos.map((h) => h.id),
    ).toContain("sin-fuentes-inventadas");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("4 · repartir el relleno", () => {
  it("una sola fórmula basta para marcarlo", () => {
    // Repartirlo no ayuda: se marca desde la primera.
    expect(
      juzgar({
        contenido: {
          cuerpo:
            "Analizamos tu situación actual. En un mercado cada vez más competitivo conviene " +
            "revisar los datos. Proponemos tres acciones concretas con sus plazos y responsables.",
        },
      }).hallazgos.map((h) => h.id),
    ).toContain("sin-relleno");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("5 · una acción larga que no dice qué hacer", () => {
  it("EL LÍMITE: la longitud no garantiza que sea accionable", () => {
    // El detector mide longitud porque medir «accionabilidad» sin modelo no se
    // puede. Una frase larga y vacía pasa. Está escrito para que nadie confunda
    // la comprobación con una garantía.
    const r = juzgar({
      contenido: {
        recommendedActions: [
          "Optimizar de manera integral la estrategia digital para maximizar resultados",
        ],
      },
    });
    expect(r.hallazgos.map((h) => h.id)).not.toContain("es-accionable");

    // Lo que sí se garantiza: una acción corta y vaga NO pasa.
    expect(
      juzgar({ contenido: { recommendedActions: ["Optimizar"] } }).hallazgos.map((h) => h.id),
    ).toContain("es-accionable");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("6 · no declarar lo que te delataría", () => {
  it("un plan que no dice cuánto cuesta esquiva la comprobación de presupuesto", () => {
    // Es el hueco más importante de todo este fichero y por eso está escrito
    // con su nombre: las comprobaciones que comparan dos números se saltan NO
    // DECLARANDO uno.
    //
    // No se arregla marcándolo como fallo —una pieza puede no tener coste
    // porque no lo tiene—, sino donde de verdad se decide: el puente exige que
    // una acción con importe declare que gasta dinero, y la incoherencia entre
    // las dos cosas se deniega allí.
    const r = juzgar({
      dominio: "estrategia",
      contenido: { acciones: [{ que: "todo", prioridad: 1 }] },
      contexto: { presupuestoMensualCents: 30_000 },
    });
    expect(r.hallazgos.map((h) => h.id)).not.toContain("el-plan-cabe-en-el-presupuesto");
    expect(r.noComprobado.map((n) => n.id)).toContain("el-plan-cabe-en-el-presupuesto");
  });

  it("PERO SE DICE: lo no comprobado aparece como no comprobado", () => {
    // Ésta es la defensa real. El motor no aprueba en silencio lo que no ha
    // podido mirar: lo declara, y una acción de alto riesgo con algo sin
    // comprobar va a revisión humana.
    const r = motor.evaluar(
      {
        dominio: "estrategia",
        autor: "productor",
        riesgo: "alto",
        contenido: { acciones: [{ que: "todo", prioridad: 1 }] },
        contexto: { presupuestoMensualCents: 30_000 },
      },
      "qa",
    );
    expect(r.noComprobado.length).toBeGreaterThan(0);
    expect(r.veredicto).toBe("REVIEW_REQUIRED");
  });

  it("un experimento que no declara el tráfico también queda como no comprobado", () => {
    const r = juzgar({
      dominio: "cro",
      contenido: { hipotesis: "cambiar el botón sube la conversión porque destaca más" },
    });
    expect(r.noComprobado.map((n) => n.id)).toContain("hay-trafico-para-concluir");
  });

  it("y una campaña sin canales, igual", () => {
    const r = juzgar({
      dominio: "ads",
      contenido: {
        urlDestino: "https://x.es",
        presupuestoDiarioCents: 500,
        kpi: "coste por lead por debajo de 20 EUR",
      },
    });
    expect(r.noComprobado.map((n) => n.id)).toContain("presupuesto-da-para-el-plan");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("9 · una restricción escrita de otra forma", () => {
  it("la detección funciona con la formulación habitual", () => {
    expect(
      juzgar({
        dominio: "compliance",
        contenido: { cuerpo: "Te garantizamos resultados en un mes." },
        contexto: { restricciones: ["no se puede prometer ningún resultado: sector sanitario"] },
      }).hallazgos.map((h) => h.id),
    ).toContain("respeta-el-sector-regulado");
  });

  it("EL LÍMITE: con la restricción escrita en otro idioma no casa", () => {
    // Las señales están escritas en español porque el intake es en español. Con
    // una restricción en inglés no casa, y esto queda escrito para que se sepa
    // antes de vender a un cliente que escribe su intake en otro idioma.
    const r = juzgar({
      dominio: "compliance",
      contenido: { cuerpo: "Te garantizamos resultados en un mes." },
      contexto: { restricciones: ["cannot promise any medical outcome"] },
    });
    expect(r.hallazgos.map((h) => h.id)).not.toContain("respeta-el-sector-regulado");

    // Pero la comprobación COMÚN de promesas sin respaldo sí lo caza: hay dos
    // capas, y la segunda no depende del idioma de la restricción.
    expect(r.hallazgos.map((h) => h.id)).toContain("sin-promesas-sin-respaldo");
    expect(r.veredicto).toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("10 · contaminación con el nombre partido", () => {
  it("el nombre completo se detecta", () => {
    expect(
      juzgar({
        contenido: { cuerpo: "Como en el caso de Rutalia, aquí conviene lo mismo." },
        contexto: { otrosClientes: ["Rutalia"] },
      }).hallazgos.map((h) => h.id),
    ).toContain("sin-mezcla-de-clientes");
  });

  it("EL LÍMITE: partido o abreviado, no", () => {
    // «Ruta l ia» no casa. Se escribe porque el riesgo real de contaminación no
    // es alguien escribiendo el nombre a mano: es el contexto de un cliente
    // entrando en la instrucción de otro, y eso lo impide la fuente canónica —
    // que se niega a resolver un nombre de marca ambiguo en vez de coger el
    // primero.
    const r = juzgar({
      contenido: { cuerpo: "Como en el caso de Ruta lia, aquí conviene lo mismo." },
      contexto: { otrosClientes: ["Rutalia"] },
    });
    expect(r.hallazgos.map((h) => h.id)).not.toContain("sin-mezcla-de-clientes");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("lo que NINGÚN intento consigue", () => {
  it("aprobar en modo simulado", () => {
    process.env.NELVYON_QA_MODO = "mock";
    const r = juzgar({ contenido: { titular: "Impecable" } });
    expect(r.veredicto).not.toBe("PASS");
    expect(r.veredicto).not.toBe("PASS_WITH_WARNINGS");
  });

  it("sellar REAL con una variable de entorno", () => {
    process.env.AUTONOMOUS_LLM_MODE = "real";
    const r = juzgar({ contenido: { titular: "Impecable" } });
    expect(r.modo).not.toBe("REAL");
  });

  it("evaluarse a sí mismo", () => {
    expect(() =>
      motor.evaluar({ dominio: "copy", autor: "yo", contenido: { titular: "x" } }, "yo"),
    ).toThrow();
  });

  it("aprobar una acción de alto riesgo con algo sin comprobar", () => {
    const r = motor.evaluar(
      { dominio: "copy", autor: "a", riesgo: "alto", contenido: { titular: "Correcto" } },
      "qa",
    );
    expect(r.veredicto).toBe("REVIEW_REQUIRED");
  });
});
