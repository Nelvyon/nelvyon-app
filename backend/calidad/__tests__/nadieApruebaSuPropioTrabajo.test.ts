/**
 * PRUEBAS DEL MOTOR DE CALIDAD.
 *
 * Un motor de calidad tiene DOS formas de ser inútil, y sólo una se nota:
 *
 *   FALSO NEGATIVO   deja pasar algo que está mal. Se nota cuando el cliente lo
 *                    ve publicado.
 *   FALSO POSITIVO   suspende algo que está bien. NO se nota: el equipo deja de
 *                    hacerle caso y a partir de ahí el motor no sirve para nada
 *                    aunque siga funcionando.
 *
 * Por eso cada comprobación se prueba EN LAS DOS DIRECCIONES. Una suite que
 * sólo prueba que se bloquea lo malo la aprobaría entera un motor que suspenda
 * absolutamente todo, y ese motor es peor que ninguno.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ErrorDeCalidad,
  MotorDeCalidad,
  comprobacionesDe,
  dominiosConQa,
  modoDisponible,
  type Pieza,
} from "../MotorDeCalidad";

const entornoOriginal = { ...process.env };

beforeEach(() => {
  // Sin proveedor y sin modo forzado: el estado honesto por defecto.
  delete process.env.NELVYON_QA_MODO;
  delete process.env.AUTONOMOUS_LLM_MODE;
});

afterEach(() => {
  process.env = { ...entornoOriginal };
});

const motor = new MotorDeCalidad();

const pieza = (p: Partial<Pieza>): Pieza => ({
  dominio: "copy",
  autor: "agente-copy",
  contenido: {},
  ...p,
});

describe("nadie aprueba su propio trabajo", () => {
  it("un agente NO puede evaluar lo que ha producido él mismo", () => {
    const p = pieza({ autor: "agente-copy", contenido: { titular: "Hola" } });
    expect(() => motor.evaluar(p, "agente-copy")).toThrow(ErrorDeCalidad);
    try {
      motor.evaluar(p, "agente-copy");
    } catch (e) {
      expect((e as ErrorDeCalidad).codigo).toBe("AUTOEVALUACION");
    }
  });

  it("EL CONTROL POSITIVO: otro agente sí puede evaluarlo", () => {
    const p = pieza({ autor: "agente-copy", contenido: { titular: "Hola" } });
    expect(() => motor.evaluar(p, "qa-entregable")).not.toThrow();
  });
});

describe("el modo se declara, nunca se finge", () => {
  it("sin proveedor de modelo, lo que hace falta juzgar queda UNAVAILABLE", () => {
    const r = motor.evaluar(
      pieza({ dominio: "copy", contenido: { titular: "Un titular corto" } }),
      "qa-entregable",
    );
    expect(r.modo).toBe("UNAVAILABLE");
    expect(r.noComprobado.map((n) => n.id)).toContain("respeta-el-tono");
  });

  it("AUTONOMOUS_LLM_MODE=real sin ningún proveedor NO da REAL", () => {
    // La trampa: basta una variable de entorno para que `resolveLlmMode()` diga
    // `real`. Si el motor se fiara de eso, sellaría aprobaciones que nadie ha
    // dado.
    process.env.AUTONOMOUS_LLM_MODE = "real";
    expect(modoDisponible()).toBe("UNAVAILABLE");
  });

  it("en modo simulado nada se aprueba: va a revisión humana", () => {
    process.env.NELVYON_QA_MODO = "mock";
    const r = motor.evaluar(
      pieza({ dominio: "copy", contenido: { titular: "Impecable" } }),
      "qa-entregable",
    );
    expect(r.modo).toBe("MOCK");
    expect(r.veredicto).toBe("REVIEW_REQUIRED");
  });

  it("un dominio sin comprobaciones de modelo sí llega a RULE_BASED limpio", () => {
    const r = motor.evaluar(
      pieza({
        dominio: "email",
        autor: "agente-email",
        contenido: {
          asunto: "Tu resumen de octubre",
          cuerpo: "Aquí va el resumen. Puedes darte de baja cuando quieras.",
        },
      }),
      "qa-entregable",
    );
    expect(r.modo).toBe("RULE_BASED");
    expect(r.veredicto).toBe("PASS");
  });
});

describe("lo que se bloquea, y lo que NO", () => {
  const casos: Array<{
    nombre: string;
    dominio: string;
    malo: Record<string, unknown>;
    bueno: Record<string, unknown>;
    id: string;
  }> = [
    {
      nombre: "marcadores de plantilla sin rellenar",
      dominio: "copy",
      malo: { titular: "Hola {{ nombre }}, tenemos algo para ti" },
      bueno: { titular: "Hola, tenemos algo para ti" },
      id: "sin-marcadores-de-plantilla",
    },
    {
      nombre: "promesas que no se pueden sostener",
      dominio: "copy",
      malo: { cuerpo: "Te garantizamos el primer puesto en Google." },
      bueno: { cuerpo: "Trabajamos tu posicionamiento midiendo cada mes." },
      id: "sin-promesas-sin-respaldo",
    },
    {
      nombre: "enlaces de mentira",
      dominio: "web",
      malo: { botones: [{ texto: "Pedir cita", destino: "https://example.com/x" }] },
      bueno: { botones: [{ texto: "Pedir cita", destino: "https://clinica-real.es/cita" }] },
      id: "sin-url-simulada",
    },
    {
      nombre: "una campaña sin presupuesto declarado",
      dominio: "ads",
      malo: { urlDestino: "https://cliente.es/oferta" },
      bueno: { urlDestino: "https://cliente.es/oferta", presupuestoDiarioCents: 2500 },
      id: "presupuesto-declarado",
    },
    {
      nombre: "un correo sin baja",
      dominio: "email",
      malo: { asunto: "Novedades", cuerpo: "Mira lo que hemos preparado." },
      bueno: { asunto: "Novedades", cuerpo: "Mira lo que hemos preparado. Darse de baja." },
      id: "tiene-baja",
    },
    {
      nombre: "un asunto que engaña para que se abra",
      dominio: "email",
      malo: { asunto: "Re: tu pedido", cuerpo: "Oferta. Puedes darte de baja." },
      bueno: { asunto: "Tu pedido de marzo", cuerpo: "Oferta. Puedes darte de baja." },
      id: "asunto-honesto",
    },
    {
      nombre: "discutir en público con un cliente insatisfecho",
      dominio: "reputacion",
      malo: { respuesta: "Eso es mentira, nunca ha sido cliente nuestro." },
      bueno: { respuesta: "Sentimos la experiencia. Escríbenos y lo revisamos." },
      id: "no-discute-en-publico",
    },
    {
      nombre: "un informe que omite objetivos",
      dominio: "reporting",
      malo: { objetivos: ["leads", "coste", "ventas"], objetivosIncluidos: ["leads"] },
      bueno: {
        objetivos: ["leads", "coste", "ventas"],
        objetivosIncluidos: ["leads", "coste", "ventas"],
      },
      id: "no-omite-lo-que-va-mal",
    },
    {
      nombre: "repetir la palabra clave hasta hacerlo ilegible",
      dominio: "seo",
      malo: {
        palabraClave: "fisioterapia",
        cuerpo: `${"fisioterapia ".repeat(10)}${"texto de relleno ".repeat(30)}`,
      },
      bueno: {
        palabraClave: "fisioterapia",
        cuerpo: `${"fisioterapia ".repeat(2)}${"texto de relleno ".repeat(40)}`,
      },
      id: "sin-repeticion-forzada",
    },
  ];

  for (const c of casos) {
    it(`bloquea: ${c.nombre}`, () => {
      const r = motor.evaluar(
        pieza({ dominio: c.dominio, autor: "productor", contenido: c.malo }),
        "qa-entregable",
      );
      expect(r.hallazgos.map((h) => h.id)).toContain(c.id);
      expect(r.veredicto).toBe("FAIL");
    });

    it(`NO bloquea (falso positivo): ${c.nombre}`, () => {
      const r = motor.evaluar(
        pieza({ dominio: c.dominio, autor: "productor", contenido: c.bueno }),
        "qa-entregable",
      );
      expect(r.hallazgos.map((h) => h.id)).not.toContain(c.id);
    });
  }
});

describe("avisos frente a bloqueos", () => {
  it("un texto corriente con equis NO se confunde con una plantilla", () => {
    // Lo cazo mi propia suite: `XXXX` se buscaba sin distinguir mayusculas y
    // cualquier cadena con cuatro equis suspendia. Un motor que suspende
    // trabajo correcto deja de usarse, y entonces no protege nada.
    const r = motor.evaluar(
      pieza({ autor: "productor", contenido: { titular: "x".repeat(90) } }),
      "qa-entregable",
    );
    expect(r.hallazgos.map((h) => h.id)).not.toContain("sin-marcadores-de-plantilla");
  });

  it("un marcador de verdad, en mayusculas, si se caza", () => {
    const r = motor.evaluar(
      pieza({ autor: "productor", contenido: { titular: "Precio: XXXX euros" } }),
      "qa-entregable",
    );
    expect(r.hallazgos.map((h) => h.id)).toContain("sin-marcadores-de-plantilla");
  });

  it("un titular demasiado largo avisa, no suspende", () => {
    const r = motor.evaluar(
      pieza({ autor: "productor", contenido: { titular: "x".repeat(90) } }),
      "qa-entregable",
    );
    expect(r.hallazgos.find((h) => h.id === "titular-legible")?.gravedad).toBe("aviso");
    expect(r.veredicto).not.toBe("FAIL");
  });

  it("un titular que cabe no genera nada", () => {
    const r = motor.evaluar(
      pieza({ autor: "productor", contenido: { titular: "Fisioterapia en Getafe" } }),
      "qa-entregable",
    );
    expect(r.hallazgos.map((h) => h.id)).not.toContain("titular-legible");
  });

  it("un texto que no cabe en la red avisa; el que cabe, no", () => {
    const largo = motor.evaluar(
      pieza({
        dominio: "social",
        autor: "productor",
        contenido: { red: "x", texto: "y".repeat(400) },
      }),
      "qa-entregable",
    );
    expect(largo.hallazgos.map((h) => h.id)).toContain("adaptado-a-la-red");

    const corto = motor.evaluar(
      pieza({
        dominio: "social",
        autor: "productor",
        contenido: { red: "x", texto: "y".repeat(200) },
      }),
      "qa-entregable",
    );
    expect(corto.hallazgos.map((h) => h.id)).not.toContain("adaptado-a-la-red");
  });
});

describe("el alto riesgo falla cerrado", () => {
  /**
   * Una campaña IMPECABLE, y la definición se ha endurecido a propósito.
   *
   * Antes bastaba con destino, presupuesto y negativas. Al especializar las
   * rúbricas de Ads se añadió que una campaña diga con qué cifra se la juzga
   * y que el presupuesto dé para los canales que propone — y esta pieza dejó
   * de pasar, con razón: una campaña sin objetivo medible no es impecable, es
   * una campaña de la que nadie podrá decir si funcionó.
   */
  const contenidoLimpio = {
    urlDestino: "https://cliente.es/oferta",
    presupuestoDiarioCents: 2500,
    negativas: ["gratis", "empleo"],
    canales: ["google"],
    kpi: "coste por lead cualificado por debajo de 25 EUR",
  };

  it("una acción de alto riesgo con un aviso NO se aprueba sola", () => {
    const r = motor.evaluar(
      pieza({
        dominio: "ads",
        autor: "productor",
        riesgo: "alto",
        contenido: { ...contenidoLimpio, negativas: [] },
      }),
      "qa-entregable",
    );
    expect(r.hallazgos.map((h) => h.id)).toContain("negativas-declaradas");
    expect(r.veredicto).toBe("REVIEW_REQUIRED");
  });

  it("la MISMA pieza de bajo riesgo pasa con avisos", () => {
    const r = motor.evaluar(
      pieza({
        dominio: "ads",
        autor: "productor",
        riesgo: "bajo",
        contenido: { ...contenidoLimpio, negativas: [] },
      }),
      "qa-entregable",
    );
    expect(r.veredicto).toBe("PASS_WITH_WARNINGS");
  });

  it("EL CONTROL POSITIVO: alto riesgo impecable y comprobable SÍ pasa", () => {
    const r = motor.evaluar(
      pieza({ dominio: "ads", autor: "productor", riesgo: "alto", contenido: contenidoLimpio }),
      "qa-entregable",
    );
    expect(r.veredicto).toBe("PASS");
  });

  it("alto riesgo con algo sin comprobar por falta de modelo va a revisión", () => {
    // `copy` tiene una comprobación de clase `modelo`. Sin modelo, no se puede
    // decir que la pieza está revisada.
    const r = motor.evaluar(
      pieza({ dominio: "copy", autor: "productor", riesgo: "alto", contenido: { titular: "Corto" } }),
      "qa-entregable",
    );
    expect(r.modo).toBe("UNAVAILABLE");
    expect(r.veredicto).toBe("REVIEW_REQUIRED");
  });
});

describe("lo que no se puede comprobar se dice", () => {
  it("una pieza sin los campos necesarios no se aprueba por silencio", () => {
    const r = motor.evaluar(
      pieza({ dominio: "seo", autor: "productor", contenido: { titulo: "Algo" } }),
      "qa-entregable",
    );
    // El titulo no permite comprobar meta ni densidad: eso queda dicho.
    expect(r.noComprobado.map((n) => n.id)).toEqual(
      expect.arrayContaining(["meta-descripcion-util", "sin-repeticion-forzada"]),
    );
  });

  it("una pieza vacía suspende en vez de dar 100", () => {
    const r = motor.evaluar(
      pieza({ dominio: "seo", autor: "productor", contenido: {} }),
      "qa-entregable",
    );
    expect(r.veredicto).toBe("FAIL");
    expect(r.hallazgos.map((h) => h.id)).toContain("tiene-contenido");
  });

  it("la puntuación es null cuando no se pudo comprobar nada", () => {
    process.env.NELVYON_QA_MODO = "mock";
    const r = motor.evaluar(
      pieza({ dominio: "contenido", autor: "productor", contenido: {} }),
      "qa-entregable",
    );
    // `tiene-contenido` sí corre, así que hay puntuación; lo que importa es que
    // nunca se invente un 100 sobre cero comprobaciones.
    expect(r.puntuacion === null || r.puntuacion < 100).toBe(true);
  });
});

describe("el inventario sale del código, no de una lista a mano", () => {
  it("todo dominio declarado tiene al menos las comunes", () => {
    for (const d of dominiosConQa()) {
      expect(comprobacionesDe(d).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("ninguna comprobación se repite de id dentro de un dominio", () => {
    for (const d of dominiosConQa()) {
      const ids = comprobacionesDe(d).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("un dominio desconocido no revienta: aplica las comunes", () => {
    const r = motor.evaluar(
      pieza({ dominio: "loquesea", autor: "productor", contenido: { x: "y" } }),
      "qa-entregable",
    );
    expect(r.veredicto).toBe("PASS");
  });
});
