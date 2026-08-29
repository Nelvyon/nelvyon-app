/**
 * QUÉ SE HACE DESPUÉS DE MEDIR.
 *
 * EL HUECO QUE CIERRA. El motor de resultados dice si algo mejoró o empeoró.
 * Nadie decidía qué hacer con esa respuesta, así que los veinticinco servicios
 * se quedaban en «medimos» sin llegar a «y por eso cambiamos esto».
 *
 * Optimizar es un bucle, y el bucle entero tiene que existir para que valga:
 *
 *     objetivo → línea base → acción → medida → RESULTADO
 *       → DECISIÓN → siguiente acción → medida…
 *
 * LO QUE ESTE MOTOR HACE BIEN, y es lo único que lo distingue de un `if`:
 * DISTINGUE SIETE SITUACIONES QUE SE PARECEN Y NO SON LO MISMO.
 *
 *   mejoró .................... sigue por ahí
 *   empeoró ................... cambia, o deshaz lo último
 *   no cambió ................. la palanca no era ésa
 *   NO HAY DATOS SUFICIENTES .. no se sabe. NO es «no cambió».
 *   MÉTRICAS CONTRADICTORIAS .. sube una y baja otra. NO se elige la que gusta.
 *   VALOR ANÓMALO ............. un pico que no se parece a nada. No se actúa.
 *   MEDICIÓN ROTA ............. la métrica se fue a cero de golpe. Casi nunca
 *                               es el negocio: es el seguimiento.
 *
 * Las cuatro últimas son las que separan un motor de optimización de un
 * generador de cambios. Un sistema que trata «no hay datos» como «no cambió»
 * mueve palancas a ciegas y le cobra al cliente por ello. Uno que ve caer una
 * métrica a cero y responde subiendo la puja duplica el gasto justo cuando la
 * medición está rota.
 *
 * LO QUE NO HACE:
 *
 *   · NO EJECUTA. Propone. Lo que se mueve de verdad pasa por el puente, con
 *     sus siete puertas, y lo que tiene consecuencias hacia fuera necesita que
 *     una persona diga que sí.
 *   · NO INVENTA MEDIDAS. Sin datos devuelve `esperar_datos`, no un cero.
 */

import {
  politicaDe,
  palancasAutonomas,
  type Palanca,
  type PoliticaDeDisciplina,
} from "./PoliticaDeOptimizacion";

/** Una medida de una métrica en un periodo. */
export interface Medida {
  metrica: string;
  valor: number;
  /** Cuántas observaciones la sostienen: conversiones, sesiones, envíos… */
  muestra: number;
  hasta: string;
}

export interface Situacion {
  serviceId: string;
  /** La medida que se toma como punto de partida. */
  lineaBase: Medida | null;
  /** Las medidas posteriores, de la más antigua a la más reciente. */
  historial: readonly Medida[];
  /**
   * Qué se hizo desde la línea base. Sin esto no se puede deshacer nada, y
   * «revertir» se queda en una palabra bonita.
   */
  ultimaAccion?: { palanca: string; cuando: string };
  /** Cuántos ciclos seguidos llevan sin mejorar. Decide cuándo escalar. */
  ciclosSinMejora?: number;
}

export type QueHacer =
  | "seguir_igual"
  | "ajustar"
  | "revertir"
  | "escalar"
  | "esperar_datos"
  | "revisar_medicion"
  | "parar";

export interface Decision {
  queHacer: QueHacer;
  /**
   * Por qué. En la frase que se le enseñaría al cliente, no en jerga: si no se
   * puede explicar en una línea, la decisión no está tomada, está adivinada.
   */
  porQue: string;
  /** La situación que se ha reconocido. */
  situacion:
    | "mejora"
    | "empeora"
    | "sin_cambio"
    | "datos_insuficientes"
    | "metricas_contradictorias"
    | "valor_anomalo"
    | "medicion_rota"
    | "sin_linea_base"
    | "sin_politica";
  /** Qué se propone mover, si se propone algo. */
  palanca?: Palanca;
  /** Si mover eso necesita que alguien diga que sí. */
  exigeAprobacion: boolean;
  /** Cuándo se podrá saber si funcionó. Antes de eso, no se vuelve a tocar. */
  medirDeNuevoEnDias?: number;
  /** La hipótesis que se está poniendo a prueba. Sin ella no se aprende nada. */
  hipotesis?: string;
  /** Variación medida, ya interpretada. `null` si no se pudo medir. */
  variacionPct: number | null;
}

/** Cuántos ciclos sin mejorar antes de que lo mire una persona. */
export const CICLOS_ANTES_DE_ESCALAR = 3;

/**
 * Un valor es anómalo si se sale mucho de lo que venía siendo normal.
 *
 * Tres desviaciones típicas. No es un número mágico: es el punto a partir del
 * cual, con datos que se comportan medianamente bien, un valor aparece menos de
 * una vez de cada trescientas. Reaccionar a eso es reaccionar al azar.
 */
export const DESVIACIONES_PARA_SER_ANOMALO = 3;

function media(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function desviacion(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = media(xs);
  return Math.sqrt(media(xs.map((x) => (x - m) ** 2)));
}

export class MotorDeOptimizacion {
  /**
   * Decide qué hacer.
   *
   * El orden de las comprobaciones NO es casual: primero se descarta que la
   * medición esté rota, luego que falten datos, luego que el valor sea anómalo,
   * y sólo entonces se mira si mejoró o empeoró.
   *
   * Al revés, un seguimiento roto se leería como un desplome y el sistema
   * respondería cambiándolo todo justo cuando no sabe nada.
   */
  decidir(s: Situacion): Decision {
    const politica = politicaDe(s.serviceId);
    if (!politica) {
      return {
        queHacer: "escalar",
        situacion: "sin_politica",
        porQue: `no hay política de optimización para "${s.serviceId}": nadie ha declarado qué mirar ni qué se puede cambiar`,
        exigeAprobacion: false,
        variacionPct: null,
      };
    }

    if (!s.lineaBase) {
      return {
        queHacer: "esperar_datos",
        situacion: "sin_linea_base",
        porQue:
          "no hay línea base. Sin saber de dónde se partía, cualquier mejora se " +
          "podría atribuir a la temporada",
        exigeAprobacion: false,
        variacionPct: null,
      };
    }

    // LA ÚLTIMA MEDIDA **DE LA MÉTRICA QUE MANDA**, no la última del historial.
    //
    // El historial trae varias métricas mezcladas —es lo que permite detectar
    // contradicciones— y coger la última a secas calculaba la variación sobre
    // la métrica equivocada. Con la conversión al final, una subida del coste
    // se leía como una caída de la conversión.
    //
    // Si no hay ninguna de la principal, se cae a la última: mejor medir algo
    // que no medir nada, y la falta de la principal ya la delata la muestra.
    const deLaPrincipal = s.historial.filter((x) => x.metrica === s.lineaBase?.metrica);
    const ultima = deLaPrincipal[deLaPrincipal.length - 1] ?? s.historial[s.historial.length - 1];
    if (!ultima) {
      return {
        queHacer: "esperar_datos",
        situacion: "datos_insuficientes",
        porQue: "hay línea base pero ninguna medida posterior todavía",
        exigeAprobacion: false,
        variacionPct: null,
      };
    }

    // ── 1 · ¿ESTÁ ROTA LA MEDICIÓN? ────────────────────────────────────────
    //
    // Lo primero, siempre. Una métrica que venía teniendo valores y de pronto
    // marca cero no suele significar que el negocio se haya parado: significa
    // que se ha caído el seguimiento —una etiqueta borrada, un consentimiento
    // que dejó de aceptarse, una migración de la web—.
    //
    // Actuar sobre eso es lo peor que puede hacer un optimizador: responder a
    // un cero subiendo el presupuesto duplica el gasto justo cuando nadie está
    // midiendo nada.
    const previos = deLaPrincipal.slice(0, -1).map((m) => m.valor);
    const referencia = [s.lineaBase.valor, ...previos];
    if (ultima.valor === 0 && referencia.some((v) => v > 0)) {
      return {
        queHacer: "revisar_medicion",
        situacion: "medicion_rota",
        porQue:
          `"${ultima.metrica}" ha pasado a cero cuando antes tenía valores. Casi ` +
          "siempre eso es el seguimiento roto, no el negocio parado. Antes de " +
          "tocar nada hay que comprobar que se está midiendo",
        exigeAprobacion: false,
        variacionPct: null,
      };
    }

    // ── 2 · ¿HAY MUESTRA SUFICIENTE? ───────────────────────────────────────
    //
    // «No hay datos» NO es «no ha cambiado nada». Confundirlos es cómo se acaba
    // moviendo palancas a ciegas y cobrándoselo al cliente.
    if (ultima.muestra < politica.muestraMinima.minimo) {
      return {
        queHacer: "esperar_datos",
        situacion: "datos_insuficientes",
        porQue:
          `hay ${ultima.muestra} ${politica.muestraMinima.que} y hacen falta al menos ` +
          `${politica.muestraMinima.minimo}. Con menos, cualquier diferencia es ruido ` +
          "con forma de resultado",
        exigeAprobacion: false,
        variacionPct: null,
      };
    }

    // ── 3 · ¿ES UN VALOR ANÓMALO? ──────────────────────────────────────────
    //
    // Un pico aislado no es una tendencia. Cambiar la estrategia por un día raro
    // hace que la siguiente medición compare contra algo que no volverá a pasar.
    if (referencia.length >= 3) {
      const m = media(referencia);
      const d = desviacion(referencia);
      if (d > 0 && Math.abs(ultima.valor - m) > DESVIACIONES_PARA_SER_ANOMALO * d) {
        return {
          queHacer: "esperar_datos",
          situacion: "valor_anomalo",
          porQue:
            `${ultima.valor} se sale mucho de lo normal (${m.toFixed(1)} de media). ` +
            "Un pico aislado no es una tendencia: se espera a la siguiente medida " +
            "antes de cambiar nada",
          exigeAprobacion: false,
          variacionPct: null,
        };
      }
    }

    // ── 4 · LA VARIACIÓN ───────────────────────────────────────────────────
    const variacion = ((ultima.valor - s.lineaBase.valor) / Math.abs(s.lineaBase.valor || 1)) * 100;

    // ── 5 · ¿SE CONTRADICEN LAS MÉTRICAS? ──────────────────────────────────
    //
    // Sube el tráfico y bajan las ventas. Mirando sólo el tráfico, todo va bien.
    // Ésta es la comprobación que impide contar la mitad que conviene.
    const contradiccion = this.buscarContradiccion(s, politica, variacion);
    if (contradiccion) {
      return {
        queHacer: "escalar",
        situacion: "metricas_contradictorias",
        porQue: contradiccion,
        exigeAprobacion: false,
        variacionPct: Math.round(variacion * 10) / 10,
      };
    }

    // ── 6 · Ahora sí: ¿mejoró, empeoró o no cambió? ────────────────────────
    if (Math.abs(variacion) < politica.variacionMinimaPct) {
      // NO CAMBIÓ. La palanca que se movió no era la que mandaba.
      const ciclos = (s.ciclosSinMejora ?? 0) + 1;
      if (ciclos >= CICLOS_ANTES_DE_ESCALAR) {
        return {
          queHacer: "escalar",
          situacion: "sin_cambio",
          porQue:
            `${ciclos} ciclos seguidos sin mover la aguja. Seguir probando palancas ` +
            "es gastar el tiempo del cliente: hace falta que alguien replantee",
          exigeAprobacion: false,
          variacionPct: Math.round(variacion * 10) / 10,
        };
      }
      const siguiente = this.siguientePalanca(politica, s.ultimaAccion?.palanca);
      return {
        queHacer: "ajustar",
        situacion: "sin_cambio",
        porQue:
          `${variacion.toFixed(1)} % de variación, por debajo del ${politica.variacionMinimaPct} % ` +
          "que hace falta para que signifique algo. La palanca movida no era la que mandaba",
        palanca: siguiente,
        exigeAprobacion: siguiente.consecuencias.length > 0,
        medirDeNuevoEnDias: siguiente.diasHastaPoderMedir,
        hipotesis: politica.hipotesis[ciclos % politica.hipotesis.length],
        variacionPct: Math.round(variacion * 10) / 10,
      };
    }

    if (variacion <= -politica.caidaPreocupantePct) {
      // EMPEORÓ, y mucho. Si se cambió algo, lo primero es deshacerlo: es más
      // rápido de comprobar que cualquier hipótesis nueva.
      if (s.ultimaAccion) {
        return {
          queHacer: "revertir",
          situacion: "empeora",
          porQue:
            `ha caído un ${Math.abs(variacion).toFixed(1)} % desde que se ${s.ultimaAccion.palanca}. ` +
            "Deshacerlo es lo más rápido de comprobar; si sigue cayendo, no era eso",
          palanca: politica.palancas.find((p) => p.id === s.ultimaAccion?.palanca),
          exigeAprobacion:
            (politica.palancas.find((p) => p.id === s.ultimaAccion?.palanca)?.consecuencias.length ?? 0) > 0,
          medirDeNuevoEnDias: 7,
          variacionPct: Math.round(variacion * 10) / 10,
        };
      }
      return {
        queHacer: "escalar",
        situacion: "empeora",
        porQue:
          `ha caído un ${Math.abs(variacion).toFixed(1)} % y NO se había cambiado nada. ` +
          "La causa está fuera de lo que controlamos: hace falta mirarlo",
        exigeAprobacion: false,
        variacionPct: Math.round(variacion * 10) / 10,
      };
    }

    if (variacion < 0) {
      // Empeoró, pero poco. Se ajusta con otra palanca en vez de revertir.
      const siguiente = this.siguientePalanca(politica, s.ultimaAccion?.palanca);
      return {
        queHacer: "ajustar",
        situacion: "empeora",
        porQue:
          `baja un ${Math.abs(variacion).toFixed(1)} %, por debajo del ${politica.caidaPreocupantePct} % ` +
          "que obligaría a deshacer. Se prueba otra palanca",
        palanca: siguiente,
        exigeAprobacion: siguiente.consecuencias.length > 0,
        medirDeNuevoEnDias: siguiente.diasHastaPoderMedir,
        hipotesis: politica.hipotesis[0],
        variacionPct: Math.round(variacion * 10) / 10,
      };
    }

    // MEJORÓ. No se toca nada: se deja correr y se vuelve a medir. Cambiar algo
    // ahora haría imposible saber qué estaba funcionando.
    return {
      queHacer: "seguir_igual",
      situacion: "mejora",
      porQue:
        `sube un ${variacion.toFixed(1)} %. No se toca nada: cambiar algo ahora haría ` +
        "imposible saber qué estaba funcionando",
      exigeAprobacion: false,
      medirDeNuevoEnDias: politica.palancas[0]?.diasHastaPoderMedir ?? 14,
      variacionPct: Math.round(variacion * 10) / 10,
    };
  }

  /**
   * ¿Se contradice la métrica principal con alguna de las que vigilan?
   *
   * Es la comprobación que impide quedarse con la mitad que conviene. Si el
   * alcance sube un 40 % y los clics al sitio bajan un 30 %, decir «el alcance
   * ha subido» es cierto y engañoso a la vez.
   */
  private buscarContradiccion(
    s: Situacion,
    politica: PoliticaDeDisciplina,
    variacionPrincipal: number,
  ): string | null {
    if (Math.abs(variacionPrincipal) < politica.variacionMinimaPct) return null;

    for (const nombre of politica.metricasQueVigilan) {
      const base = s.historial.find((m) => m.metrica === nombre && m.hasta === s.lineaBase?.hasta);
      const ahora = [...s.historial].reverse().find((m) => m.metrica === nombre);
      if (!base || !ahora || base.valor === 0) continue;

      const v = ((ahora.valor - base.valor) / Math.abs(base.valor)) * 100;
      if (Math.abs(v) < politica.variacionMinimaPct) continue;

      // Signos opuestos y las dos por encima del umbral: contradicción.
      if (Math.sign(v) !== Math.sign(variacionPrincipal)) {
        return (
          `"${politica.metricaPrincipal}" va un ${variacionPrincipal.toFixed(1)} % y ` +
          `"${nombre}" un ${v.toFixed(1)} %: se contradicen. Quedarse con la que conviene ` +
          "sería contar la mitad de lo que pasa"
        );
      }
    }
    return null;
  }

  /**
   * La siguiente palanca a probar.
   *
   * Se prefieren las que NO necesitan aprobación: se pueden probar hoy en vez
   * de esperar a que alguien las mire, y así el bucle avanza. Y nunca se repite
   * la que se acaba de mover — si no funcionó, volver a moverla no va a
   * funcionar tampoco.
   */
  private siguientePalanca(politica: PoliticaDeDisciplina, ultima?: string): Palanca {
    const autonomas = palancasAutonomas(politica).filter((p) => p.id !== ultima);
    if (autonomas.length > 0) return autonomas[0];
    const resto = politica.palancas.filter((p) => p.id !== ultima);
    return resto[0] ?? politica.palancas[0];
  }

  /**
   * El plan de optimización de un servicio, para poder enseñarlo.
   *
   * Un cliente que pregunta «¿y qué vais a hacer si no funciona?» merece una
   * respuesta antes de que pase, no después.
   */
  plan(serviceId: string): {
    disciplina: string;
    seObserva: string;
    seVigilan: readonly string[];
    cuandoSeActua: string;
    cuandoSeEscala: readonly string[];
    palancas: Array<{ que: string; solo: boolean; diasParaMedir: number }>;
  } | null {
    const p = politicaDe(serviceId);
    if (!p) return null;
    return {
      disciplina: p.disciplina,
      seObserva: p.metricaPrincipal,
      seVigilan: p.metricasQueVigilan,
      cuandoSeActua:
        `cuando varía más de un ${p.variacionMinimaPct} % con al menos ` +
        `${p.muestraMinima.minimo} ${p.muestraMinima.que}`,
      cuandoSeEscala: p.cuandoEscalar,
      palancas: p.palancas.map((x) => ({
        que: x.que,
        solo: x.consecuencias.length === 0,
        diasParaMedir: x.diasHastaPoderMedir,
      })),
    };
  }
}
