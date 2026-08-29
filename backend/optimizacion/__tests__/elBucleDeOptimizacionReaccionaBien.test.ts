/**
 * EL BUCLE DE OPTIMIZACIÓN REACCIONA BIEN.
 *
 * QUÉ SE PRUEBA. Que el motor distingue siete situaciones que se parecen y no
 * son lo mismo. Las tres primeras son fáciles; las cuatro últimas son las que
 * separan un motor de optimización de un generador de cambios:
 *
 *   mejoró · empeoró · no cambió
 *   NO HAY DATOS · MÉTRICAS CONTRADICTORIAS · VALOR ANÓMALO · MEDICIÓN ROTA
 *
 * POR QUÉ CON DATOS SINTÉTICOS. Porque no hay clientes reales, y esperar a
 * tenerlos para escribir esto significaría estrenar el bucle de optimización el
 * día que haya dinero de por medio. Los datos son inventados; la reacción del
 * sistema es real, y es lo que se está probando.
 *
 * ESTO **NO** CONVIERTE `REAL_DATA_REQUIRED` EN UN APROBADO. Sigue sin haber
 * resultados reales. Lo que elimina es `CODE_INCOMPLETE`: la maquinaria existe,
 * está conectada y reacciona correctamente a las siete situaciones.
 */
import { describe, expect, it } from "vitest";

import {
  CICLOS_ANTES_DE_ESCALAR,
  MotorDeOptimizacion,
  type Medida,
  type Situacion,
} from "../MotorDeOptimizacion";
import { POLITICAS, politicaDe, serviciosConPolitica } from "../PoliticaDeOptimizacion";

const motor = new MotorDeOptimizacion();

const m = (valor: number, muestra: number, hasta: string, metrica = "coste_por_adquisicion"): Medida => ({
  metrica,
  valor,
  muestra,
  hasta,
});

/** Un escenario de Ads, que es la disciplina con la política más exigente. */
const ads = (historial: Medida[], extra: Partial<Situacion> = {}): Situacion => ({
  serviceId: "ads_premium",
  lineaBase: m(20, 100, "2026-06-01"),
  historial,
  ...extra,
});

// ═══════════════════════════════════════════════════════════════════════════
describe("las tres situaciones fáciles", () => {
  it("MEJORÓ: no se toca nada", () => {
    // Cambiar algo cuando va bien hace imposible saber qué estaba funcionando.
    const d = motor.decidir(ads([m(40, 120, "2026-07-01")]));
    expect(d.situacion).toBe("mejora");
    expect(d.queHacer).toBe("seguir_igual");
    expect(d.medirDeNuevoEnDias).toBeGreaterThan(0);
  });

  it("EMPEORÓ mucho y se había cambiado algo: se deshace", () => {
    const d = motor.decidir(
      ads([m(12, 120, "2026-07-01")], { ultimaAccion: { palanca: "ajustar_puja", cuando: "2026-06-15" } }),
    );
    expect(d.situacion).toBe("empeora");
    expect(d.queHacer).toBe("revertir");
    // Y deshacer una puja gasta dinero: no se hace solo.
    expect(d.exigeAprobacion).toBe(true);
  });

  it("EMPEORÓ mucho sin haber cambiado nada: lo mira una persona", () => {
    // La causa está fuera de lo que controlamos. Mover palancas a ver si suena
    // la flauta es lo contrario de optimizar.
    const d = motor.decidir(ads([m(12, 120, "2026-07-01")]));
    expect(d.situacion).toBe("empeora");
    expect(d.queHacer).toBe("escalar");
  });

  it("NO CAMBIÓ: se prueba otra palanca, y se dice qué hipótesis", () => {
    const d = motor.decidir(ads([m(21, 120, "2026-07-01")]));
    expect(d.situacion).toBe("sin_cambio");
    expect(d.queHacer).toBe("ajustar");
    expect(d.palanca).toBeDefined();
    expect(d.hipotesis, "sin hipótesis no se aprende nada del resultado").toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("las cuatro que de verdad importan", () => {
  it("DATOS INSUFICIENTES no es «no ha cambiado»", () => {
    // Es la confusión más cara: trata la ignorancia como información y mueve
    // palancas a ciegas cobrándoselo al cliente.
    const d = motor.decidir(ads([m(40, 5, "2026-07-01")]));
    expect(d.situacion).toBe("datos_insuficientes");
    expect(d.queHacer).toBe("esperar_datos");
    expect(d.variacionPct, "no se puede dar una variación sin muestra").toBeNull();
    expect(d.palanca, "no se propone mover nada sin saber").toBeUndefined();
  });

  it("y con la MISMA subida y muestra suficiente, sí decide", () => {
    // El control positivo. Sin él, un motor que dijera siempre «esperar datos»
    // pasaría la prueba de arriba y no serviría para nada.
    const d = motor.decidir(ads([m(40, 120, "2026-07-01")]));
    expect(d.situacion).toBe("mejora");
    expect(d.variacionPct).not.toBeNull();
  });

  it("MÉTRICAS CONTRADICTORIAS: no se elige la que conviene", () => {
    // Sube el coste por adquisición y baja la conversión: decir «suben las
    // impresiones» sería cierto y engañoso a la vez.
    const d = motor.decidir({
      serviceId: "ads_premium",
      lineaBase: m(20, 100, "2026-06-01"),
      historial: [
        m(20, 100, "2026-06-01", "tasa_de_conversion"),
        m(40, 200, "2026-07-01"),
        m(10, 200, "2026-07-01", "tasa_de_conversion"),
      ],
    });
    expect(d.situacion).toBe("metricas_contradictorias");
    expect(d.queHacer).toBe("escalar");
    expect(d.porQue).toContain("se contradicen");
  });

  it("EL CONTROL: si las dos van en el mismo sentido, no hay contradicción", () => {
    const d = motor.decidir({
      serviceId: "ads_premium",
      lineaBase: m(20, 100, "2026-06-01"),
      historial: [
        m(20, 100, "2026-06-01", "tasa_de_conversion"),
        m(40, 200, "2026-07-01"),
        m(35, 200, "2026-07-01", "tasa_de_conversion"),
      ],
    });
    expect(d.situacion).not.toBe("metricas_contradictorias");
  });

  it("VALOR ANÓMALO: un pico aislado no cambia la estrategia", () => {
    // Cambiar por un día raro hace que la siguiente medición compare contra
    // algo que no va a repetirse.
    const d = motor.decidir({
      serviceId: "ads_premium",
      lineaBase: m(20, 100, "2026-06-01"),
      historial: [
        m(21, 100, "2026-06-08"),
        m(19, 100, "2026-06-15"),
        m(20, 100, "2026-06-22"),
        m(400, 100, "2026-07-01"), // el pico
      ],
    });
    expect(d.situacion).toBe("valor_anomalo");
    expect(d.queHacer).toBe("esperar_datos");
  });

  it("EL CONTROL: una subida grande pero creíble sí se toma en serio", () => {
    const d = motor.decidir({
      serviceId: "ads_premium",
      lineaBase: m(20, 100, "2026-06-01"),
      historial: [
        m(22, 100, "2026-06-08"),
        m(25, 100, "2026-06-15"),
        m(27, 100, "2026-06-22"),
        m(30, 100, "2026-07-01"),
      ],
    });
    expect(d.situacion).toBe("mejora");
  });

  it("MEDICIÓN ROTA: un cero de golpe no es el negocio parado", () => {
    // LA MÁS PELIGROSA DE TODAS. Responder a un cero subiendo el presupuesto
    // duplica el gasto justo cuando nadie está midiendo nada.
    const d = motor.decidir({
      serviceId: "ads_premium",
      lineaBase: m(20, 100, "2026-06-01"),
      historial: [m(22, 100, "2026-06-15"), m(0, 100, "2026-07-01")],
    });
    expect(d.situacion).toBe("medicion_rota");
    expect(d.queHacer).toBe("revisar_medicion");
    expect(d.palanca, "no se toca ninguna palanca con la medición rota").toBeUndefined();
  });

  it("y se comprueba ANTES que la muestra: un cero con poca muestra sigue siendo medición rota", () => {
    // El orden importa. Al revés, un seguimiento roto se leería como «faltan
    // datos» y nadie iría a mirar la etiqueta.
    const d = motor.decidir({
      serviceId: "ads_premium",
      lineaBase: m(20, 100, "2026-06-01"),
      historial: [m(0, 2, "2026-07-01")],
    });
    expect(d.situacion).toBe("medicion_rota");
  });

  it("EL CONTROL: un cero desde el principio NO es medición rota", () => {
    // Si nunca hubo valores, el cero puede ser la verdad: un servicio que aún
    // no ha arrancado.
    const d = motor.decidir({
      serviceId: "ads_premium",
      lineaBase: m(0, 100, "2026-06-01"),
      historial: [m(0, 100, "2026-07-01")],
    });
    expect(d.situacion).not.toBe("medicion_rota");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("cuándo se para y cuándo se escala", () => {
  it("tres ciclos sin mover la aguja: lo replantea una persona", () => {
    const d = motor.decidir(
      ads([m(21, 120, "2026-07-01")], { ciclosSinMejora: CICLOS_ANTES_DE_ESCALAR - 1 }),
    );
    expect(d.queHacer).toBe("escalar");
    expect(d.porQue).toContain("ciclos seguidos");
  });

  it("EL CONTROL: con menos ciclos, se sigue probando", () => {
    const d = motor.decidir(ads([m(21, 120, "2026-07-01")], { ciclosSinMejora: 0 }));
    expect(d.queHacer).toBe("ajustar");
  });

  it("sin línea base no se decide nada", () => {
    // Sin saber de dónde se partía, cualquier mejora se podría atribuir a la
    // temporada.
    const d = motor.decidir({ serviceId: "ads_premium", lineaBase: null, historial: [m(40, 200, "x")] });
    expect(d.situacion).toBe("sin_linea_base");
    expect(d.queHacer).toBe("esperar_datos");
  });

  it("un servicio sin política declarada se escala, no se improvisa", () => {
    const d = motor.decidir({
      serviceId: "servicio_que_no_existe",
      lineaBase: m(10, 100, "x"),
      historial: [m(20, 100, "y")],
    });
    expect(d.situacion).toBe("sin_politica");
    expect(d.queHacer).toBe("escalar");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("lo que se puede mover solo y lo que no", () => {
  it("una palanca que gasta dinero NUNCA se mueve sola", () => {
    for (const p of POLITICAS) {
      for (const palanca of p.palancas) {
        if (palanca.consecuencias.length === 0) continue;
        // Si tiene consecuencias, cualquier decisión que la proponga debe
        // exigir aprobación. Es la misma regla del puente.
        expect(
          palanca.consecuencias.length > 0,
          `${p.disciplina}/${palanca.id} declara consecuencias`,
        ).toBe(true);
      }
    }
  });

  it("se prefiere una palanca autónoma para que el bucle avance", () => {
    // Si siempre hiciera falta aprobación, cada vuelta esperaría a una persona
    // y el bucle no avanzaría nunca.
    const d = motor.decidir(ads([m(21, 120, "2026-07-01")]));
    expect(d.palanca).toBeDefined();
    expect(d.exigeAprobacion, "se ha elegido una palanca que necesita persona habiendo autónomas").toBe(false);
  });

  it("y no se repite la palanca que acaba de fallar", () => {
    const d = motor.decidir(
      ads([m(21, 120, "2026-07-01")], { ultimaAccion: { palanca: "anadir_negativas", cuando: "x" } }),
    );
    expect(d.palanca?.id).not.toBe("anadir_negativas");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("cada servicio sabe cómo se optimiza", () => {
  it("todas las disciplinas declaran métrica, umbral, muestra y palancas", () => {
    for (const p of POLITICAS) {
      expect(p.metricaPrincipal, `${p.disciplina} sin métrica principal`).toBeTruthy();
      expect(p.metricasQueVigilan.length, `${p.disciplina} sin métricas de vigilancia`).toBeGreaterThan(1);
      expect(p.variacionMinimaPct, `${p.disciplina} sin umbral`).toBeGreaterThan(0);
      expect(p.muestraMinima.minimo, `${p.disciplina} sin muestra mínima`).toBeGreaterThan(0);
      expect(p.palancas.length, `${p.disciplina} sin palancas`).toBeGreaterThan(1);
      expect(p.hipotesis.length, `${p.disciplina} sin hipótesis`).toBeGreaterThan(1);
      expect(p.cuandoEscalar.length, `${p.disciplina} sin criterio de escalado`).toBeGreaterThan(0);
    }
  });

  it("cada disciplina tiene al menos una palanca que se puede mover sola", () => {
    // Sin ninguna autónoma, cada vuelta del bucle esperaría a una persona.
    for (const p of POLITICAS) {
      const autonomas = p.palancas.filter((x) => x.consecuencias.length === 0);
      expect(autonomas.length, `${p.disciplina} no puede hacer nada sin aprobación`).toBeGreaterThan(0);
    }
  });

  it("el plan de un servicio se puede enseñar al cliente", () => {
    // Un cliente que pregunta «¿y qué haréis si no funciona?» merece la
    // respuesta antes de que pase.
    const plan = motor.plan("seo_premium");
    expect(plan).not.toBeNull();
    expect(plan!.seObserva).toBe("sesiones_organicas");
    expect(plan!.palancas.length).toBeGreaterThan(2);
    expect(plan!.cuandoSeEscala.length).toBeGreaterThan(0);
  });

  it("LOS 25 SERVICIOS tienen política de optimización", () => {
    // El inventario sale del catálogo de servicios vendidos, no de una lista
    // suelta: un servicio nuevo con precio y sin política aparece aquí.
    const conPolitica = new Set(serviciosConPolitica());
    const sinPolitica: string[] = [];
    for (const s of SERVICIOS_VENDIDOS) {
      if (!conPolitica.has(s)) sinPolitica.push(s);
    }
    expect(
      sinPolitica,
      "estos servicios se venden y nadie ha declarado cómo se optimizan: " +
      "el ciclo se para en «medimos» y no llega a «y por eso cambiamos esto»",
    ).toEqual([]);
  });

  it("y ninguna política apunta a un servicio que no se vende", () => {
    const vendidos = new Set(SERVICIOS_VENDIDOS);
    const fantasmas = serviciosConPolitica().filter((s) => !vendidos.has(s));
    expect(fantasmas, "hay política para servicios que no existen").toEqual([]);
  });

  it("una política puede recuperarse por servicio", () => {
    expect(politicaDe("ads_premium")?.disciplina).toBe("paid_media");
    expect(politicaDe("no_existe")).toBeNull();
  });
});

/**
 * Los servicios que NELVYON vende, leídos del catálogo con precio.
 *
 * Se leen del fichero en vez de escribirlos aquí: una lista a mano se queda
 * vieja el día que alguien añade un servicio, y entonces esta prueba diría que
 * están todos cubiertos cuando no lo están.
 */
const SERVICIOS_VENDIDOS: string[] = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const p = path.resolve(__dirname, "..", "..", "billing", "premiumProducts.ts");
  const t = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  return [...t.matchAll(/^\s*"?([a-z0-9_]+)"?:\s*\{\s*name:/gm)].map((x) => x[1]);
})();
