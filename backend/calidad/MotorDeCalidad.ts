/**
 * EL MOTOR DE CALIDAD.
 *
 * La regla que lo justifica: **el agente que produce algo no puede ser su único
 * juez**. Un agente que se evalúa a sí mismo aprueba lo que sabe hacer, y lo
 * que no sabe hacer no lo detecta — no por mala fe, sino porque el mismo
 * razonamiento que produjo el fallo lo revisa.
 *
 * TRES CLASES DE COMPROBACIÓN, y elegir mal entre ellas es el error caro:
 *
 *   DETERMINISTA   una regla que se puede escribir. «¿Hay título?», «¿El
 *                  titular pasa de 60 caracteres?», «¿La URL responde?».
 *                  Siempre que se pueda resolver así, se resuelve así: es más
 *                  rápido, más barato y no se equivoca.
 *
 *   RÚBRICA        criterios de dominio evaluables sin modelo, con una
 *                  puntuación. «¿Un solo CTA?», «¿La promesa es concreta?».
 *
 *   MODELO         juicio que exige leer. Sólo con IA real disponible.
 *
 * Y LA REGLA QUE ESTE PROYECTO YA PAGÓ CARA:
 *
 *     NUNCA se presenta una evaluación de reglas como si fuera de modelo.
 *
 * Producción tiene 14.178 eventos que decían `ok: true` sobre trabajo que
 * ninguna IA había hecho. Repetir ese error en la CAPA DE CALIDAD sería peor:
 * sería un sello de aprobación que nadie ha dado.
 *
 * Por eso todo veredicto declara con qué se produjo: `REAL`, `RULE_BASED`,
 * `MOCK` o `UNAVAILABLE`.
 */

import { resolveLlmMode } from "../autonomous/llm/llmAdapter";
import { proveedoresDisponibles } from "../autonomous/llm/providers";
import { ES_PARA_ESTE_CLIENTE } from "./esParaEsteCliente";
import {
  SOBRE_LA_PROSA_ADS,
  SOBRE_LA_PROSA_CONTENIDO,
  SOBRE_LA_PROSA_CRM,
  SOBRE_LA_PROSA_ECOMMERCE,
  SOBRE_LA_PROSA_SEO,
  SOBRE_LA_PROSA_SOCIAL,
  SOBRE_LA_PROSA_WEB,
} from "./comprobacionesSobreLaProsa";

/** Con qué se evaluó. Cerrado, y nunca se infiere. */
export type ModoDeEvaluacion =
  /** Un modelo real leyó esto. */
  | "REAL"
  /** Reglas y rúbricas deterministas. Es un veredicto legítimo. */
  | "RULE_BASED"
  /** Se pidió modo simulado. NO es una evaluación. */
  | "MOCK"
  /** Hacía falta modelo, no lo hubo, y no se degrada en silencio. */
  | "UNAVAILABLE";

export type Veredicto =
  | "PASS"
  | "PASS_WITH_WARNINGS"
  | "REVIEW_REQUIRED"
  | "FAIL";

export interface Hallazgo {
  /** Identificador estable de la comprobación, para poder seguirla en el tiempo. */
  id: string;
  /** Qué falla, en una frase que se entiende sin abrir nada. */
  quePasa: string;
  gravedad: "bloqueante" | "aviso" | "nota";
  /** Dónde. Un hallazgo sin ubicación no se puede arreglar. */
  donde?: string;
  /** Con qué se detectó. */
  modo: ModoDeEvaluacion;
}

export interface Resultado {
  veredicto: Veredicto;
  /** El modo MÁS DÉBIL de los usados: si algo faltó, el conjunto lo refleja. */
  modo: ModoDeEvaluacion;
  hallazgos: Hallazgo[];
  /** 0–100. `null` cuando no hay forma de puntuar sin adivinar. */
  puntuacion: number | null;
  /** Qué comprobaciones NO se pudieron hacer, y por qué. */
  noComprobado: Array<{ id: string; porQue: string }>;
}

/** Lo que se somete a calidad. */
export interface Pieza {
  /** El dominio decide qué comprobaciones aplican. */
  dominio: string;
  /** Quién la produjo. Se usa para impedir que se evalúe a sí mismo. */
  autor: string;
  /** El contenido, en la forma que el dominio entienda. */
  contenido: Record<string, unknown>;
  /** Contexto del cliente, cuando lo haya. Algunas reglas lo necesitan. */
  contexto?: Record<string, unknown>;
  /**
   * Riesgo de la acción que seguiría si esto se aprueba. Las de alto riesgo
   * fallan cerradas ante cualquier duda.
   */
  riesgo?: "bajo" | "alto";
}

/** Una comprobación concreta de un dominio. */
export interface Comprobacion {
  id: string;
  descripcion: string;
  clase: "determinista" | "rubrica" | "modelo";
  gravedad: Hallazgo["gravedad"];
  /**
   * Devuelve `null` si pasa, o el motivo si falla. `undefined` si no se puede
   * comprobar con lo que hay — que NO es lo mismo que pasar.
   */
  evaluar(pieza: Pieza): string | null | undefined;
}

export class ErrorDeCalidad extends Error {
  constructor(
    readonly codigo: "AUTOEVALUACION" | "DOMINIO_DESCONOCIDO",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeCalidad";
  }
}

// ── Comprobaciones comunes ──────────────────────────────────────────────────

const texto = (p: Pieza, clave: string): string =>
  typeof p.contenido[clave] === "string" ? (p.contenido[clave] as string) : "";

/**
 * Afirmaciones que no se pueden sostener sin dato. Aparecen en el copy
 * generado y son exactamente las que meten a un cliente en problemas.
 */
const PROMESAS_SIN_RESPALDO = [
  /\bgarantiz\w+\b/i,
  /\b100\s*%\s*(de\s+)?(éxito|exito|efectiv\w+|garantiz\w+)\b/i,
  /\bel\s+mejor\s+del\s+mundo\b/i,
  /\bresultados?\s+inmediat\w+\b/i,
  /\bsin\s+riesgo\b/i,
];

const COMUNES: readonly Comprobacion[] = [
  // Ninguna disciplina se libra de estar en el idioma del cliente, en su mercado
  // y sin inventarle la historia: un anuncio en el idioma equivocado lo esta
  // igual de mal siendo anuncio que siendo correo.
  ...ES_PARA_ESTE_CLIENTE,
  {
    id: "tiene-contenido",
    descripcion: "La pieza no está vacía",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) =>
      Object.keys(p.contenido).length === 0 ? "la pieza no tiene contenido" : null,
  },
  {
    id: "sin-marcadores-de-plantilla",
    descripcion: "No quedan huecos sin rellenar",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      const todo = JSON.stringify(p.contenido);
      // SENSIBLE A MAYUSCULAS a proposito. Los marcadores de plantilla son
      // mayusculas por convencion, y buscarlos sin distinguir convertia
      // cualquier texto con cuatro equis seguidas en un fallo bloqueante. Un
      // motor de calidad que suspende trabajo correcto deja de usarse, y a
      // partir de ahi no protege nada aunque siga funcionando.
      const m = /\{\{\s*\w+\s*\}\}|\[NOMBRE\]|LOREM IPSUM|XXXX/.exec(todo);
      return m ? `queda un marcador sin rellenar: ${m[0]}` : null;
    },
  },
  {
    id: "sin-promesas-sin-respaldo",
    descripcion: "No promete lo que no se puede sostener",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      const todo = JSON.stringify(p.contenido);
      for (const re of PROMESAS_SIN_RESPALDO) {
        const m = re.exec(todo);
        if (m) return `promete algo que no se puede sostener: «${m[0]}»`;
      }
      return null;
    },
  },
  {
    id: "sin-url-simulada",
    descripcion: "No contiene enlaces de mentira",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      const todo = JSON.stringify(p.contenido);
      const m = /\b(mock:\/\/|example\.com|localhost|TODO_URL)\b/i.exec(todo);
      return m ? `contiene un enlace que no es real: ${m[0]}` : null;
    },
  },
  {
    id: "sin-metricas-inventadas",
    descripcion: "No cita cifras que nadie ha medido",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      // LA MÁS IMPORTANTE DE TODO EL FICHERO.
      //
      // Un texto que dice «aumentarás un 47 % las conversiones» suena mucho
      // mejor que uno honesto, y por eso sale solo. El problema es que ese 47 %
      // no lo ha medido nadie: es una cifra bonita que el cliente repetirá
      // hasta que alguien le pida la fuente.
      //
      // Se permite una cifra CUANDO VIENE DE UN DATO DEL PROPIO CLIENTE — su
      // histórico, su analítica— y esos llegan por `contexto`. Lo que se
      // persigue es la promesa numérica sin respaldo.
      const todo = JSON.stringify(p.contenido);
      const contexto = JSON.stringify(p.contexto ?? {});
      const promesas = [
        /\b(aumentar\w*|subir\w*|incrementar\w*|multiplicar\w*|reducir\w*|bajar\w*)[^.]{0,40}\b\d{1,3}\s*%/gi,
        /\b\d{1,3}\s*%\s+(más|menos|de\s+(aumento|mejora|incremento|reducción))/gi,
        /\bx\s?\d{1,2}\s+(en|de)\s+(ventas|leads|conversiones|tráfico)/gi,
        /\bROI\s+(de|del)\s+\d/gi,
      ];
      for (const re of promesas) {
        const m = re.exec(todo);
        if (!m) continue;
        // Si esa misma cifra está en el contexto del cliente, es un dato suyo.
        const cifra = /\d{1,3}/.exec(m[0])?.[0];
        if (cifra && contexto.includes(cifra)) continue;
        return `promete «${m[0].trim()}» y esa cifra no sale de ningún dato del cliente`;
      }
      return null;
    },
  },
  {
    id: "sin-fuentes-inventadas",
    descripcion: "No cita estudios que no puede enseñar",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      // «Según un estudio de Harvard» sin enlace es la forma más rápida de que
      // un cliente pierda una discusión con su competencia.
      const todo = JSON.stringify(p.contenido);
      const cita =
        /\b(seg[úu]n\s+(un\s+)?(estudio|informe|investigaci[óo]n)|un\s+estudio\s+de|de\s+acuerdo\s+con\s+(un\s+)?estudio)/i.exec(
          todo,
        );
      if (!cita) return null;
      // Con enlace es comprobable; sin enlace es una apelación a la autoridad.
      const hayEnlace = /https?:\/\/[^\s"]{8,}/.test(todo);
      return hayEnlace ? null : `cita un estudio sin enlace: «${cita[0]}»`;
    },
  },
  {
    id: "sin-relleno",
    descripcion: "No usa frases que no dicen nada",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      // El relleno es lo que separa un entregable de un documento. Estas
      // fórmulas concretas aparecen cuando no hay nada que decir.
      const todo = JSON.stringify(p.contenido).toLowerCase();
      // 80 y no 200. El umbral existe para no marcar un titular o una etiqueta,
      // no para dar barra libre a los textos medianos: la pasada adversarial
      // colo relleno en 177 caracteres, que es media pagina.
      //
      // Y las formulas de abajo SON la senal: un texto de ochenta caracteres que
      // dice «en un mercado cada vez mas competitivo» es relleno, mida lo que
      // mida.
      if (todo.length < 80) return undefined;
      const formulas = [
        "en el mundo actual",
        "en la era digital",
        "hoy en día es fundamental",
        "no es ningún secreto",
        "como todos sabemos",
        "en un mercado cada vez más competitivo",
        "sinergias",
        "poner en valor",
        "llevar al siguiente nivel",
      ];
      const halladas = formulas.filter((f) => todo.includes(f));
      return halladas.length > 0
        ? `usa ${halladas.length} fórmula(s) de relleno: «${halladas[0]}»`
        : null;
    },
  },
  {
    id: "es-accionable",
    descripcion: "Dice qué hacer, no sólo qué pasa",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      // Un diagnóstico sin siguiente paso obliga al cliente a hacer el trabajo
      // que ha pagado por no hacer.
      const acciones = p.contenido.recommendedActions ?? p.contenido.acciones ?? p.contenido.siguientesPasos;
      if (acciones === undefined) return undefined;
      if (!Array.isArray(acciones)) return "las acciones recomendadas no son una lista";
      if (acciones.length === 0) return "no propone ninguna acción concreta";
      const vagas = acciones.filter((a) => typeof a === "string" && a.trim().length < 25);
      return vagas.length > 0
        ? `${vagas.length} acción(es) demasiado vagas para ejecutarlas: «${String(vagas[0])}»`
        : null;
    },
  },
  {
    id: "sin-mezcla-de-clientes",
    descripcion: "No menciona a un cliente que no es éste",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      // CONTAMINACIÓN ENTRE CLIENTES. Es el fallo que destruye la confianza de
      // golpe: ver el nombre de otra empresa en tu informe significa que tus
      // datos están en el suyo.
      // `null`, no `undefined`. NO ES LO MISMO «no he podido comprobarlo» que
      // «no aplica»: sin otros clientes con los que confundirse, no hay
      // contaminacion posible y la comprobacion PASA.
      //
      // La diferencia importa porque una bloqueante sin comprobar manda una
      // accion de alto riesgo a revision humana. Marcar como «sin comprobar» lo
      // que simplemente no aplica llenaria la bandeja de revisiones que no
      // hacen falta, y una bandeja llena de ruido se deja de mirar.
      const otros = p.contexto?.otrosClientes;
      if (!Array.isArray(otros) || otros.length === 0) return null;
      const todo = JSON.stringify(p.contenido).toLowerCase();
      const colados = otros.filter(
        (o) => typeof o === "string" && o.trim().length > 3 && todo.includes(o.toLowerCase()),
      );
      return colados.length > 0
        ? `menciona a «${colados[0]}», que es otro cliente`
        : null;
    },
  },
];

// ── Comprobaciones por dominio ──────────────────────────────────────────────

const POR_DOMINIO: Readonly<Record<string, readonly Comprobacion[]>> = {
  copy: [
    {
      id: "titular-legible",
      descripcion: "El titular cabe donde se va a mostrar",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        const t = texto(p, "titular");
        if (!t) return undefined;
        return t.length > 70 ? `el titular tiene ${t.length} caracteres y se cortará` : null;
      },
    },
    {
      id: "un-solo-cta",
      descripcion: "Una pieza, una acción",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const ctas = p.contenido.ctas;
        if (!Array.isArray(ctas)) return undefined;
        return ctas.length > 1 ? `hay ${ctas.length} llamadas a la acción; una pieza, una acción` : null;
      },
    },
    {
      id: "habla-de-lo-que-le-importa-al-lector",
      descripcion: "No habla sólo de nosotros",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // El copy que empieza por «somos líderes en» habla del que escribe. El
        // que funciona habla del problema del que lee. Se compara cuántas veces
        // aparece cada uno, no si aparecen: una marca puede nombrarse.
        const cuerpo = texto(p, "cuerpo");
        if (cuerpo.length < 120) return undefined;
        const nosotros = (cuerpo.match(/\b(somos|nuestro|nuestra|nuestros|nuestras|ofrecemos|contamos con)\b/gi) ?? []).length;
        const lector = (cuerpo.match(/\b(t[úu]|tu|tus|te|ti|usted|vosotros|su negocio)\b/gi) ?? []).length;
        return nosotros > lector * 2 && nosotros >= 3
          ? `habla de nosotros ${nosotros} veces y del lector ${lector}: al lector le importa su problema`
          : null;
      },
    },
    {
      id: "respeta-el-tono",
      descripcion: "Suena como el cliente dice que suena",
      clase: "modelo",
      gravedad: "aviso",
      evaluar: () => undefined,
    },
  ],
  seo: [
    ...SOBRE_LA_PROSA_SEO,
    {
      id: "meta-descripcion-util",
      descripcion: "La meta descripción cabe en el resultado de búsqueda",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        const d = texto(p, "metaDescripcion");
        if (!d) return undefined;
        if (d.length > 160) return `la meta descripción tiene ${d.length} caracteres y se cortará`;
        if (d.length < 50) return `la meta descripción tiene ${d.length} caracteres; se aprovecha poco`;
        return null;
      },
    },
    {
      id: "sin-repeticion-forzada",
      descripcion: "No repite la palabra clave hasta hacerse ilegible",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const cuerpo = texto(p, "cuerpo");
        const clave = texto(p, "palabraClave");
        if (!cuerpo || !clave) return undefined;
        const palabras = cuerpo.toLowerCase().split(/\s+/).filter(Boolean);
        if (palabras.length < 50) return undefined;
        const veces = palabras.filter((w) => w.includes(clave.toLowerCase())).length;
        const densidad = (veces / palabras.length) * 100;
        return densidad > 4
          ? `la palabra clave aparece en el ${densidad.toFixed(1)} % del texto: eso penaliza`
          : null;
      },
    },
    {
      id: "un-solo-h1",
      descripcion: "Una página, un encabezado principal",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        const h1 = p.contenido.h1;
        if (!Array.isArray(h1)) return undefined;
        return h1.length !== 1 ? `hay ${h1.length} encabezados principales; debe haber uno` : null;
      },
    },
    {
      id: "keywords-con-intencion",
      descripcion: "Cada palabra clave dice qué busca quien la escribe",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // Una lista de palabras clave sin intención es una lista de palabras.
        // «Zapatillas» no es lo mismo si quien busca quiere comprar, comparar o
        // saber cómo lavarlas, y el contenido que hay que escribir es distinto.
        const kws = p.contenido.keywords;
        if (!Array.isArray(kws) || kws.length === 0) return undefined;
        const conIntencion = kws.filter(
          (k) => typeof k === "object" && k !== null && "intencion" in (k as object),
        );
        return conIntencion.length === 0
          ? `las ${kws.length} palabras clave van sin intención de búsqueda: no se puede decidir qué escribir para cada una`
          : null;
      },
    },
    {
      id: "canibalizacion",
      descripcion: "Dos páginas no compiten por lo mismo",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        // Dos páginas propias peleando por la misma búsqueda se quitan fuerza
        // entre ellas. Es el error clásico de un plan de contenidos largo.
        const paginas = p.contenido.paginas;
        if (!Array.isArray(paginas)) return undefined;
        const objetivos = paginas
          .map((x) => (x as { objetivo?: string })?.objetivo?.trim().toLowerCase())
          .filter((x): x is string => Boolean(x));
        const repetidos = objetivos.filter((o, i) => objetivos.indexOf(o) !== i);
        return repetidos.length > 0
          ? `${repetidos.length} página(s) compiten por «${repetidos[0]}»: se quitan fuerza entre ellas`
          : null;
      },
    },
    {
      id: "sin-promesa-de-posicion",
      descripcion: "No promete un puesto concreto en Google",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // Nadie controla el buscador. Prometer el primer puesto es prometer lo
        // que no se puede cumplir, y además lo prohíben las buenas prácticas.
        const todo = JSON.stringify(p.contenido);
        const m = /\b(primer\w*\s+(puesto|posici[óo]n|resultado)|top\s?[1-3]\b|#1\s+en\s+google)/i.exec(todo);
        return m ? `promete una posición concreta: «${m[0]}»` : null;
      },
    },
  ],
  ads: [
    ...SOBRE_LA_PROSA_ADS,
    {
      id: "presupuesto-declarado",
      descripcion: "Toda campaña dice cuánto va a gastar",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const b = p.contenido.presupuestoDiarioCents;
        if (b === undefined) return "la campaña no declara presupuesto";
        if (typeof b !== "number" || !Number.isInteger(b) || b <= 0) {
          return `el presupuesto declarado no es válido: ${String(b)}`;
        }
        return null;
      },
    },
    {
      id: "destino-declarado",
      descripcion: "Un anuncio lleva a algún sitio",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => (texto(p, "urlDestino") ? null : "el anuncio no lleva a ninguna parte"),
    },
    {
      id: "negativas-declaradas",
      descripcion: "Hay palabras clave negativas",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const n = p.contenido.negativas;
        if (n === undefined) return undefined;
        return Array.isArray(n) && n.length === 0
          ? "sin palabras negativas se paga por búsquedas que no interesan"
          : null;
      },
    },
    {
      id: "presupuesto-da-para-el-plan",
      descripcion: "El presupuesto llega para lo que se propone",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // Repartir 300 € entre cuatro canales no es una estrategia
        // multicanal: es no estar en ninguno. Un canal necesita un mínimo de
        // volumen para que el sistema de pujas aprenda.
        const diario = p.contenido.presupuestoDiarioCents;
        const canales = p.contenido.canales;
        if (typeof diario !== "number" || !Array.isArray(canales) || canales.length === 0) {
          return undefined;
        }
        const porCanal = diario / canales.length;
        return porCanal < 1000
          ? `${canales.length} canales con ${(porCanal / 100).toFixed(2)} €/día cada uno: ninguno tendrá volumen para aprender`
          : null;
      },
    },
    {
      id: "objetivo-medible",
      descripcion: "La campaña dice con qué cifra se juzga",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const kpi = p.contenido.kpi ?? p.contenido.objetivo;
        if (kpi === undefined) return "la campaña no dice con qué número se va a juzgar";
        return typeof kpi === "string" && kpi.trim().length < 8
          ? `el objetivo «${String(kpi)}» no es medible`
          : null;
      },
    },
  ],
  social: [
    ...SOBRE_LA_PROSA_SOCIAL,
    {
      id: "adaptado-a-la-red",
      descripcion: "Cada red tiene sus límites",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        const red = texto(p, "red");
        const t = texto(p, "texto");
        if (!red || !t) return undefined;
        const limites: Record<string, number> = { x: 280, linkedin: 3000, instagram: 2200 };
        const limite = limites[red.toLowerCase()];
        if (!limite) return undefined;
        return t.length > limite
          ? `${t.length} caracteres para ${red}, que admite ${limite}`
          : null;
      },
    },
    {
      id: "no-el-mismo-post-en-todas",
      descripcion: "No se publica lo mismo en todas las redes",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // Publicar el mismo texto en LinkedIn y en TikTok no es eficiencia: es
        // no haber pensado en ninguna de las dos audiencias.
        const posts = p.contenido.publicaciones;
        if (!Array.isArray(posts) || posts.length < 2) return undefined;
        const textos = posts
          .map((x) => (x as { texto?: string })?.texto?.trim())
          .filter((x): x is string => Boolean(x));
        const unicos = new Set(textos);
        return unicos.size < textos.length
          ? `${textos.length - unicos.size} publicación(es) repiten el mismo texto en redes distintas`
          : null;
      },
    },
    {
      id: "calendario-realista",
      descripcion: "La frecuencia cabe en el tiempo que el cliente tiene",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const porSemana = p.contenido.publicacionesPorSemana;
        const horas = p.contexto?.horasSemanalesDelCliente;
        if (typeof porSemana !== "number" || typeof horas !== "number") return undefined;
        // Media hora por publicación es optimista ya.
        return porSemana * 0.5 > horas
          ? `${porSemana} publicaciones semanales para quien tiene ${horas} h: el plan no se va a cumplir`
          : null;
      },
    },
  ],
  email: [
    {
      id: "tiene-baja",
      descripcion: "Todo correo puede dejar de recibirse",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const cuerpo = texto(p, "cuerpo");
        if (!cuerpo) return undefined;
        return /\b(baja|unsubscribe|dar de baja)\b/i.test(cuerpo)
          ? null
          : "el correo no ofrece darse de baja";
      },
    },
    {
      id: "asunto-honesto",
      descripcion: "El asunto no engaña para que se abra",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const a = texto(p, "asunto");
        if (!a) return undefined;
        const trampas = [/^re:/i, /^fwd:/i, /\burgente\b/i, /\búltima oportunidad\b/i];
        for (const t of trampas) {
          if (t.test(a)) return `el asunto usa un truco para que se abra: «${a}»`;
        }
        return null;
      },
    },
    {
      id: "hay-consentimiento",
      descripcion: "A esta lista se le puede escribir",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // La pregunta que un especialista de email hace ANTES de escribir una
        // sola línea. Una lista comprada no se envía, por buena que sea la
        // campaña.
        const origen = p.contexto?.origenDeLaLista;
        if (typeof origen !== "string") return undefined;
        return /\b(comprad\w+|alquilad\w+|scraping|extra[íi]d\w+)\b/i.test(origen)
          ? `la lista es de origen «${origen}»: a esa gente no se le puede escribir`
          : null;
      },
    },
    {
      id: "segmentado",
      descripcion: "No se manda lo mismo a toda la base",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const seg = p.contenido.segmento ?? p.contenido.segmentos;
        if (seg === undefined) return undefined;
        if (typeof seg === "string" && /\b(todos|toda la base|base completa)\b/i.test(seg)) {
          return "se envía a toda la base: quien no le interesa se da de baja y se pierde para siempre";
        }
        return null;
      },
    },
  ],
  cro: [
    {
      id: "hipotesis-antes-que-cambio",
      descripcion: "Cada experimento dice qué espera y por qué",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const h = texto(p, "hipotesis");
        if (!h && p.contenido.experimento === undefined) return undefined;
        if (!h) return "el experimento no declara hipótesis: sin ella no se puede aprender nada del resultado";
        return h.length < 30 ? `la hipótesis «${h}» no dice qué se espera ni por qué` : null;
      },
    },
    {
      id: "hay-trafico-para-concluir",
      descripcion: "El experimento puede llegar a una conclusión",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // Con poco tráfico, cualquier ganador es ruido. Proponer un test A/B a
        // quien tiene 200 visitas al mes es prometerle una respuesta que no va
        // a llegar.
        const visitas = p.contexto?.visitasMensuales;
        if (typeof visitas !== "number") return undefined;
        return visitas < 1000
          ? `con ${visitas} visitas al mes un test no alcanzará significación: cualquier ganador sería ruido`
          : null;
      },
    },
    {
      id: "criterio-fijado-antes",
      descripcion: "El criterio de éxito se fija antes de empezar",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const criterio = p.contenido.criterioDeExito;
        if (criterio === undefined) return undefined;
        return typeof criterio === "string" && criterio.trim().length > 10
          ? null
          : "el criterio de éxito no está fijado: se podrá declarar ganador a posteriori";
      },
    },
  ],
  crm: [
    // Comprobaciones sobre la PROSA: las unicas que pueden dispararse hoy,
    // porque el agente devuelve texto y no una ficha estructurada.
    ...SOBRE_LA_PROSA_CRM,
    {
      id: "sin-duplicados",
      descripcion: "Un contacto, una ficha",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        const contactos = p.contenido.contactos;
        if (!Array.isArray(contactos)) return undefined;
        const correos = contactos
          .map((c) => (c as { email?: string })?.email?.trim().toLowerCase())
          .filter((x): x is string => Boolean(x));
        const repes = correos.filter((c, i) => correos.indexOf(c) !== i);
        return repes.length > 0 ? `${repes.length} contacto(s) duplicados: «${repes[0]}»` : null;
      },
    },
    {
      id: "cada-lead-tiene-dueno",
      descripcion: "Alguien es responsable de cada contacto",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const contactos = p.contenido.contactos;
        if (!Array.isArray(contactos)) return undefined;
        const sinDueno = contactos.filter((c) => !(c as { responsable?: string })?.responsable).length;
        return sinDueno > 0
          ? `${sinDueno} contacto(s) sin responsable: nadie los va a llamar`
          : null;
      },
    },
    {
      id: "cualificacion-explicada",
      descripcion: "Se dice por qué un lead es bueno",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const criterios = p.contenido.criteriosDeCualificacion;
        if (criterios === undefined) return undefined;
        return Array.isArray(criterios) && criterios.length === 0
          ? "no hay criterios de cualificación: todo lead entra igual y ventas pierde el tiempo"
          : null;
      },
    },
  ],
  web: [
    // Comprobaciones sobre la PROSA: las unicas que pueden dispararse hoy,
    // porque el agente devuelve texto y no una ficha estructurada.
    ...SOBRE_LA_PROSA_WEB,
    {
      id: "destino-declarado",
      descripcion: "Los botones llevan a algún sitio",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const botones = p.contenido.botones;
        if (!Array.isArray(botones)) return undefined;
        const muertos = botones.filter(
          (b) => !(b as { destino?: string })?.destino,
        ).length;
        return muertos > 0 ? `${muertos} botón(es) no llevan a ninguna parte` : null;
      },
    },
    {
      id: "texto-alternativo",
      descripcion: "Las imágenes se pueden leer sin verlas",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        const imgs = p.contenido.imagenes;
        if (!Array.isArray(imgs)) return undefined;
        const sinAlt = imgs.filter((i) => !(i as { alt?: string })?.alt).length;
        return sinAlt > 0 ? `${sinAlt} imagen(es) sin texto alternativo` : null;
      },
    },
    {
      id: "formulario-pide-lo-justo",
      descripcion: "El formulario no ahuyenta con preguntas de más",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // Cada campo obligatorio de más cuesta conversiones. Pedir el NIF para
        // descargar un PDF es pedir que se vayan.
        const campos = p.contenido.camposDelFormulario;
        if (!Array.isArray(campos)) return undefined;
        const obligatorios = campos.filter((c) => (c as { obligatorio?: boolean })?.obligatorio).length;
        return obligatorios > 5
          ? `${obligatorios} campos obligatorios: cada uno de más cuesta conversiones`
          : null;
      },
    },
    {
      id: "una-idea-por-pantalla",
      descripcion: "Cada pantalla pide una sola cosa",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const ctas = p.contenido.ctasPrincipales;
        if (!Array.isArray(ctas)) return undefined;
        return ctas.length > 1
          ? `${ctas.length} llamadas principales compitiendo: ninguna gana`
          : null;
      },
    },
  ],
  ecommerce: [
    // Comprobaciones sobre la PROSA: las unicas que pueden dispararse hoy,
    // porque el agente devuelve texto y no una ficha estructurada.
    ...SOBRE_LA_PROSA_ECOMMERCE,
    {
      id: "el-precio-no-aparece-tarde",
      descripcion: "El precio se ve antes de invertir tiempo",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // Descubrir el precio en el último paso es la causa clásica de
        // abandono: el cliente siente que le han hecho perder el rato.
        const paso = p.contenido.pasoDondeApareceElPrecio;
        const total = p.contenido.pasosDelProceso;
        if (typeof paso !== "number" || typeof total !== "number" || total === 0) return undefined;
        return paso / total > 0.6
          ? `el precio aparece en el paso ${paso} de ${total}: demasiado tarde`
          : null;
      },
    },
    {
      id: "gastos-de-envio-sin-sorpresas",
      descripcion: "Los gastos de envío se dicen antes del pago",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const cuando = p.contenido.cuandoSeMuestranGastosDeEnvio;
        if (typeof cuando !== "string") return undefined;
        return /\b(pago|checkout|ultimo|último)\b/i.test(cuando)
          ? `los gastos de envío se enseñan en «${cuando}»: es la primera causa de abandono`
          : null;
      },
    },
    {
      id: "el-pedido-deja-margen",
      descripcion: "Lo que cuesta traer un pedido cabe en su margen",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // La cuenta que decide si una tienda gana o pierde. Vender más no es
        // ganar más si cada pedido cuesta más de lo que deja.
        const margen = p.contexto?.margenPorPedidoCents;
        const coste = p.contenido.costePorPedidoObjetivoCents;
        if (typeof margen !== "number" || typeof coste !== "number") return undefined;
        return coste >= margen
          ? `traer un pedido costaría ${(coste / 100).toFixed(2)} € y deja ${(margen / 100).toFixed(2)} €: cada venta pierde dinero`
          : null;
      },
    },
    {
      id: "ficha-con-lo-necesario",
      descripcion: "La ficha responde lo que decide la compra",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const ficha = p.contenido.ficha;
        if (typeof ficha !== "object" || ficha === null) return undefined;
        const f = ficha as Record<string, unknown>;
        const faltan = ["precio", "envio", "devoluciones"].filter((k) => !f[k]);
        return faltan.length > 0
          ? `la ficha no dice: ${faltan.join(", ")} — son las tres cosas que se miran antes de comprar`
          : null;
      },
    },
  ],
  reputacion: [
    {
      id: "no-discute-en-publico",
      descripcion: "No se discute con un cliente insatisfecho",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const r = texto(p, "respuesta");
        if (!r) return undefined;
        const beligerante = /\b(mentira|falso|se equivoca|no es cierto|nunca ha sido)\b/i.exec(r);
        return beligerante ? `la respuesta discute en público: «${beligerante[0]}»` : null;
      },
    },
    {
      id: "no-la-misma-respuesta-a-todos",
      descripcion: "No se contesta con plantilla a todas las reseñas",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // Ver la misma respuesta copiada bajo veinte reseñas es peor que no
        // contestar: dice que no se ha leído ninguna.
        const respuestas = p.contenido.respuestas;
        if (!Array.isArray(respuestas) || respuestas.length < 2) return undefined;
        const textos = respuestas
          .map((x) => (typeof x === "string" ? x : (x as { texto?: string })?.texto))
          .filter((x): x is string => Boolean(x));
        const unicos = new Set(textos.map((t) => t.trim().toLowerCase()));
        return unicos.size < textos.length
          ? `${textos.length - unicos.size} respuesta(s) repetidas: se nota que no se ha leído la reseña`
          : null;
      },
    },
    {
      id: "no-pide-borrar-la-resena",
      descripcion: "No se le pide a nadie que quite lo que escribió",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const r = texto(p, "respuesta");
        if (!r) return undefined;
        return /\b(elimin\w+|borr\w+|quit\w+)\s+(la\s+)?(rese[ñn]a|comentario|valoraci[óo]n)/i.test(r)
          ? "pide que se borre la reseña: eso incumple las normas de las plataformas y se ve fatal"
          : null;
      },
    },
  ],
  contenido: [
    ...SOBRE_LA_PROSA_CONTENIDO,
    {
      id: "cabe-en-el-tiempo-del-cliente",
      descripcion: "El calendario se puede cumplir",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // Un plan de cinco piezas semanales para quien tiene media hora no
        // fracasa por el cliente: fracasa al diseñarlo.
        const piezas = p.contenido.piezasPorSemana;
        const horas = p.contexto?.horasSemanalesDelCliente;
        if (typeof piezas !== "number" || typeof horas !== "number") return undefined;
        return piezas * 1.5 > horas
          ? `${piezas} piezas semanales para quien tiene ${horas} h: el plan no se va a cumplir`
          : null;
      },
    },
    {
      id: "no-todo-el-contenido-vende",
      descripcion: "No todas las piezas son para vender",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // Un calendario donde todo empuja a comprar cansa a la audiencia y deja
        // de leerse. La proporción exacta se discute; que sea el 100 %, no.
        const piezas = p.contenido.piezas;
        if (!Array.isArray(piezas) || piezas.length < 4) return undefined;
        const comerciales = piezas.filter(
          (x) => (x as { intencion?: string })?.intencion === "venta",
        ).length;
        return comerciales === piezas.length
          ? "todas las piezas empujan a comprar: la audiencia deja de leer"
          : null;
      },
    },
    {
      id: "responde-a-alguien-concreto",
      descripcion: "El contenido sabe a quién le habla",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const audiencia = p.contenido.audiencia ?? p.contenido.paraQuien;
        if (audiencia === undefined) return "el contenido no dice a quién le habla";
        return typeof audiencia === "string" && audiencia.trim().length < 12
          ? `«${String(audiencia)}» no es una audiencia: es una etiqueta`
          : null;
      },
    },
    {
      id: "aporta-algo-que-no-esta-en-todas-partes",
      descripcion: "Dice algo que el cliente sabe y otros no",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const angulo = texto(p, "anguloPropio");
        if (!angulo && p.contenido.tema === undefined) return undefined;
        return angulo ? null : "no declara qué aporta este contenido que no esté ya en cualquier otro sitio";
      },
    },
  ],
  creatividad: [
    {
      id: "una-pieza-por-canal",
      descripcion: "La pieza está hecha para el sitio donde se va a ver",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        // Un diseño de escaparate y uno de móvil no se parecen. Entregar el
        // mismo archivo para los dos es entregar uno que no sirve para ninguno.
        const formatos = p.contenido.formatos;
        const canales = p.contenido.canales;
        if (!Array.isArray(formatos) || !Array.isArray(canales)) return undefined;
        return formatos.length < canales.length
          ? `${canales.length} canales y sólo ${formatos.length} formato(s): alguno va a quedar mal`
          : null;
      },
    },
    {
      id: "hay-fuente-de-los-materiales",
      descripcion: "Se sabe de dónde salen las imágenes y las tipografías",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // Una imagen sin licencia en una campaña del cliente es una reclamación
        // con su nombre, no con el nuestro.
        const activos = p.contenido.activos;
        if (!Array.isArray(activos)) return undefined;
        const sinLicencia = activos.filter(
          (a) => !(a as { licencia?: string })?.licencia,
        ).length;
        return sinLicencia > 0
          ? `${sinLicencia} material(es) sin licencia declarada: eso es una reclamación esperando`
          : null;
      },
    },
    {
      id: "se-puede-leer-lo-que-pone",
      descripcion: "El texto sobre la imagen se lee",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const contraste = p.contenido.contrasteTextoFondo;
        if (typeof contraste !== "number") return undefined;
        // 4,5 es el mínimo con el que un texto normal se lee sin esfuerzo.
        return contraste < 4.5
          ? `contraste ${contraste}: por debajo de 4,5 el texto cuesta de leer`
          : null;
      },
    },
    {
      id: "respeta-lo-que-la-marca-no-hace",
      descripcion: "No propone lo que la marca tiene prohibido",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const prohibido = p.contexto?.loQueLaMarcaNoHace;
        if (!Array.isArray(prohibido) || prohibido.length === 0) return undefined;
        const todo = JSON.stringify(p.contenido).toLowerCase();
        const roto = prohibido.filter(
          (x) => typeof x === "string" && x.length > 4 && todo.includes(x.toLowerCase()),
        );
        return roto.length > 0 ? `propone «${roto[0]}», que la marca no hace` : null;
      },
    },
    {
      id: "sabe-donde-se-va-a-ver",
      descripcion: "La pieza se diseña para donde se va a usar",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const donde = p.contenido.formato ?? p.contenido.donde;
        return donde === undefined
          ? "no dice dónde se va a ver: un diseño para escaparate y uno para móvil no se parecen"
          : null;
      },
    },
  ],
  analitica: [
    {
      id: "compara-con-algo",
      descripcion: "Un número solo no dice nada",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        // «1.200 visitas» no es un dato: es una cifra. Un dato es «1.200
        // visitas, un 30 % menos que el mes pasado».
        const metricas = p.contenido.metricas;
        if (!Array.isArray(metricas) || metricas.length === 0) return undefined;
        const sinComparar = metricas.filter(
          (m) => typeof m === "object" && m !== null && !("comparativa" in (m as object)) && !("variacion" in (m as object)),
        ).length;
        return sinComparar > 0
          ? `${sinComparar} métrica(s) sin comparación: un número suelto no dice si va bien o mal`
          : null;
      },
    },
    {
      id: "no-confunde-correlacion-con-causa",
      descripcion: "No atribuye un resultado a una acción sin más",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const todo = JSON.stringify(p.contenido);
        const m = /\bgracias a\b[^.]{0,60}\b(sub\w+|aument\w+|mejor\w+)/i.exec(todo);
        if (!m) return null;
        const hayControl = /\b(grupo de control|holdout|l[íi]nea base|antes de)\b/i.test(todo);
        return hayControl ? null : `atribuye un resultado sin línea base: «${m[0].trim()}»`;
      },
    },
    {
      id: "el-cero-no-se-presenta-como-caida",
      descripcion: "Un cero repentino se trata como medición rota, no como desplome",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const metricas = p.contenido.metricas;
        if (!Array.isArray(metricas) || metricas.length === 0) return undefined;
        // Cuando una etiqueta deja de dispararse, el panel muestra cero. Leerlo
        // como una caída del negocio es cómo se apagan campañas que estaban
        // funcionando. Un cero exige decir que se ha comprobado la medición
        // antes de interpretarlo.
        const cerosSinRevisar = metricas.filter((m) => {
          const o = m as { valor?: unknown; medicionComprobada?: unknown };
          return o?.valor === 0 && o?.medicionComprobada !== true;
        });
        return cerosSinRevisar.length > 0
          ? `${cerosSinRevisar.length} métrica(s) a cero sin comprobar la medición: un cero es antes una etiqueta caída que un desplome`
          : null;
      },
    },
    {
      id: "el-porcentaje-lleva-denominador",
      descripcion: "Ningún porcentaje se presenta sin decir sobre cuántos",
      clase: "determinista",
      gravedad: "aviso",
      evaluar: (p) => {
        const metricas = p.contenido.metricas;
        if (!Array.isArray(metricas) || metricas.length === 0) return undefined;
        // «Conversión del 12 %» sobre diecisiete visitas y sobre diecisiete mil
        // se escriben igual y no significan lo mismo ni de lejos.
        const sinBase = metricas.filter((m) => {
          const o = m as { nombre?: unknown; unidad?: unknown; muestra?: unknown };
          const esPct = o?.unidad === "%" || /(%|tasa|ratio|porcentaje)/i.test(String(o?.nombre ?? ""));
          return esPct && typeof o?.muestra !== "number";
        });
        return sinBase.length > 0
          ? `${sinBase.length} porcentaje(s) sin muestra: un 12 % sobre diecisiete visitas no es un 12 %`
          : null;
      },
    },
  ],
  reporting: [
    {
      id: "no-omite-lo-que-va-mal",
      descripcion: "Un informe no esconde los objetivos incumplidos",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const objetivos = p.contenido.objetivos;
        const incluidos = p.contenido.objetivosIncluidos;
        if (!Array.isArray(objetivos) || !Array.isArray(incluidos)) return undefined;
        return incluidos.length < objetivos.length
          ? `el informe omite ${objetivos.length - incluidos.length} objetivo(s)`
          : null;
      },
    },
    {
      id: "empieza-por-lo-que-el-cliente-queria",
      descripcion: "El informe empieza por el objetivo, no por lo que hicimos",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const primera = p.contenido.primeraSeccion;
        if (typeof primera !== "string") return undefined;
        return /\b(objetivo|resultado|conseguid\w+)\b/i.test(primera)
          ? null
          : `el informe empieza por «${primera}»: al cliente le importa qué consiguió, no qué hicimos`;
      },
    },
    {
      id: "lo-no-medido-se-dice",
      descripcion: "Lo que no se pudo medir aparece como no medido",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const noMedido = p.contenido.noMedido;
        if (noMedido === undefined) return undefined;
        return Array.isArray(noMedido) ? null : "lo no medido no está declarado como tal";
      },
    },
  ],
  estrategia: [
    {
      id: "el-plan-cabe-en-el-presupuesto",
      descripcion: "Lo que se propone se puede pagar",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const disponible = p.contexto?.presupuestoMensualCents;
        const propuesto = p.contenido.costeMensualPropuestoCents;
        if (typeof disponible !== "number" || typeof propuesto !== "number") return undefined;
        return propuesto > disponible
          ? `el plan cuesta ${(propuesto / 100).toFixed(0)} €/mes y hay ${(disponible / 100).toFixed(0)} €`
          : null;
      },
    },
    {
      id: "no-repite-lo-que-ya-fallo",
      descripcion: "No propone otra vez lo que al cliente ya le salió mal",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // Proponerle a alguien exactamente lo que ya probó y le costó dinero es
        // la forma más rápida de que deje de leer.
        const fallo = p.contexto?.loQueYaFallo;
        if (typeof fallo !== "string" || fallo.length < 8) return undefined;
        const todo = JSON.stringify(p.contenido).toLowerCase();
        // POR RAÍZ, no por palabra exacta. «campañas de display» y «campaña de
        // display» son lo mismo para un cliente que ya se gastó un año en ello,
        // y comparar palabras completas dejaba pasar el caso por una `s`.
        const raiz = (w: string): string => w.slice(0, 6);
        const nucleo = fallo
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/u)
          .filter((w) => w.length > 5)
          .map(raiz)
          .slice(0, 4);
        const repetido = nucleo.filter((r) => todo.includes(r));
        return repetido.length >= 2
          ? `vuelve a proponer algo muy parecido a lo que ya falló: «${fallo}»`
          : null;
      },
    },
    {
      id: "prioriza",
      descripcion: "Dice qué va primero",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const acciones = p.contenido.acciones;
        if (!Array.isArray(acciones) || acciones.length < 3) return undefined;
        const conOrden = acciones.filter(
          (a) => typeof a === "object" && a !== null && ("prioridad" in (a as object) || "orden" in (a as object)),
        ).length;
        return conOrden === 0
          ? `${acciones.length} acciones sin prioridad: el cliente no sabe por dónde empezar`
          : null;
      },
    },
  ],
  // ── Investigación de mercado ────────────────────────────────────────────
  //
  // Un informe de mercado se equivoca de una forma muy concreta: suena
  // autorizado. Párrafos bien escritos, cifras redondas, competidores
  // nombrados — y nada de eso comprobable. Estas comprobaciones existen para
  // que un hallazgo sin fuente no llegue nunca a una reunión de dirección
  // disfrazado de dato.
  investigacion: [
    {
      id: "cada-hallazgo-lleva-fuente",
      descripcion: "Ningún hallazgo se afirma sin decir de dónde sale",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const hallazgos = p.contenido.hallazgos;
        if (!Array.isArray(hallazgos) || hallazgos.length === 0) return undefined;
        const sinFuente = hallazgos.filter((h) => {
          const f = (h as { fuente?: unknown })?.fuente;
          return typeof f !== "string" || f.trim().length === 0;
        });
        return sinFuente.length > 0
          ? `${sinFuente.length} de ${hallazgos.length} hallazgo(s) sin fuente: eso es una opinión, no una investigación`
          : null;
      },
    },
    {
      id: "distingue-medido-de-estimado",
      descripcion: "Una cifra estimada se presenta como estimada",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const hallazgos = p.contenido.hallazgos;
        if (!Array.isArray(hallazgos) || hallazgos.length === 0) return undefined;
        // Una cifra sin origen declarado se lee como medida. Es el error que
        // convierte una suposición razonable en un número que alguien repite
        // en una junta como si lo hubiera contado.
        const malas = hallazgos.filter((h) => {
          const o = h as { cifra?: unknown; origen?: unknown };
          if (o?.cifra === undefined || o?.cifra === null) return false;
          return o.origen !== "medido" && o.origen !== "estimado" && o.origen !== "declarado_por_terceros";
        });
        return malas.length > 0
          ? `${malas.length} cifra(s) sin decir si están medidas, estimadas o declaradas por un tercero`
          : null;
      },
    },
    {
      id: "el-competidor-se-puede-identificar",
      descripcion: "Cada competidor citado se puede localizar",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const comp = p.contenido.competidores;
        if (!Array.isArray(comp) || comp.length === 0) return undefined;
        const vagos = comp.filter((c) => {
          const o = c as { nombre?: unknown; dominio?: unknown };
          const n = typeof o?.nombre === "string" ? o.nombre.trim() : "";
          const d = typeof o?.dominio === "string" ? o.dominio.trim() : "";
          if (!n && !d) return true;
          return /^(competidor|empresa|marca)\s*[a-z0-9]?$/i.test(n) && !d;
        });
        return vagos.length > 0
          ? `${vagos.length} competidor(es) sin nombre ni dominio: no se pueden comprobar`
          : null;
      },
    },
    {
      id: "responde-a-la-decision-que-se-iba-a-tomar",
      descripcion: "El informe contesta a la pregunta por la que se encargó",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const decision = texto(p, "decision");
        const reco = p.contenido.recomendaciones;
        if (!decision) return undefined;
        if (!Array.isArray(reco) || reco.length === 0) {
          return "se encargó para decidir algo y no termina en ninguna recomendación";
        }
        return null;
      },
    },
    {
      id: "no-generaliza-desde-cuatro-casos",
      descripcion: "No se saca una conclusión de mercado de una muestra minúscula",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const m = p.contenido.muestra;
        if (typeof m !== "number") return undefined;
        return m < 5
          ? `la conclusión se apoya en ${m} caso(s): eso describe esos casos, no el mercado`
          : null;
      },
    },
  ],

  // ── Visibilidad en buscadores con IA ────────────────────────────────────
  //
  // La disciplina más fácil de vender con humo, porque casi nadie sabe todavía
  // cómo se mide. Por eso la comprobación más dura de aquí no es de calidad
  // del contenido: es la que impide prometer una posición que nadie controla.
  geo: [
    {
      id: "no-promete-aparecer-en-la-ia",
      descripcion: "No se garantiza salir citado en un asistente",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const t = [texto(p, "texto"), texto(p, "propuesta"), texto(p, "resumen")]
          .filter(Boolean)
          .join("\n");
        if (!t) return undefined;
        // Ningún proveedor controla lo que cita un modelo. Prometerlo es
        // vender un resultado que no depende de quien lo vende.
        const promesa =
          /(garantiz\w+|asegur\w+)[^.]{0,60}(chatgpt|gemini|perplexity|copilot|claude|asistente|respuestas? de (la )?ia)/i.exec(t) ??
          /(saldr[áa]s|aparecer[áa]s)\s+(siempre|seguro)[^.]{0,40}(ia|chatgpt|asistente)/i.exec(t);
        return promesa
          ? `promete una cita que nadie puede garantizar: «${promesa[0].slice(0, 80)}»`
          : null;
      },
    },
    {
      id: "las-preguntas-son-preguntas",
      descripcion: "Se trabaja sobre preguntas completas, no sobre palabras clave",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const qs = p.contenido.preguntas;
        if (!Array.isArray(qs) || qs.length === 0) return undefined;
        const textos = qs
          .map((q) => (typeof q === "string" ? q : (q as { texto?: string })?.texto))
          .filter((x): x is string => Boolean(x));
        if (textos.length === 0) return undefined;
        // A un asistente se le habla; a un buscador se le teclea. Una lista de
        // dos palabras es investigación de keywords con otro nombre.
        const sueltas = textos.filter((t) => t.trim().split(/\s+/).length < 4);
        return sueltas.length > textos.length / 2
          ? `${sueltas.length} de ${textos.length} son palabras clave, no preguntas: eso ya lo cubre el SEO`
          : null;
      },
    },
    {
      id: "responde-antes-de-enrollarse",
      descripcion: "La respuesta aparece al principio, no al final",
      clase: "rubrica",
      gravedad: "aviso",
      evaluar: (p) => {
        const t = texto(p, "texto");
        const pregunta = texto(p, "pregunta");
        if (!t || !pregunta) return undefined;
        const primeras = t.split(/\n+/).slice(0, 3).join(" ");
        if (primeras.trim().length === 0) return undefined;
        const palabras = pregunta
          .toLowerCase()
          .replace(/[¿?¡!.,;:]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 4);
        if (palabras.length === 0) return undefined;
        const cubiertas = palabras.filter((w) => primeras.toLowerCase().includes(w));
        return cubiertas.length === 0
          ? "las primeras líneas no tocan la pregunta: un asistente extrae de arriba"
          : null;
      },
    },
    {
      id: "aporta-algo-que-no-esta-en-otros-cien-sitios",
      descripcion: "Hay al menos un dato propio que justifique la cita",
      clase: "rubrica",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const t = texto(p, "texto");
        if (!t) return undefined;
        const propios = p.contenido.datosPropios;
        if (Array.isArray(propios) && propios.length > 0) return null;
        // Sin un dato propio no hay motivo para citar a este cliente en vez de
        // a cualquiera de los otros que dicen lo mismo.
        return "no hay ningún dato propio: sin eso no hay razón para citar a este cliente y no a otro";
      },
    },
    {
      id: "el-esquema-declara-lo-que-el-texto-dice",
      descripcion: "Los datos estructurados no contradicen al contenido",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        const esquema = p.contenido.esquema as { tipo?: unknown; nombre?: unknown } | undefined;
        const t = texto(p, "texto");
        if (!esquema || typeof esquema.nombre !== "string" || !t) return undefined;
        // Marcar como FAQ algo que no contesta nada, o declarar un nombre que
        // no aparece, es exactamente lo que se penaliza como marcado engañoso.
        return t.toLowerCase().includes(esquema.nombre.toLowerCase())
          ? null
          : `el esquema declara «${esquema.nombre}» y el texto no lo menciona`;
      },
    },
  ],

  compliance: [
    {
      id: "respeta-el-sector-regulado",
      descripcion: "No propone lo que el sector del cliente prohíbe",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // La comprobación que evita una sanción con el nombre de NELVYON.
        // `null`: sin restricciones declaradas no hay ninguna que incumplir.
        // Que un cliente no tenga limites legales no es una laguna de medicion.
        const restricciones = p.contexto?.restricciones;
        if (!Array.isArray(restricciones) || restricciones.length === 0) return null;
        const todo = JSON.stringify(p.contenido).toLowerCase();

        // Prohibiciones frecuentes en sectores regulados, con lo que las
        // delata en un texto.
        const senales: Array<[RegExp, RegExp]> = [
          [/no\s+.*(prometer|garantizar).*(resultado|curaci)/i, /\b(garantiz\w+|prometemos|asegura\w+ resultados)\b/i],
          [/no\s+.*(antes y despu[ée]s|before.after)/i, /\bantes y despu[ée]s\b/i],
          [/no\s+.*(comparaci|comparar)/i, /\b(mejor que|superior a)\s+\w+/i],
          [/no\s+.*(propiedades curativas|curar)/i, /\b(cura|curativ\w+|adelgaza|elimina la grasa)\b/i],
        ];

        for (const r of restricciones) {
          if (typeof r !== "string") continue;
          for (const [queProhibe, comoSeDelata] of senales) {
            if (queProhibe.test(r) && comoSeDelata.test(todo)) {
              const m = comoSeDelata.exec(todo);
              return `el cliente tiene prohibido esto y la pieza lo hace: «${m?.[0]}» (restricción: ${r})`;
            }
          }
        }
        return null;
      },
    },
    {
      id: "hay-base-legal-para-contactar",
      descripcion: "Se puede escribir a esta gente",
      clase: "determinista",
      gravedad: "bloqueante",
      evaluar: (p) => {
        // `null`: una pieza que no contacta con nadie no necesita base legal.
        const contacta = p.contenido.contactaPersonas;
        if (contacta !== true) return null;
        const base = p.contexto?.baseLegal;
        return typeof base === "string" && base.trim().length > 3
          ? null
          : "la pieza contacta con personas y no declara base legal";
      },
    },
  ],
};

export function dominiosConQa(): string[] {
  return Object.keys(POR_DOMINIO).sort();
}

export function comprobacionesDe(dominio: string): readonly Comprobacion[] {
  return [...COMUNES, ...(POR_DOMINIO[dominio] ?? [])];
}

/**
 * ¿Con qué se puede evaluar ahora mismo?
 *
 * No se infiere de nada: se pregunta al adaptador. Si no hay modelo real, las
 * comprobaciones de clase `modelo` quedan SIN HACER, y eso se dice.
 */
export function modoDisponible(): ModoDeEvaluacion {
  if (process.env.NELVYON_QA_MODO === "mock") return "MOCK";

  // LAS DOS CONDICIONES, y hacen falta las dos.
  //
  // `resolveLlmMode()` devuelve `real` con solo poner AUTONOMOUS_LLM_MODE=real,
  // haya proveedor o no. Para generar texto eso vale — si falla, cae al
  // generador offline y queda registrado. Para EVALUAR no vale: sellaria
  // `REAL` sobre una revision que nadie ha hecho, que es exactamente el fallo
  // que produjo 14.178 eventos de produccion diciendo `ok: true` sobre trabajo
  // que ninguna IA hizo. En la capa de calidad ese fallo es peor, porque lo que
  // se falsifica es la aprobacion.
  if (resolveLlmMode() !== "real") return "UNAVAILABLE";
  if (proveedoresDisponibles().length === 0) return "UNAVAILABLE";
  return "REAL";
}

export class MotorDeCalidad {
  /**
   * Evalúa una pieza.
   *
   * Lanza si el evaluador es el mismo que la produjo: un agente que se juzga a
   * sí mismo aprueba lo que sabe hacer y no detecta lo que no sabe.
   */
  evaluar(pieza: Pieza, evaluador: string): Resultado {
    if (evaluador === pieza.autor) {
      throw new ErrorDeCalidad(
        "AUTOEVALUACION",
        `"${evaluador}" no puede evaluar lo que ha producido él mismo`,
      );
    }

    const disponible = modoDisponible();
    const comprobaciones = comprobacionesDe(pieza.dominio);
    /**
     * Las de SU disciplina, aparte de las comunes.
     *
     * Hace falta contarlas por separado por lo que se vio al pasar prosa de un
     * modelo real por aqui: un informe de mercado salio **PASS con 100 puntos**
     * y sus CINCO comprobaciones de dominio en «no se pudo comprobar». Lo unico
     * que se le habia mirado era la higiene comun —que no estuviera vacio, que
     * no prometiera imposibles—, que es lo mismo que se le mira a una foto.
     *
     * Cien puntos ahi no significa «bien»: significa «no revisado como lo que
     * es». Y es el peor sitio para el optimismo, porque el numero se enseña.
     */
    const deSuDisciplina = new Set((POR_DOMINIO[pieza.dominio] ?? []).map((c) => c.id));
    let usadasDeSuDisciplina = 0;
    const hallazgos: Hallazgo[] = [];
    const noComprobado: Array<{ id: string; porQue: string }> = [];
    /** Las bloqueantes que no se pudieron ejecutar. Deciden en alto riesgo. */
    const bloqueantesNoEvaluadas: string[] = [];
    let usadas = 0;

    for (const c of comprobaciones) {
      if (c.clase === "modelo" && disponible !== "REAL") {
        // NO se degrada a reglas fingiendo que es lo mismo. Se dice que no se
        // ha comprobado, que es la verdad.
        noComprobado.push({
          id: c.id,
          porQue:
            disponible === "MOCK"
              ? "modo simulado: una evaluación simulada no es una evaluación"
              : "hace falta un modelo real y no hay ninguno disponible",
        });
        continue;
      }

      const r = c.evaluar(pieza);
      if (r === undefined) {
        noComprobado.push({ id: c.id, porQue: "la pieza no trae lo que hace falta para comprobarlo" });
        // Se anota APARTE si era bloqueante: no es lo mismo no poder mirar un
        // aviso que no poder mirar algo que decide si se pierde dinero.
        if (c.gravedad === "bloqueante") bloqueantesNoEvaluadas.push(c.id);
        continue;
      }
      usadas += 1;
      if (deSuDisciplina.has(c.id)) usadasDeSuDisciplina += 1;
      if (r !== null) {
        hallazgos.push({
          id: c.id,
          quePasa: r,
          gravedad: c.gravedad,
          modo: c.clase === "modelo" ? "REAL" : "RULE_BASED",
        });
      }
    }

    // El modo del CONJUNTO es el más débil de los usados. Si algo no se pudo
    // comprobar, el veredicto entero lo refleja: no se puede decir que una
    // pieza está revisada cuando una parte no lo está.
    const modo: ModoDeEvaluacion =
      disponible === "MOCK"
        ? "MOCK"
        : noComprobado.some((n) => n.porQue.includes("modelo real"))
          ? "UNAVAILABLE"
          : disponible === "REAL"
            ? "REAL"
            : "RULE_BASED";

    return {
      veredicto: this.decidir(hallazgos, modo, pieza, bloqueantesNoEvaluadas, {
        tiene: deSuDisciplina.size,
        ejecutadas: usadasDeSuDisciplina,
      }),
      modo,
      hallazgos,
      puntuacion: usadas === 0 ? null : Math.round(((usadas - hallazgos.length) / usadas) * 100),
      noComprobado,
    };
  }

  /**
   * El veredicto.
   *
   * Lo importante está en la última rama: una acción de ALTO RIESGO con algo
   * sin comprobar NO pasa. Falla cerrada. Aprobar «casi revisado» antes de
   * gastar dinero o publicar en nombre del cliente es exactamente donde no se
   * puede ser optimista.
   */
  private decidir(
    hallazgos: Hallazgo[],
    modo: ModoDeEvaluacion,
    pieza: Pieza,
    bloqueantesNoEvaluadas: readonly string[] = [],
    disciplina: { tiene: number; ejecutadas: number } = { tiene: 0, ejecutadas: 0 },
  ): Veredicto {
    if (hallazgos.some((h) => h.gravedad === "bloqueante")) return "FAIL";

    // NO SE APRUEBA COMO SEO ALGO A LO QUE NO SE LE HA MIRADO NADA DE SEO.
    //
    // Si la disciplina tiene comprobaciones y NINGUNA ha podido ejecutarse, lo
    // unico que se ha revisado es la higiene comun. Eso no es una revision de
    // la pieza: es una revision de cualquier pieza. Va a una persona.
    //
    // El caso limite importa: si la disciplina no tiene comprobaciones propias
    // —todavia—, esto no aplica y el veredicto sigue su curso. Confundir «no
    // hay nada que mirar» con «no se pudo mirar» mandaria a revision humana
    // todo lo de las disciplinas sin rubrica, que es ruido, no seguridad.
    if (disciplina.tiene > 0 && disciplina.ejecutadas === 0) return "REVIEW_REQUIRED";

    if (modo === "MOCK") {
      // Un veredicto simulado no aprueba nada. Va a revisión humana.
      return "REVIEW_REQUIRED";
    }

    const avisos = hallazgos.filter((h) => h.gravedad === "aviso").length;

    if (pieza.riesgo === "alto") {
      if (modo === "UNAVAILABLE") return "REVIEW_REQUIRED";
      if (avisos > 0) return "REVIEW_REQUIRED";

      // EL AGUJERO QUE ENCONTRO LA PASADA ADVERSARIAL.
      //
      // Una comprobacion BLOQUEANTE que no se pudo hacer —porque la pieza no
      // trae el dato que necesita— salia como PASS en una accion de alto
      // riesgo. Es decir: la forma de aprobar un plan que no cabe en el
      // presupuesto era NO DECIR cuanto cuesta.
      //
      // Aqui no se puede ser optimista. Una comprobacion que decide si algo
      // pierde dinero, incumple una norma o publica algo que no se puede
      // retirar, y que no ha podido ejecutarse, es exactamente el caso en el
      // que hace falta una persona.
      const bloqueantesSinComprobar = bloqueantesNoEvaluadas.length;
      if (bloqueantesSinComprobar > 0) return "REVIEW_REQUIRED";

      return "PASS";
    }

    if (avisos > 0) return "PASS_WITH_WARNINGS";
    return "PASS";
  }
}
