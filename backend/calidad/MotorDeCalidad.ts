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
      id: "respeta-el-tono",
      descripcion: "Suena como el cliente dice que suena",
      clase: "modelo",
      gravedad: "aviso",
      evaluar: () => undefined,
    },
  ],
  seo: [
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
  ],
  ads: [
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
  ],
  social: [
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
  ],
  web: [
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
  ],
  contenido: [],
  creatividad: [],
  crm: [],
  cro: [],
  analitica: [],
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
  ],
  estrategia: [],
  compliance: [],
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
    const hallazgos: Hallazgo[] = [];
    const noComprobado: Array<{ id: string; porQue: string }> = [];
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
        continue;
      }
      usadas += 1;
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
      veredicto: this.decidir(hallazgos, modo, pieza),
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
  private decidir(hallazgos: Hallazgo[], modo: ModoDeEvaluacion, pieza: Pieza): Veredicto {
    if (hallazgos.some((h) => h.gravedad === "bloqueante")) return "FAIL";

    if (modo === "MOCK") {
      // Un veredicto simulado no aprueba nada. Va a revisión humana.
      return "REVIEW_REQUIRED";
    }

    const avisos = hallazgos.filter((h) => h.gravedad === "aviso").length;

    if (pieza.riesgo === "alto") {
      if (modo === "UNAVAILABLE") return "REVIEW_REQUIRED";
      if (avisos > 0) return "REVIEW_REQUIRED";
      return "PASS";
    }

    if (avisos > 0) return "PASS_WITH_WARNINGS";
    return "PASS";
  }
}
