/**
 * LAS HERRAMIENTAS.
 *
 * QUÉ SON, Y POR QUÉ NO SON PROMPTS. Un especialista de verdad no sólo escribe:
 * hace cuentas. Calcula si una campaña deja dinero, si un experimento va a
 * poder concluir, si el calendario que propone cabe en las horas que el cliente
 * tiene. Esas cuentas tienen respuesta exacta, y pedírselas a un modelo de
 * lenguaje es lo peor de los dos mundos: cuesta dinero y a veces se equivoca.
 *
 * Diecisiete de los veinticinco servicios tenían agentes que sólo le pedían
 * texto a un modelo. Esto es lo que les faltaba.
 *
 * LAS TRES REGLAS DE ESTE FICHERO:
 *
 *   1. DETERMINISTA. Misma entrada, misma salida, siempre. Una herramienta que
 *      varía no se puede usar para decidir.
 *
 *   2. NO INVENTA. Si le faltan datos devuelve `NO_SE_PUEDE_CALCULAR` con lo
 *      que falta. Un número aproximado presentado como exacto es peor que no
 *      tener número: el cliente lo usará para decidir.
 *
 *   3. EXPLICA. Cada resultado dice cómo se ha llegado a él. Un especialista
 *      que suelta una cifra sin enseñar la cuenta no se puede rebatir, y lo que
 *      no se puede rebatir tampoco se puede corregir.
 *
 * COSTE EXTERNO: 0 €. Ninguna llama a nada.
 */

export type ResultadoDeHerramienta =
  | {
      estado: "CALCULADO";
      /** El valor, para quien vaya a decidir con él. */
      valor: Record<string, unknown>;
      /** Cómo se ha llegado ahí. Sin esto la cifra no se puede rebatir. */
      comoSeCalcula: string;
      /** Qué significa, en la frase que se le diría al cliente. */
      queSignifica: string;
      /** Lo que hay que mirar antes de fiarse. Vacío si no hay salvedades. */
      salvedades?: string[];
    }
  | {
      estado: "NO_SE_PUEDE_CALCULAR";
      /** Qué falta, con nombre. «Faltan datos» no sirve para pedirlos. */
      falta: string[];
      porQueImporta: string;
    };

export interface Herramienta {
  id: string;
  /** Qué hace, en la frase que un especialista usaría. */
  que: string;
  /** Qué servicios la usan. Es lo que le da a cada agente sus herramientas. */
  servicios: readonly string[];
  /**
   * Consecuencias de ejecutarla. TODAS vacías: estas herramientas calculan, no
   * actúan. Lo que toca el mundo real pasa por el puente.
   */
  consecuencias: readonly string[];
  ejecutar(entrada: Record<string, unknown>): ResultadoDeHerramienta;
}

// ── Ayudas ──────────────────────────────────────────────────────────────────

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const lista = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);

const faltan = (falta: string[], porQue: string): ResultadoDeHerramienta => ({
  estado: "NO_SE_PUEDE_CALCULAR",
  falta,
  porQueImporta: porQue,
});

// ── Las herramientas ────────────────────────────────────────────────────────

export const HERRAMIENTAS: readonly Herramienta[] = [
  {
    id: "donde-esta-el-cuello-de-botella",
    que: "Dice en qué paso del embudo se pierde más y qué arreglarlo valdría",
    servicios: ["advisor_empresarial_premium", "consultoria_automatizacion_premium", "funnel_premium"],
    consecuencias: [],
    ejecutar(e) {
      // La cuenta que hace un asesor antes de recomendar nada: dónde se cae la
      // gente y cuánto vale arreglarlo. Sin ella se acaba proponiendo mejorar
      // el paso que menos importa porque es el más fácil de tocar.
      const pasos = lista(e.pasosDelEmbudo);
      const valorConversionCents = num(e.valorPorConversionCents);
      if (!pasos || pasos.length < 2) {
        return faltan(
          ["los pasos del embudo con cuánta gente pasa por cada uno"],
          "sin ver dónde se cae la gente, cualquier recomendación es una corazonada",
        );
      }

      const secuencia = pasos.map((p) => {
        const o = p as { nombre?: string; personas?: number };
        return { nombre: String(o.nombre ?? "sin nombre"), personas: Number(o.personas ?? 0) };
      });

      let peor = { nombre: "", perdidaPct: 0, personasPerdidas: 0, desde: "" };
      for (let i = 1; i < secuencia.length; i += 1) {
        const antes = secuencia[i - 1];
        const ahora = secuencia[i];
        if (antes.personas <= 0) continue;
        const perdidas = antes.personas - ahora.personas;
        const pct = (perdidas / antes.personas) * 100;
        if (pct > peor.perdidaPct) {
          peor = { nombre: ahora.nombre, perdidaPct: pct, personasPerdidas: perdidas, desde: antes.nombre };
        }
      }

      if (!peor.nombre) {
        return faltan(
          ["números de personas por paso que vayan de más a menos"],
          "los datos no describen un embudo: no se pierde gente en ningún paso",
        );
      }

      // Cuánto valdría recuperar la mitad de lo que se pierde ahí. La mitad y
      // no todo: recuperar el 100 % de un paso no le pasa a nadie, y prometerlo
      // sería justo el tipo de cifra inventada que aquí no vale.
      const recuperables = Math.round(peor.personasPerdidas * 0.5);
      const valor = valorConversionCents !== null ? recuperables * valorConversionCents : null;

      return {
        estado: "CALCULADO",
        valor: {
          pasoQueMasPierde: peor.nombre,
          vieneDe: peor.desde,
          perdidaPct: Math.round(peor.perdidaPct * 10) / 10,
          personasPerdidas: peor.personasPerdidas,
          personasRecuperablesEstimadas: recuperables,
          valorSiSeRecuperaCents: valor,
        },
        comoSeCalcula:
          "se compara cada paso con el anterior y se toma la mayor caída; el valor supone " +
          "recuperar la MITAD de lo que se pierde ahí",
        queSignifica:
          valor === null
            ? `donde más se pierde es al pasar de «${peor.desde}» a «${peor.nombre}»: se cae el ` +
              `${peor.perdidaPct.toFixed(1)} %. Sin saber cuánto vale una conversión no se puede ` +
              "decir cuánto vale arreglarlo"
            : `donde más se pierde es al pasar de «${peor.desde}» a «${peor.nombre}». Recuperar la ` +
              `mitad valdría unos ${(valor / 100).toFixed(0)} €`,
        salvedades: [
          "la mitad recuperable es una convención prudente, no una medida",
          "un paso puede perder mucho y estar bien: filtrar pronto ahorra trabajo después",
        ],
      };
    },
  },
  {
    id: "economia-de-unidad",
    que: "Dice si cada venta deja dinero o lo pierde",
    servicios: ["ecommerce_premium", "ads_premium", "funnel_premium", "landing_premium"],
    consecuencias: [],
    ejecutar(e) {
      // LA CUENTA QUE DECIDE SI UN NEGOCIO GANA. Vender más no es ganar más si
      // traer cada pedido cuesta más de lo que deja.
      const ticket = num(e.ticketMedioCents);
      const margenPct = num(e.margenPct);
      const costeAdquisicion = num(e.costePorAdquisicionCents);
      const falta: string[] = [];
      if (ticket === null) falta.push("ticket medio del pedido");
      if (margenPct === null) falta.push("margen en porcentaje");
      if (costeAdquisicion === null) falta.push("cuánto cuesta traer un pedido");
      if (falta.length > 0) {
        return faltan(
          falta,
          "sin esto sólo se puede decir si una campaña vende, no si gana o pierde dinero",
        );
      }

      const margenPorPedido = Math.round(ticket! * (margenPct! / 100));
      const beneficio = margenPorPedido - costeAdquisicion!;
      const cacMaximo = margenPorPedido;

      return {
        estado: "CALCULADO",
        valor: {
          margenPorPedidoCents: margenPorPedido,
          beneficioPorPedidoCents: beneficio,
          costeMaximoPorAdquisicionCents: cacMaximo,
          ganaDinero: beneficio > 0,
        },
        comoSeCalcula:
          `margen por pedido = ${(ticket! / 100).toFixed(2)} € × ${margenPct} % = ` +
          `${(margenPorPedido / 100).toFixed(2)} €; beneficio = margen − coste de adquisición`,
        queSignifica:
          beneficio > 0
            ? `cada pedido deja ${(beneficio / 100).toFixed(2)} € limpios. Se puede pagar hasta ` +
              `${(cacMaximo / 100).toFixed(2)} € por traerlo antes de perder dinero`
            : `cada pedido PIERDE ${(Math.abs(beneficio) / 100).toFixed(2)} €. Vender más ` +
              "empeora el resultado: hay que bajar el coste de adquisición o subir el margen",
        salvedades: [
          "no incluye costes fijos ni devoluciones: el beneficio real será menor",
          "si hay compra repetida, el coste de adquisición se reparte entre varios pedidos",
        ],
      };
    },
  },
  {
    id: "muestra-necesaria",
    que: "Dice cuánto tráfico hace falta para que un experimento concluya",
    servicios: ["funnel_premium", "landing_premium", "web_premium", "ecommerce_premium"],
    consecuencias: [],
    ejecutar(e) {
      // Sin esto se lanzan experimentos que no van a poder responder nunca, y
      // el cliente espera semanas por una respuesta que no llegará.
      const conversionActual = num(e.tasaDeConversionPct);
      const mejoraBuscadaPct = num(e.mejoraBuscadaPct);
      const visitasMensuales = num(e.visitasMensuales);
      const falta: string[] = [];
      if (conversionActual === null) falta.push("tasa de conversión actual");
      if (mejoraBuscadaPct === null) falta.push("qué mejora se busca");
      if (falta.length > 0) {
        return faltan(falta, "sin esto no se puede saber si el experimento podrá concluir");
      }

      // Aproximación estándar para comparar dos proporciones con 95 % de
      // confianza y 80 % de potencia. La constante 16 sale de esos dos valores.
      const p = conversionActual! / 100;
      const delta = p * (mejoraBuscadaPct! / 100);
      if (delta <= 0) {
        return faltan(["una mejora buscada mayor que cero"], "no se puede medir una mejora de cero");
      }
      const porVariante = Math.ceil((16 * p * (1 - p)) / delta ** 2);
      const total = porVariante * 2;
      const semanas = visitasMensuales ? Math.ceil(total / (visitasMensuales / 4.3)) : null;

      return {
        estado: "CALCULADO",
        valor: {
          visitasPorVariante: porVariante,
          visitasTotales: total,
          semanasNecesarias: semanas,
          viable: semanas === null ? null : semanas <= 8,
        },
        comoSeCalcula:
          "n por variante = 16 × p × (1 − p) / delta², con 95 % de confianza y 80 % de potencia",
        queSignifica:
          semanas === null
            ? `hacen falta ${total.toLocaleString("es-ES")} visitas en total. Sin saber el tráfico ` +
              "mensual no se puede decir cuánto tardará"
            : semanas <= 8
              ? `en unas ${semanas} semanas habrá respuesta`
              : `harían falta ${semanas} semanas: demasiado. O se busca una mejora mayor, o se ` +
                "prueba otra cosa que no dependa de un test",
        salvedades: [
          "supone tráfico estable: una campaña estacional lo distorsiona",
          "mirar el resultado antes de tiempo invalida la prueba",
        ],
      };
    },
  },
  {
    id: "reparto-de-presupuesto",
    que: "Dice en cuántos canales se puede estar de verdad con el presupuesto que hay",
    servicios: ["ads_premium", "influencer_marketing_premium"],
    consecuencias: [],
    ejecutar(e) {
      // Repartir poco dinero entre muchos canales no es una estrategia
      // multicanal: es no estar en ninguno. Cada canal necesita un mínimo para
      // que su sistema de pujas aprenda.
      const mensualCents = num(e.presupuestoMensualCents);
      const canales = lista(e.canales);
      if (mensualCents === null) {
        return faltan(["presupuesto mensual"], "sin presupuesto no hay plan de medios que valga");
      }

      const MINIMO_DIARIO_POR_CANAL = 1000; // 10 €/día
      const diario = mensualCents / 30;
      const canalesViables = Math.floor(diario / MINIMO_DIARIO_POR_CANAL);
      const pedidos = canales?.length ?? null;

      return {
        estado: "CALCULADO",
        valor: {
          presupuestoDiarioCents: Math.round(diario),
          canalesViables: Math.max(canalesViables, 0),
          canalesPedidos: pedidos,
          alcanza: pedidos === null ? null : canalesViables >= pedidos,
        },
        comoSeCalcula:
          `${(mensualCents / 100).toFixed(0)} € / 30 días = ${(diario / 100).toFixed(2)} €/día; ` +
          `cada canal necesita al menos ${MINIMO_DIARIO_POR_CANAL / 100} €/día para tener volumen`,
        queSignifica:
          canalesViables === 0
            ? "el presupuesto no llega ni para un canal con volumen suficiente. Antes de pagar " +
              "anuncios hay opciones más baratas"
            : pedidos !== null && canalesViables < pedidos
              ? `se piden ${pedidos} canales y sólo dan para ${canalesViables}. Repartirlo entre ` +
                "todos es no estar en ninguno"
              : `da para ${canalesViables} canal(es) con volumen suficiente para aprender`,
        salvedades: ["el mínimo por canal varía por sector: en sectores caros hace falta más"],
      };
    },
  },
  {
    id: "calendario-viable",
    que: "Dice si el calendario cabe en las horas que el cliente tiene",
    servicios: [
      "social_media_premium",
      "contenido_copywriting_premium",
      "personal_digital_premium",
      "formacion_capacitacion_digital_premium",
    ],
    consecuencias: [],
    ejecutar(e) {
      // Un plan que no se puede cumplir no fracasa por el cliente: fracasa al
      // diseñarlo. Y el cliente se queda pensando que la culpa fue suya.
      const piezasPorSemana = num(e.piezasPorSemana);
      const horasDisponibles = num(e.horasSemanalesDelCliente);
      const horasPorPieza = num(e.horasPorPieza) ?? 1.5;
      const falta: string[] = [];
      if (piezasPorSemana === null) falta.push("cuántas piezas por semana");
      if (horasDisponibles === null) falta.push("cuántas horas puede dedicar el cliente");
      if (falta.length > 0) {
        return faltan(falta, "sin esto se propone un calendario que nadie va a cumplir");
      }

      const necesarias = piezasPorSemana! * horasPorPieza;
      const cabe = necesarias <= horasDisponibles!;
      const maximo = Math.floor(horasDisponibles! / horasPorPieza);

      return {
        estado: "CALCULADO",
        valor: {
          horasNecesarias: Math.round(necesarias * 10) / 10,
          horasDisponibles,
          cabe,
          piezasMaximasViables: maximo,
        },
        comoSeCalcula: `${piezasPorSemana} piezas × ${horasPorPieza} h = ${necesarias} h/semana`,
        queSignifica: cabe
          ? `el calendario cabe: ${necesarias} h de las ${horasDisponibles} disponibles`
          : `harían falta ${necesarias} h y hay ${horasDisponibles}. El máximo realista son ` +
            `${maximo} pieza(s) por semana`,
        salvedades: ["la primera pieza de cada formato cuesta más que las siguientes"],
      };
    },
  },
  {
    id: "legibilidad",
    que: "Dice si el texto se entiende a la primera",
    servicios: [
      "contenido_copywriting_premium",
      "email_marketing_premium",
      "landing_premium",
      "web_premium",
      "seo_premium",
    ],
    consecuencias: [],
    ejecutar(e) {
      const texto = typeof e.texto === "string" ? e.texto.trim() : "";
      if (!texto) return faltan(["el texto"], "no hay nada que medir");

      const frases = texto.split(/[.!?]+/).filter((f) => f.trim().length > 0);
      const palabras = texto.split(/\s+/).filter(Boolean);
      if (frases.length === 0 || palabras.length < 20) {
        return faltan(
          ["un texto de al menos 20 palabras"],
          "con menos, la medida no significa nada",
        );
      }

      const palabrasPorFrase = palabras.length / frases.length;
      const silabas = palabras.reduce(
        (n, p) => n + Math.max(1, (p.toLowerCase().match(/[aeiouáéíóúü]+/g) ?? []).length),
        0,
      );
      const silabasPorPalabra = silabas / palabras.length;

      // Fórmula de Fernández Huerta, la adaptación al español de la escala de
      // legibilidad más usada. Por encima de 60 lo entiende cualquiera.
      const indice = 206.84 - 60 * silabasPorPalabra - 1.02 * palabrasPorFrase;

      return {
        estado: "CALCULADO",
        valor: {
          indice: Math.round(indice),
          palabrasPorFrase: Math.round(palabrasPorFrase * 10) / 10,
          silabasPorPalabra: Math.round(silabasPorPalabra * 100) / 100,
          nivel: indice >= 70 ? "fácil" : indice >= 50 ? "normal" : "difícil",
        },
        comoSeCalcula: "Fernández Huerta: 206,84 − 60 × sílabas/palabra − 1,02 × palabras/frase",
        queSignifica:
          indice >= 70
            ? "se entiende sin esfuerzo"
            : indice >= 50
              ? "se entiende, pero pide atención"
              : `cuesta de leer (${Math.round(indice)}). Frases más cortas y palabras más comunes`,
        salvedades: [
          "un texto técnico para un público técnico puede puntuar bajo y estar bien",
        ],
      };
    },
  },
  {
    id: "contraste-de-color",
    que: "Dice si el texto sobre el fondo se lee",
    servicios: [
      "diseno_grafico_creatividades_premium",
      "branding_premium",
      "web_premium",
      "landing_premium",
      "video_multimedia_premium",
      "3d_contenido_inmersivo_premium",
      "fotografia_producto_premium",
    ],
    consecuencias: [],
    ejecutar(e) {
      const texto = typeof e.colorTexto === "string" ? e.colorTexto : "";
      const fondo = typeof e.colorFondo === "string" ? e.colorFondo : "";
      const hex = /^#?([0-9a-f]{6})$/i;
      if (!hex.test(texto) || !hex.test(fondo)) {
        return faltan(
          ["color del texto y del fondo en hexadecimal"],
          "sin los dos colores no se puede saber si el texto se lee",
        );
      }

      const lum = (c: string): number => {
        const h = hex.exec(c)![1];
        const canal = (i: number): number => {
          const v = parseInt(h.slice(i, i + 2), 16) / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
      };

      const a = lum(texto);
      const b = lum(fondo);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

      return {
        estado: "CALCULADO",
        valor: {
          contraste: Math.round(ratio * 100) / 100,
          cumpleTextoNormal: ratio >= 4.5,
          cumpleTextoGrande: ratio >= 3,
        },
        comoSeCalcula: "relación de luminancias según WCAG 2.1",
        queSignifica:
          ratio >= 4.5
            ? `contraste ${ratio.toFixed(1)}: se lee bien a cualquier tamaño`
            : ratio >= 3
              ? `contraste ${ratio.toFixed(1)}: sólo vale para texto grande`
              : `contraste ${ratio.toFixed(1)}: no se lee. Hay que cambiar uno de los dos colores`,
      };
    },
  },
  {
    id: "arbol-de-conversacion",
    que: "Convierte las preguntas frecuentes en un árbol con salida a persona",
    servicios: ["bots_premium", "voz_premium", "canales_comunicaciones_premium"],
    consecuencias: [],
    ejecutar(e) {
      const preguntas = lista(e.preguntasFrecuentes);
      const cuandoPersona = lista(e.cuandoPasarAPersona);
      if (!preguntas || preguntas.length === 0) {
        return faltan(
          ["las preguntas que le hacen al cliente todos los días"],
          "un bot sin las preguntas reales contesta lo que nadie pregunta",
        );
      }
      if (!cuandoPersona || cuandoPersona.length === 0) {
        return faltan(
          ["en qué casos tiene que coger el teléfono una persona"],
          "es lo que separa un bot útil de uno que enfada: sin eso insiste en resolver lo que no puede",
        );
      }

      const nodos = preguntas.map((p, i) => ({
        id: `p${i + 1}`,
        pregunta: String(p),
        // Cada nodo lleva su salida: sin ella el visitante se queda dando
        // vueltas y acaba escribiendo en Google «teléfono de».
        salidaAPersona: true,
      }));

      return {
        estado: "CALCULADO",
        valor: {
          nodos,
          reglasDeEscalado: cuandoPersona.map(String),
          coberturaEstimadaPct: Math.min(95, nodos.length * 8),
        },
        comoSeCalcula: "un nodo por pregunta frecuente, más las reglas de escalado declaradas",
        queSignifica:
          `${nodos.length} preguntas cubiertas y ${cuandoPersona.length} salida(s) a persona. ` +
          "Toda rama puede acabar en alguien del equipo",
        salvedades: [
          "la cobertura es una estimación por número de preguntas, no una medida de uso real",
        ],
      };
    },
  },
  {
    id: "clasificar-resenas",
    que: "Separa las reseñas por lo que se repite y por gravedad",
    servicios: ["reputacion_online_orm_premium"],
    consecuencias: [],
    ejecutar(e) {
      const resenas = lista(e.resenas);
      if (!resenas || resenas.length === 0) {
        return faltan(["las reseñas"], "sin ellas no se puede saber de qué se queja la gente");
      }

      const temas = new Map<string, number>();
      let graves = 0;
      for (const r of resenas) {
        const o = r as { texto?: string; estrellas?: number; tema?: string };
        const tema = o.tema ?? "sin clasificar";
        temas.set(tema, (temas.get(tema) ?? 0) + 1);
        if (typeof o.estrellas === "number" && o.estrellas <= 2) graves += 1;
      }

      const recurrentes = [...temas.entries()]
        .filter(([, n]) => n >= 3)
        .sort((a, b) => b[1] - a[1])
        .map(([tema, n]) => ({ tema, veces: n }));

      return {
        estado: "CALCULADO",
        valor: {
          total: resenas.length,
          graves,
          temasRecurrentes: recurrentes,
          hayProblemaDeFondo: recurrentes.length > 0,
        },
        comoSeCalcula: "un tema es recurrente cuando aparece en tres o más reseñas",
        queSignifica:
          recurrentes.length > 0
            ? `«${recurrentes[0].tema}» aparece ${recurrentes[0].veces} veces. Eso NO lo arregla ` +
              "una respuesta: lo arregla el cliente cambiando algo"
            : "no hay ninguna queja que se repita: se puede responder caso a caso",
        salvedades: ["clasifica por el tema declarado, no interpreta el texto"],
      };
    },
  },
  {
    id: "plan-de-integracion",
    que: "Dice qué partes de una integración necesitan cola, reintento o idempotencia",
    servicios: ["integraciones_apis_premium", "consultoria_automatizacion_premium", "mantenimiento_web_premium"],
    consecuencias: [],
    ejecutar(e) {
      const flujos = lista(e.flujos);
      if (!flujos || flujos.length === 0) {
        return faltan(
          ["qué información tiene que viajar y en qué dirección"],
          "sin saber qué flujos hay no se puede decir qué necesita protección",
        );
      }

      const analizados = flujos.map((f) => {
        const o = f as { nombre?: string; puedePerderse?: boolean; escribe?: boolean; volumenDiario?: number };
        // Lo que NO puede perderse necesita cola. Lo que escribe necesita
        // idempotencia, porque un reintento no puede duplicar el efecto.
        const necesitaCola = o.puedePerderse === false;
        const necesitaIdempotencia = o.escribe === true;
        const necesitaLimite = (o.volumenDiario ?? 0) > 1000;
        return {
          flujo: o.nombre ?? "sin nombre",
          necesitaCola,
          necesitaIdempotencia,
          necesitaLimiteDeRitmo: necesitaLimite,
          porQue: [
            necesitaCola ? "no puede perderse si la conexión se cae" : null,
            necesitaIdempotencia ? "escribe: un reintento no puede duplicar" : null,
            necesitaLimite ? "mucho volumen: hay que respetar el límite del proveedor" : null,
          ].filter(Boolean),
        };
      });

      return {
        estado: "CALCULADO",
        valor: {
          flujos: analizados,
          conCola: analizados.filter((x) => x.necesitaCola).length,
          conIdempotencia: analizados.filter((x) => x.necesitaIdempotencia).length,
        },
        comoSeCalcula:
          "cola si el flujo no puede perderse; idempotencia si escribe; límite de ritmo por encima de 1.000/día",
        queSignifica:
          `${analizados.filter((x) => x.necesitaCola).length} de ${analizados.length} flujos no ` +
          "pueden perderse: ésos van por cola, no por llamada directa",
      };
    },
  },
  {
    id: "hueco-de-contenido",
    que: "Dice qué busca la gente que el cliente no responde",
    servicios: ["seo_premium", "contenido_copywriting_premium"],
    consecuencias: [],
    ejecutar(e) {
      const buscado = lista(e.loQueSeBusca);
      const publicado = lista(e.loQueYaHay);
      if (!buscado || buscado.length === 0) {
        return faltan(["qué busca la gente"], "sin eso no se puede saber qué falta por responder");
      }

      const yaCubierto = new Set(
        (publicado ?? []).map((x) => String((x as { tema?: string })?.tema ?? x).toLowerCase()),
      );
      const huecos = buscado
        .map((x) => {
          const o = x as { termino?: string; volumen?: number; intencion?: string };
          return {
            termino: String(o.termino ?? x),
            volumen: o.volumen ?? null,
            intencion: o.intencion ?? "sin declarar",
          };
        })
        .filter((x) => !yaCubierto.has(x.termino.toLowerCase()))
        .sort((a, b) => (b.volumen ?? 0) - (a.volumen ?? 0));

      return {
        estado: "CALCULADO",
        valor: {
          huecos: huecos.slice(0, 20),
          cuantos: huecos.length,
          yaCubiertos: buscado.length - huecos.length,
        },
        comoSeCalcula: "lo que se busca menos lo que ya está publicado, ordenado por volumen",
        queSignifica:
          huecos.length === 0
            ? "no hay huecos: lo que se busca ya está cubierto. Toca mejorar lo que hay"
            : `${huecos.length} búsquedas sin respuesta. La primera es «${huecos[0].termino}»`,
        salvedades: [
          "compara por término exacto: dos formas de decir lo mismo cuentan como dos",
        ],
      };
    },
  },
  {
    id: "salud-de-la-lista",
    que: "Dice si a esta lista se le puede escribir y en qué estado está",
    servicios: ["email_marketing_premium", "funnel_premium"],
    consecuencias: [],
    ejecutar(e) {
      const origen = typeof e.origenDeLaLista === "string" ? e.origenDeLaLista : "";
      const total = num(e.contactos);
      const rebotesPct = num(e.rebotesPct);
      const quejasPct = num(e.quejasPct);
      if (!origen) {
        return faltan(
          ["de dónde salió la lista"],
          "es la primera pregunta antes de escribir una sola línea: a una lista comprada no se le puede escribir",
        );
      }

      const comprada = /\b(comprad\w+|alquilad\w+|scraping|extra[íi]d\w+)\b/i.test(origen);
      const problemas: string[] = [];
      if (comprada) problemas.push("la lista es comprada o extraída: NO se le puede escribir");
      if ((rebotesPct ?? 0) > 2) problemas.push(`${rebotesPct} % de rebotes: la lista está sucia`);
      if ((quejasPct ?? 0) > 0.1) {
        problemas.push(`${quejasPct} % de quejas: por encima de 0,1 % peligra el dominio del cliente`);
      }

      return {
        estado: "CALCULADO",
        valor: {
          sePuedeEnviar: !comprada,
          contactos: total,
          problemas,
        },
        comoSeCalcula:
          "origen legítimo + rebotes por debajo del 2 % + quejas por debajo del 0,1 %",
        queSignifica:
          problemas.length === 0
            ? "la lista está sana y se le puede escribir"
            : problemas[0],
        salvedades: ["los umbrales son los que usan los proveedores de correo para bloquear"],
      };
    },
  },
];

const PORSERVICIO = new Map<string, Herramienta[]>();
for (const h of HERRAMIENTAS) {
  for (const s of h.servicios) {
    PORSERVICIO.set(s, [...(PORSERVICIO.get(s) ?? []), h]);
  }
}

/** Las herramientas de un servicio. Es lo que le da a su agente algo que hacer además de escribir. */
export function herramientasDe(serviceId: string): Herramienta[] {
  return PORSERVICIO.get(serviceId) ?? [];
}

export function serviciosConHerramientas(): string[] {
  return [...PORSERVICIO.keys()].sort();
}

/**
 * Ejecuta las herramientas de un servicio con lo que haya.
 *
 * Devuelve TODAS, incluidas las que no han podido calcular: saber qué falta es
 * la mitad del valor. Una herramienta que se calla cuando le faltan datos deja
 * al agente creyendo que no hacía falta ese dato.
 */
export function ejecutarLasDe(
  serviceId: string,
  entrada: Record<string, unknown>,
): Array<{ herramienta: string; que: string; resultado: ResultadoDeHerramienta }> {
  return herramientasDe(serviceId).map((h) => ({
    herramienta: h.id,
    que: h.que,
    resultado: h.ejecutar(entrada),
  }));
}
