/**
 * CADA DISCIPLINA SE JUZGA CON SU PROPIO CRITERIO.
 *
 * EL PROBLEMA QUE ESTO RESUELVE. El motor de calidad tenía una comprobación por
 * dominio —y `estrategia` y `compliance` no tenían ninguna—. Un evaluador así
 * detecta un titular largo y deja pasar una campaña que pierde dinero en cada
 * venta, un test A/B que nunca podrá concluir y un plan que le hace prometer
 * resultados a un sector regulado.
 *
 * Eso no es un evaluador de SEO ni de Ads: es un corrector de estilo con quince
 * nombres.
 *
 * QUÉ SE COMPRUEBA AQUÍ. Las dos direcciones, siempre. Una rúbrica que suspenda
 * todo pasaría igual de bien una suite que sólo mire lo que rechaza — y a los
 * tres días alguien la desactiva porque suspende trabajo correcto.
 *
 * Y LOS CASOS DIFÍCILES, que son los que separan un evaluador real de uno de
 * juguete: presupuesto que no da, sector regulado, tráfico insuficiente, lista
 * comprada, cliente que ya probó eso y le salió mal.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { MotorDeCalidad, comprobacionesDe, dominiosConQa, type Pieza } from "../MotorDeCalidad";

const motor = new MotorDeCalidad();
const evaluar = (p: Partial<Pieza>) =>
  motor.evaluar({ dominio: "copy", autor: "productor", contenido: {}, ...p }, "qa-entregable");

const ids = (p: Partial<Pieza>) => evaluar(p).hallazgos.map((h) => h.id);

beforeEach(() => {
  delete process.env.NELVYON_QA_MODO;
  delete process.env.AUTONOMOUS_LLM_MODE;
});

// ═══════════════════════════════════════════════════════════════════════════
describe("las comprobaciones comunes: lo que arruina cualquier disciplina", () => {
  it("una cifra prometida que nadie ha medido NO pasa", () => {
    // Es la más importante de todas. «Aumentarás un 47 % las conversiones»
    // suena mucho mejor que la verdad, y por eso sale sola. El cliente la
    // repetirá hasta que alguien le pida la fuente.
    expect(
      ids({ contenido: { cuerpo: "Con este plan vas a aumentar un 47 % las conversiones." } }),
    ).toContain("sin-metricas-inventadas");
  });

  it("EL CONTROL: la misma cifra SÍ pasa si sale de un dato del cliente", () => {
    // Un especialista cita las cifras del cliente constantemente. Prohibirlas
    // todas convertiría el evaluador en un estorbo.
    expect(
      ids({
        contenido: { cuerpo: "Tu tasa de conversión es del 47 %: partimos de ahí." },
        contexto: { analitica: "conversion 47 %" },
      }),
    ).not.toContain("sin-metricas-inventadas");
  });

  it("citar un estudio sin poder enseñarlo NO pasa", () => {
    expect(
      ids({ contenido: { cuerpo: "Según un estudio, el vídeo convierte más." } }),
    ).toContain("sin-fuentes-inventadas");
  });

  it("EL CONTROL: con el enlace, la cita vale", () => {
    expect(
      ids({
        contenido: {
          cuerpo: "Según un estudio de https://ejemplo-real.es/informe-2026 el vídeo convierte más.",
        },
      }),
    ).not.toContain("sin-fuentes-inventadas");
  });

  it("el relleno se detecta", () => {
    expect(
      ids({
        contenido: {
          cuerpo:
            "En un mercado cada vez más competitivo, hoy en día es fundamental poner en valor " +
            "las sinergias de tu marca para llevar al siguiente nivel tu presencia digital y así " +
            "conseguir destacar frente al resto de actores del sector en el entorno actual.",
        },
      }),
    ).toContain("sin-relleno");
  });

  it("EL CONTROL: un texto concreto no se marca como relleno", () => {
    expect(
      ids({
        contenido: {
          cuerpo:
            "Tu ficha de Google no tiene el horario de agosto y apareces como cerrado. " +
            "Lo actualizamos hoy y recuperas las llamadas de mediodía, que son el 40 % de tus reservas " +
            "según tu propio histórico de los últimos seis meses de reservas telefónicas.",
        },
      }),
    ).not.toContain("sin-relleno");
  });

  it("una acción demasiado vaga para ejecutarla se marca", () => {
    expect(
      ids({ contenido: { recommendedActions: ["Mejorar el SEO"] } }),
    ).toContain("es-accionable");
  });

  it("EL CONTROL: una acción concreta pasa", () => {
    expect(
      ids({
        contenido: {
          recommendedActions: [
            "Añadir el horario de agosto en la ficha de Google Business esta semana",
          ],
        },
      }),
    ).not.toContain("es-accionable");
  });

  it("MENCIONAR A OTRO CLIENTE es bloqueante", () => {
    // El fallo que destruye la confianza de golpe: ver el nombre de otra
    // empresa en tu informe significa que tus datos están en el suyo.
    const r = evaluar({
      contenido: { cuerpo: "Como hicimos con Rutalia, proponemos lo mismo." },
      contexto: { otrosClientes: ["Rutalia", "Nutrigo"] },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("sin-mezcla-de-clientes");
    expect(r.veredicto).toBe("FAIL");
  });

  it("EL CONTROL: nombrar al propio cliente no es contaminación", () => {
    expect(
      ids({
        contenido: { cuerpo: "Casa Manuela llena los viernes y no los martes." },
        contexto: { otrosClientes: ["Rutalia"] },
      }),
    ).not.toContain("sin-mezcla-de-clientes");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("SEO se juzga como SEO", () => {
  it("prometer el primer puesto en Google es bloqueante", () => {
    const r = evaluar({
      dominio: "seo",
      contenido: { cuerpo: "Te llevamos al primer puesto de Google en tres meses." },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("sin-promesa-de-posicion");
    expect(r.veredicto).toBe("FAIL");
  });

  it("dos páginas peleando por lo mismo se detecta", () => {
    expect(
      ids({
        dominio: "seo",
        contenido: {
          paginas: [
            { url: "/zapatillas-running", objetivo: "zapatillas de running" },
            { url: "/mejores-zapatillas", objetivo: "zapatillas de running" },
          ],
        },
      }),
    ).toContain("canibalizacion");
  });

  it("EL CONTROL: páginas con objetivos distintos no se marcan", () => {
    expect(
      ids({
        dominio: "seo",
        contenido: {
          paginas: [
            { url: "/zapatillas-running", objetivo: "zapatillas de running" },
            { url: "/como-lavar", objetivo: "como lavar zapatillas" },
          ],
        },
      }),
    ).not.toContain("canibalizacion");
  });

  it("palabras clave sin intención de búsqueda se marcan", () => {
    // «Zapatillas» no es lo mismo si quien busca quiere comprar, comparar o
    // saber cómo lavarlas: el contenido a escribir es distinto en cada caso.
    expect(
      ids({ dominio: "seo", contenido: { keywords: ["zapatillas", "running"] } }),
    ).toContain("keywords-con-intencion");
  });

  it("EL CONTROL: con intención declarada, pasan", () => {
    expect(
      ids({
        dominio: "seo",
        contenido: {
          keywords: [
            { termino: "comprar zapatillas running", intencion: "transaccional" },
            { termino: "como lavar zapatillas", intencion: "informacional" },
          ],
        },
      }),
    ).not.toContain("keywords-con-intencion");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("Ads se juzga como Ads", () => {
  it("CASO DIFÍCIL: repartir un presupuesto pequeño entre cuatro canales", () => {
    // No es una estrategia multicanal: es no estar en ninguno. Cada canal
    // necesita volumen para que el sistema de pujas aprenda.
    const r = evaluar({
      dominio: "ads",
      contenido: {
        urlDestino: "https://x.es",
        presupuestoDiarioCents: 1000, // 10 €/día
        canales: ["google", "meta", "tiktok", "linkedin"],
      },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("presupuesto-da-para-el-plan");
    expect(r.veredicto).toBe("FAIL");
  });

  it("EL CONTROL: el mismo presupuesto en UN canal sí da", () => {
    expect(
      ids({
        dominio: "ads",
        contenido: {
          urlDestino: "https://x.es",
          presupuestoDiarioCents: 1000,
          canales: ["google"],
          kpi: "coste por lead por debajo de 20 EUR",
        },
      }),
    ).not.toContain("presupuesto-da-para-el-plan");
  });

  it("una campaña sin cifra con la que juzgarla se marca", () => {
    expect(
      ids({
        dominio: "ads",
        contenido: { urlDestino: "https://x.es", presupuestoDiarioCents: 5000 },
      }),
    ).toContain("objetivo-medible");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("Email se juzga como Email", () => {
  it("CASO DIFÍCIL: una lista comprada no se envía, por buena que sea la campaña", () => {
    const r = evaluar({
      dominio: "email",
      contenido: { asunto: "Novedades", cuerpo: "Contenido. Puedes darte de baja." },
      contexto: { origenDeLaLista: "base comprada a un proveedor" },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("hay-consentimiento");
    expect(r.veredicto).toBe("FAIL");
  });

  it("EL CONTROL: una lista propia con alta voluntaria pasa", () => {
    expect(
      ids({
        dominio: "email",
        contenido: { asunto: "Novedades", cuerpo: "Contenido. Puedes darte de baja." },
        contexto: { origenDeLaLista: "altas en el formulario de la web con doble confirmación" },
      }),
    ).not.toContain("hay-consentimiento");
  });

  it("enviar a toda la base se marca", () => {
    expect(
      ids({
        dominio: "email",
        contenido: {
          asunto: "Oferta", cuerpo: "Texto. Darse de baja.", segmento: "toda la base",
        },
      }),
    ).toContain("segmentado");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("Conversión se juzga como conversión", () => {
  it("CASO DIFÍCIL: un test A/B con tráfico insuficiente NO se propone", () => {
    // Prometerle una respuesta a quien tiene 200 visitas al mes es prometerle
    // algo que no va a llegar. Cualquier ganador sería ruido.
    const r = evaluar({
      dominio: "cro",
      contenido: { hipotesis: "cambiar el botón sube la conversión porque destaca más" },
      contexto: { visitasMensuales: 200 },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("hay-trafico-para-concluir");
    expect(r.veredicto).toBe("FAIL");
  });

  it("EL CONTROL: con tráfico suficiente, el mismo experimento pasa", () => {
    expect(
      ids({
        dominio: "cro",
        contenido: {
          hipotesis: "cambiar el botón sube la conversión porque destaca más",
          criterioDeExito: "conversión +10 % con significación del 95 %",
        },
        contexto: { visitasMensuales: 40000 },
      }),
    ).not.toContain("hay-trafico-para-concluir");
  });

  it("un experimento sin hipótesis es bloqueante", () => {
    const r = evaluar({ dominio: "cro", contenido: { experimento: "cambiar el botón" } });
    expect(r.hallazgos.map((h) => h.id)).toContain("hipotesis-antes-que-cambio");
    expect(r.veredicto).toBe("FAIL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("Comercio electrónico: la cuenta que decide", () => {
  it("CASO DIFÍCIL: traer un pedido cuesta más de lo que deja", () => {
    // Vender más no es ganar más. Es LA cuenta del comercio electrónico.
    const r = evaluar({
      dominio: "ecommerce",
      contenido: { costePorPedidoObjetivoCents: 1500 },
      contexto: { margenPorPedidoCents: 1200 },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("el-pedido-deja-margen");
    expect(r.veredicto).toBe("FAIL");
  });

  it("EL CONTROL: con margen suficiente, pasa", () => {
    expect(
      ids({
        dominio: "ecommerce",
        contenido: { costePorPedidoObjetivoCents: 800 },
        contexto: { margenPorPedidoCents: 2400 },
      }),
    ).not.toContain("el-pedido-deja-margen");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("Estrategia: que el plan se pueda pagar y no repita lo que falló", () => {
  it("CASO DIFÍCIL: el plan cuesta más de lo que el cliente tiene", () => {
    const r = evaluar({
      dominio: "estrategia",
      contenido: { costeMensualPropuestoCents: 500_000 },
      contexto: { presupuestoMensualCents: 30_000 },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("el-plan-cabe-en-el-presupuesto");
    expect(r.veredicto).toBe("FAIL");
  });

  it("CASO DIFÍCIL: repetir lo que el cliente ya probó y le salió mal", () => {
    // La forma más rápida de que un cliente deje de leer.
    const r = evaluar({
      dominio: "estrategia",
      contenido: {
        acciones: [{ que: "campaña de display para notoriedad", prioridad: 1 }],
      },
      contexto: { loQueYaFallo: "un año de campañas de display sin una sola oportunidad" },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("no-repite-lo-que-ya-fallo");
  });

  it("EL CONTROL: proponer algo distinto no se marca", () => {
    expect(
      ids({
        dominio: "estrategia",
        contenido: { acciones: [{ que: "buscador con intención comercial", prioridad: 1 }] },
        contexto: { loQueYaFallo: "un año de campañas de display sin una sola oportunidad" },
      }),
    ).not.toContain("no-repite-lo-que-ya-fallo");
  });

  it("un plan sin prioridades se marca", () => {
    expect(
      ids({
        dominio: "estrategia",
        contenido: { acciones: [{ que: "a" }, { que: "b" }, { que: "c" }] },
      }),
    ).toContain("prioriza");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("Cumplimiento: la comprobación que evita una sanción", () => {
  it("CASO DIFÍCIL: un sector que no puede prometer resultados, y la pieza los promete", () => {
    const r = evaluar({
      dominio: "compliance",
      contenido: { cuerpo: "Con nuestro plan aseguramos resultados desde la primera semana." },
      contexto: {
        restricciones: ["no se puede prometer ningún resultado ni curación: sector regulado"],
      },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("respeta-el-sector-regulado");
    expect(r.veredicto).toBe("FAIL");
  });

  it("EL CONTROL: la misma restricción con una pieza que la respeta", () => {
    expect(
      ids({
        dominio: "compliance",
        contenido: { cuerpo: "Explicamos qué incluye cada sesión y quién la imparte." },
        contexto: {
          restricciones: ["no se puede prometer ningún resultado ni curación: sector regulado"],
        },
      }),
    ).not.toContain("respeta-el-sector-regulado");
  });

  it("contactar personas sin base legal es bloqueante", () => {
    const r = evaluar({
      dominio: "compliance",
      contenido: { contactaPersonas: true, cuerpo: "Hola" },
      contexto: {},
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("hay-base-legal-para-contactar");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("Reputación: no discutir, no repetir, no pedir que borren", () => {
  it("pedir que borren una reseña es bloqueante", () => {
    const r = evaluar({
      dominio: "reputacion",
      contenido: { respuesta: "Te pedimos por favor que elimines la reseña." },
    });
    expect(r.hallazgos.map((h) => h.id)).toContain("no-pide-borrar-la-resena");
    expect(r.veredicto).toBe("FAIL");
  });

  it("la misma respuesta copiada bajo varias reseñas se marca", () => {
    // Peor que no contestar: dice que no se ha leído ninguna.
    expect(
      ids({
        dominio: "reputacion",
        contenido: {
          respuestas: ["Gracias por tu comentario.", "Gracias por tu comentario."],
        },
      }),
    ).toContain("no-la-misma-respuesta-a-todos");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("no se aprueba como SEO algo a lo que no se le ha mirado nada de SEO", () => {
  /**
   * LO QUE ENCONTRÓ ESTO, y no fue una revisión de código.
   *
   * Al ejecutar `inteligencia_mercado_premium` entero contra un modelo local y
   * pasar lo que escribió por su rúbrica, salió **PASS con 100 puntos** y sus
   * CINCO comprobaciones de dominio en «no se pudo comprobar»: el texto no
   * traía los campos que miran. Lo único que se le había revisado era la
   * higiene común —que no estuviera vacío, que no prometiera imposibles—, que
   * es exactamente lo mismo que se le revisa a una fotografía.
   *
   * Cien puntos ahí no significa «bien». Significa «no revisado como lo que
   * es». Y es el peor sitio posible para el optimismo, porque el número se
   * enseña y nadie lee la lista de lo que no se pudo mirar.
   */
  it("LA REGLA: si ninguna comprobación de la disciplina pudo ejecutarse, va a una persona", () => {
    const r = evaluar({
      dominio: "investigacion",
      // Texto correcto y vacío de estructura: pasa la higiene común y no trae
      // ni hallazgos, ni competidores, ni decisión, ni muestra.
      contenido: { cuerpo: "Hemos revisado el mercado y hay margen para crecer en el segmento medio." },
    });
    expect(r.hallazgos, "no debería haber hallazgos: el texto es correcto").toEqual([]);
    expect(
      r.veredicto,
      "aprueba como investigación de mercado algo a lo que no se le ha mirado nada de investigación",
    ).toBe("REVIEW_REQUIRED");
    expect(r.noComprobado.length).toBeGreaterThan(0);
  });

  it("EL CONTROL: con una sola comprobación de la disciplina ejecutada, el veredicto sigue su curso", () => {
    // Sin este control, la regla de arriba podría mandar TODO a revisión humana
    // y seguiría en verde. Una puerta que no deja pasar nada no es una puerta.
    const r = evaluar({
      dominio: "investigacion",
      contenido: {
        cuerpo: "Informe de mercado.",
        // Basta con que UNA se pueda ejecutar: aquí, la de las fuentes.
        hallazgos: [{ hallazgo: "el segundo competidor ha bajado precios", fuente: "su propia web, 12-08" }],
      },
    });
    expect(r.veredicto).not.toBe("REVIEW_REQUIRED");
  });

  it("una disciplina sin rúbrica propia NO va a revisión por eso", () => {
    // «No hay nada que mirar» y «no se pudo mirar» son cosas distintas. Tratar
    // la primera como la segunda mandaría a una persona todo lo de las
    // disciplinas que aún no tienen criterio propio: eso es ruido, no
    // seguridad, y una cola de revisión con ruido deja de mirarse.
    const r = motor.evaluar(
      { dominio: "dominio-que-no-existe", autor: "productor", contenido: { cuerpo: "Un texto correcto y normal." } },
      "qa-entregable",
    );
    expect(r.veredicto).toBe("PASS");
  });

  it("y la regla se aplica también cuando el riesgo es bajo", () => {
    // El agujero estaba justo aquí. La rama de alto riesgo ya fallaba cerrada
    // ante una bloqueante sin comprobar; la de riesgo bajo aprobaba sin haber
    // mirado una sola comprobación de la disciplina.
    const r = evaluar({
      dominio: "geo",
      riesgo: "bajo",
      contenido: { cuerpo: "Un texto perfectamente correcto sobre buscadores." },
    });
    expect(r.veredicto).toBe("REVIEW_REQUIRED");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("el inventario y la profundidad", () => {
  it("ninguna disciplina se queda sin criterio propio", () => {
    // `estrategia` y `compliance` tenían CERO comprobaciones: sus piezas sólo
    // pasaban por las comunes. Un plan que no cabe en el presupuesto salía
    // aprobado.
    const sinCriterio = dominiosConQa().filter((d) => comprobacionesDe(d).length <= 9);
    expect(
      sinCriterio,
      "estas disciplinas sólo tienen las comprobaciones comunes: se las juzga como a un texto cualquiera",
    ).toEqual([]);
  });

  it("las disciplinas principales tienen profundidad de verdad", () => {
    for (const d of ["seo", "ads", "email", "web", "cro", "estrategia"]) {
      expect(comprobacionesDe(d).length, `${d} es demasiado superficial`).toBeGreaterThanOrEqual(11);
    }
  });

  it("ningún identificador se repite dentro de una disciplina", () => {
    for (const d of dominiosConQa()) {
      const lista = comprobacionesDe(d).map((c) => c.id);
      expect(new Set(lista).size, `${d} tiene comprobaciones duplicadas`).toBe(lista.length);
    }
  });
});
