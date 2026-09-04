/**
 * Comprobaciones que funcionan sobre lo que el agente DEVUELVE de verdad.
 *
 * ── POR QUÉ EXISTE ESTE FICHERO ─────────────────────────────────────────────
 *
 * De las 55 comprobaciones del motor que leen alguna clave, ocho no podían
 * dispararse nunca: esperaban una ficha estructurada —`paginas`,
 * `ctasPrincipales`, `camposDelFormulario`, `contrasteTextoFondo`— y el agente
 * devuelve prosa.
 *
 * Añadir más comprobaciones de esa clase habría subido un contador sin proteger
 * de nada. Las de aquí leen el TEXTO, que es lo único que hay garantizado.
 *
 * ── QUÉ SE PUEDE AFIRMAR MIRANDO SÓLO EL TEXTO ──────────────────────────────
 *
 * Menos de lo que parece, y por eso todas son AVISOS y no bloqueantes.
 *
 * Un detector de palabras puede estar seguro de lo que NO aparece —si en todo un
 * plan de web no sale ni una vez el sector del cliente ni su diferencial, no se
 * ha escrito para él— pero no puede estar seguro de lo contrario: un sinónimo,
 * una perífrasis o una manera distinta de decirlo lo despistan.
 *
 * Bloquear con esa certeza sería acusar de más. Avisar es lo honesto: sale a la
 * superficie, alguien lo mira, y si el detector se equivocó no ha costado una
 * entrega.
 *
 * ── Y NINGUNA APLICA SIN CONTEXTO ───────────────────────────────────────────
 *
 * Si no consta el sector del cliente, no se puede juzgar si la pieza habla de
 * él. Eso es «no aplica», no «pasa» ni «falla».
 */
import type { Comprobacion, Pieza } from "./MotorDeCalidad";

/** Todo el texto de la pieza, incluido el anidado. */
function textoDe(pieza: Pieza): string {
  const trozos: string[] = [];
  const recorrer = (v: unknown, prof = 0): void => {
    if (prof > 6) return;
    if (typeof v === "string") trozos.push(v);
    else if (Array.isArray(v)) for (const x of v) recorrer(x, prof + 1);
    else if (v && typeof v === "object") for (const x of Object.values(v)) recorrer(x, prof + 1);
  };
  recorrer(pieza.contenido);
  return trozos.join(" ").toLowerCase();
}

/** Las palabras con peso de una frase: las cortas no distinguen nada. */
function palabrasConPeso(frase: string): string[] {
  return frase
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 4);
}

function textoDelContexto(pieza: Pieza, claves: string[]): string | null {
  for (const c of claves) {
    const v = pieza.contexto?.[c];
    if (typeof v === "string" && v.trim().length > 2) return v;
  }
  return null;
}

/** Longitud mínima para que la ausencia de una palabra signifique algo. */
const MINIMO_PARA_OPINAR = 200;

// ── WEB ─────────────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_WEB: readonly Comprobacion[] = [
  {
    id: "la-web-habla-del-negocio-del-cliente",
    descripcion: "El plan menciona a qué se dedica este cliente",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      // Si ni el sector ni lo que le hace distinto aparecen NI UNA VEZ en todo
      // el plan, no se ha escrito para él. Es lo único que se puede afirmar con
      // seguridad mirando palabras: la ausencia.
      const sector = textoDelContexto(p, ["sector", "industry"]);
      const diferencial = textoDelContexto(p, ["diferenciacion", "propuestaDeValor"]);
      if (!sector && !diferencial) return undefined;

      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;

      const esperadas = [
        ...palabrasConPeso(sector ?? ""),
        ...palabrasConPeso(diferencial ?? ""),
      ];
      if (esperadas.length === 0) return undefined;

      return esperadas.some((w) => texto.includes(w))
        ? null
        : "el plan no menciona ni una vez el sector del cliente ni lo que le hace distinto";
    },
  },
  {
    id: "el-visitante-sabe-que-hacer",
    descripcion: "La página pide algo, no sólo cuenta cosas",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Una web que no le pide nada al visitante es un folleto: se lee, se
      // asiente y se cierra.
      const acciones = /\b(pide|pedir|solicita|solicitar|reserva|reservar|compra|comprar|llama|llamar|descarga|descargar|suscr[íi]b|apúntate|contacta|contactar|agenda|agendar|prueba gratis|empieza|book|buy|call|request|subscribe|get started)\b/;
      return acciones.test(texto)
        ? null
        : "el plan no le pide nada al visitante: una web sin acción es un folleto";
    },
  },
  {
    id: "dice-que-pasa-tras-el-formulario",
    descripcion: "Si hay formulario, se dice qué ocurre después",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      const hayFormulario = /\b(formulario|contacto|solicitud|presupuesto|contact form)\b/.test(texto);
      if (!hayFormulario) return undefined;
      // El silencio tras enviar un formulario es donde se pierde la confianza:
      // el visitante no sabe si ha llegado ni cuándo le contestarán.
      const respuesta = /\b(confirmaci[óo]n|responderemos|te responde|recibir[áa]s|en menos de|plazo de respuesta|acuse|te llamamos|we.ll (get back|reply))\b/.test(texto);
      return respuesta
        ? null
        : "hay formulario y no se dice qué pasa después de enviarlo ni cuándo se responde";
    },
  },
];

// ── ECOMMERCE ───────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_ECOMMERCE: readonly Comprobacion[] = [
  {
    id: "el-envio-y-la-devolucion-se-dicen",
    descripcion: "Se habla de envío y devoluciones",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Son las dos preguntas que decide un comprador antes de pagar, y las dos
      // razones por las que se abandona un carrito lleno.
      const envio = /\b(env[íi]o|entrega|shipping|delivery|portes)\b/.test(texto);
      const devolucion = /\b(devoluci[óo]n|devolver|reembolso|return|refund|garant[íi]a)\b/.test(texto);
      if (envio && devolucion) return null;
      const falta = [!envio && "el envío", !devolucion && "las devoluciones"].filter(Boolean);
      return `un plan de tienda que no habla de ${falta.join(" ni de ")}: es donde se abandona el carrito`;
    },
  },
];

// ── CRM ─────────────────────────────────────────────────────────────────────

export const SOBRE_LA_PROSA_CRM: readonly Comprobacion[] = [
  {
    id: "el-seguimiento-tiene-dueno-y-momento",
    descripcion: "Se dice quién hace el seguimiento y cuándo",
    clase: "rubrica",
    gravedad: "aviso",
    evaluar: (p) => {
      const texto = textoDe(p);
      if (texto.length < MINIMO_PARA_OPINAR) return undefined;
      // Un seguimiento sin dueño y sin momento no ocurre. Es la diferencia
      // entre un proceso y un diagrama bonito.
      const quien = /\b(responsable|due[ñn]o|asignad|comercial|se encarga|owner|assigned)\b/.test(texto);
      // «en menos de 2 horas» es como se dice de verdad, y la primera version
      // del patron solo cogia «en 2 horas». Lo caso su propia prueba.
      const cuando =
        /\b(a las \d|(en|dentro de)\s+(menos de\s+)?\d+\s*(horas?|d[íi]as?|semanas?|min)|al d[íi]a siguiente|mismo d[íi]a|cada \d|plazo|sla|within \d)\b/.test(
          texto,
        );
      if (quien && cuando) return null;
      const falta = [!quien && "quién lo hace", !cuando && "cuándo"].filter(Boolean);
      return `el seguimiento no dice ${falta.join(" ni ")}: sin eso no ocurre`;
    },
  },
];
