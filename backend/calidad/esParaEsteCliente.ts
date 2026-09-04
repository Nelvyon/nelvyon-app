/**
 * ¿Esta pieza es para ESTE cliente, o para un cliente cualquiera?
 *
 * ── EL HUECO ────────────────────────────────────────────────────────────────
 *
 * El motor tenía 79 comprobaciones repartidas en 18 disciplinas y ni una sola
 * mencionaba el idioma, el país o el mercado del cliente. Medido: cero
 * apariciones de «idioma», «país», «language» o «country» en 1.647 líneas.
 *
 * Es el fallo más silencioso que puede cometer una agencia. Una landing
 * impecable escrita en español para una clínica de Lyon pasa todas las
 * comprobaciones que existían: tiene un solo H1, el CTA es único, las imágenes
 * llevan alt, el titular cabe. Está bien hecha. Y no sirve para nada.
 *
 * Ninguna prueba de código detecta eso, porque no hay nada roto.
 *
 * ── POR QUÉ VIVE APARTE ─────────────────────────────────────────────────────
 *
 * Estas tres comprobaciones son COMUNES: un anuncio en el idioma equivocado lo
 * está igual de mal siendo anuncio que siendo correo. Pero llevan una heurística
 * con matices —detectar idioma sin modelo— que merece leerse y probarse sola,
 * y meterla en el fichero grande la escondería.
 *
 * ── LA DISTINCIÓN QUE DECIDE TODO: NO APLICA ≠ NO SE PUDO COMPROBAR ─────────
 *
 * Son tres estados, no dos, y confundir dos de ellos rompe el motor por el
 * lado contrario al que se pretendía arreglar:
 *
 *   · NO APLICA         nadie declaró el idioma del cliente        → `null`
 *   · NO SE PUDO        se declaró, pero el texto no da para tanto → `undefined`
 *   · FALLA             se declaró y no coincide                   → el motivo
 *
 * La primera versión de este fichero devolvía `undefined` también para «no
 * aplica», y mandó a revisión humana una pieza impecable: una bloqueante sin
 * comprobar escala cualquier acción de alto riesgo. Como ninguna llamada pasa
 * todavía `contexto.idioma`, eso habría convertido TODO el alto riesgo en
 * revisión manual de la noche a la mañana.
 *
 * El motor ya tenía resuelta esta distinción en `sin-mezcla-de-clientes`, y por
 * el mismo motivo, escrito allí: «una bandeja llena de ruido se deja de mirar».
 *
 * ── LO QUE ESTO DEJA ABIERTO, Y DÓNDE VA ────────────────────────────────────
 *
 * Que nadie declare el idioma del cliente ES un problema — pero es un problema
 * del INTAKE, no de la pieza. Castigar aquí a la pieza por un hueco de la ficha
 * del cliente culpa al sitio equivocado, y encima esconde el hueco de verdad.
 *
 * ── Y ANTE LA DUDA, CALLAR ──────────────────────────────────────────────────
 *
 * Cuando la comprobación SÍ aplica pero el texto es corto o el idioma no queda
 * claro, no se opina. Acusar a una pieza correcta de estar en el idioma
 * equivocado hace que se deje de mirar el motor entero, y un motor que se
 * ignora no protege de nada.
 */
import type { Comprobacion, Pieza } from "./MotorDeCalidad";

// ── Idioma ──────────────────────────────────────────────────────────────────

/**
 * Palabras función por idioma.
 *
 * Se usan palabras gramaticales —artículos, preposiciones, conjunciones— y no
 * vocabulario: el vocabulario de un sector se parece entre idiomas («marketing»,
 * «digital», «premium»), y las palabras función no. Son además las más
 * frecuentes, así que aparecen en cualquier texto de longitud razonable.
 */
const PALABRAS_FUNCION: Record<string, readonly string[]> = {
  es: ["el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "por", "con", "para", "su", "se", "más", "como", "pero", "sus", "este"],
  en: ["the", "of", "and", "to", "in", "a", "is", "that", "for", "it", "with", "as", "on", "at", "this", "your", "you", "we", "are", "our"],
  fr: ["le", "la", "les", "de", "des", "et", "un", "une", "pour", "dans", "que", "qui", "sur", "avec", "vous", "nous", "est", "au", "aux", "ce"],
  de: ["der", "die", "das", "und", "ist", "von", "den", "mit", "für", "auf", "ein", "eine", "sich", "dem", "nicht", "auch", "sie", "wir", "im", "zu"],
  it: ["il", "lo", "la", "di", "che", "e", "un", "una", "per", "con", "non", "del", "della", "sono", "nel", "alla", "come", "più", "anche", "questo"],
  pt: ["o", "a", "os", "as", "de", "que", "e", "em", "um", "uma", "para", "com", "não", "por", "mais", "como", "sua", "seu", "está", "são"],
  ca: ["el", "la", "els", "les", "de", "que", "i", "en", "un", "una", "per", "amb", "és", "als", "seva", "seu", "més", "aquest", "però", "són"],
};

/** Mínimo de palabras para que contar tenga sentido. Debajo, no se opina. */
const MINIMO_PALABRAS = 25;

/**
 * Margen que exige la decisión.
 *
 * El segundo idioma tiene que quedar claramente por debajo del primero. Español
 * y catalán comparten muchas palabras función, así que sin margen el detector
 * confundiría uno con otro — y acusar a una pieza catalana de estar en español
 * es exactamente el falso positivo que haría que nadie volviera a hacer caso.
 */
const MARGEN = 1.6;

export function detectarIdioma(texto: string): { idioma: string; seguro: boolean } | null {
  const palabras = texto
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (palabras.length < MINIMO_PALABRAS) return null;

  const cuenta = new Map<string, number>();
  for (const p of palabras) cuenta.set(p, (cuenta.get(p) ?? 0) + 1);

  const puntos = Object.entries(PALABRAS_FUNCION)
    .map(([idioma, lista]) => ({
      idioma,
      puntos: lista.reduce((s, w) => s + (cuenta.get(w) ?? 0), 0),
    }))
    .sort((a, b) => b.puntos - a.puntos);

  const [primero, segundo] = puntos;
  if (!primero || primero.puntos === 0) return null;

  const seguro = !segundo || segundo.puntos === 0 || primero.puntos >= segundo.puntos * MARGEN;
  return { idioma: primero.idioma, seguro };
}

/** Todo el texto de la pieza, mirando también lo anidado. */
function textoDe(pieza: Pieza): string {
  const trozos: string[] = [];
  const recorrer = (v: unknown, profundidad = 0): void => {
    if (profundidad > 6) return;
    if (typeof v === "string") trozos.push(v);
    else if (Array.isArray(v)) for (const x of v) recorrer(x, profundidad + 1);
    else if (v && typeof v === "object") for (const x of Object.values(v)) recorrer(x, profundidad + 1);
  };
  recorrer(pieza.contenido);
  return trozos.join(" ");
}

function idiomaPedido(pieza: Pieza): string | null {
  const v = pieza.contexto?.idioma ?? pieza.contexto?.language;
  if (typeof v !== "string") return null;
  const norm = v.trim().toLowerCase().slice(0, 2);
  return norm in PALABRAS_FUNCION ? norm : null;
}

// ── Mercado ─────────────────────────────────────────────────────────────────

/**
 * Señales que delatan que la pieza está pensada para OTRO mercado.
 *
 * No se listan las señales correctas de cada mercado sino las AJENAS, porque lo
 * que se busca es la contaminación: una plantilla reutilizada de otro cliente
 * que se quedó con su moneda, su impuesto o su regulador.
 */
const SENALES_DE_MERCADO: Record<string, readonly { patron: RegExp; que: string }[]> = {
  ES: [
    { patron: /\$\s?\d|USD\b|\bd[óo]lares\b/i, que: "precios en dólares" },
    { patron: /\bSIRET\b|\bTVA\b/i, que: "identificadores fiscales franceses" },
    { patron: /\bHMRC\b|\b£\s?\d/i, que: "referencias fiscales o precios británicos" },
    { patron: /\bZIP\s?code\b|\bstate\s+tax\b/i, que: "formularios pensados para EE. UU." },
  ],
  FR: [
    { patron: /\bNIF\b|\bCIF\b|\bIVA\b/i, que: "identificadores fiscales españoles" },
    { patron: /\$\s?\d|USD\b/i, que: "precios en dólares" },
    { patron: /\b£\s?\d|\bHMRC\b/i, que: "referencias británicas" },
  ],
  US: [
    { patron: /\bRGPD\b|\bLOPDGDD\b|\bAEPD\b/i, que: "normativa europea de datos" },
    { patron: /€\s?\d|\bEUR\b/i, que: "precios en euros" },
    { patron: /\bIVA\b|\bTVA\b/i, que: "impuestos europeos" },
  ],
  UK: [
    { patron: /\$\s?\d(?!\d*\s?(CAD|AUD))/i, que: "precios en dólares" },
    { patron: /\bNIF\b|\bCIF\b/i, que: "identificadores fiscales españoles" },
    { patron: /€\s?\d/i, que: "precios en euros" },
  ],
  MX: [
    { patron: /\bNIF\b|\bCIF\b|\bIVA\s+del\s+21/i, que: "fiscalidad española" },
    { patron: /€\s?\d|\bEUR\b/i, que: "precios en euros" },
    { patron: /\bRGPD\b|\bAEPD\b/i, que: "normativa europea de datos" },
  ],
};

function mercadoPedido(pieza: Pieza): string | null {
  const v = pieza.contexto?.mercado ?? pieza.contexto?.pais ?? pieza.contexto?.country;
  if (typeof v !== "string") return null;
  const norm = v.trim().toUpperCase().slice(0, 2);
  return norm in SENALES_DE_MERCADO ? norm : null;
}

// ── Hechos sobre el cliente ─────────────────────────────────────────────────

/**
 * Un año de fundación en el texto que no coincide con el que consta.
 *
 * Es el dato inventado más frecuente y el más fácil de comprobar: «desde 1985»
 * queda bien en cualquier titular y nadie lo verifica. Cuando NELVYON sabe el
 * año de verdad, inventarse otro deja de ser una licencia creativa y pasa a ser
 * una afirmación falsa publicada en nombre del cliente.
 *
 * Sólo se mira cuando el dato consta. Sin dato, `undefined`: fabricar una
 * acusación sería el mismo error que fabricar el hecho.
 */
const ANIO_DE_FUNDACION = /\b(?:desde|fundad[ao]s?\s+en|establecid[ao]s?\s+en|since|depuis|est\.)\s+(1[89]\d{2}|20[0-4]\d)\b/gi;

function anioQueConsta(pieza: Pieza): number | null {
  const datos = pieza.contexto?.datosDelCliente;
  if (!datos || typeof datos !== "object") return null;
  const v = (datos as Record<string, unknown>).anioDeFundacion ?? (datos as Record<string, unknown>).fundacion;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n > 1800 && n < 2100 ? n : null;
}

// ── Las comprobaciones ──────────────────────────────────────────────────────

export const ES_PARA_ESTE_CLIENTE: readonly Comprobacion[] = [
  {
    id: "en-el-idioma-del-cliente",
    descripcion: "La pieza está escrita en el idioma que se pidió",
    clase: "determinista",
    // Bloqueante: una pieza en el idioma equivocado no se arregla revisándola,
    // se rehace. Publicarla es peor que no entregar nada.
    gravedad: "bloqueante",
    evaluar: (p) => {
      // NO APLICA: nadie dijo en qué idioma tenía que estar. Es un hueco de
      // la ficha del cliente, no un defecto de esta pieza.
      const pedido = idiomaPedido(p);
      if (!pedido) return null;

      const texto = textoDe(p);
      const detectado = detectarIdioma(texto);
      // Texto corto o empate: no se opina. Un falso positivo aquí enseña a
      // ignorar el motor entero.
      if (!detectado || !detectado.seguro) return undefined;

      return detectado.idioma === pedido
        ? null
        : `se pidió en «${pedido}» y está escrita en «${detectado.idioma}»`;
    },
  },
  {
    id: "para-el-mercado-del-cliente",
    descripcion: "No arrastra moneda, impuestos ni normativa de otro país",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      // NO APLICA: sin mercado declarado no hay nada con lo que contrastar.
      const mercado = mercadoPedido(p);
      if (!mercado) return null;

      const texto = textoDe(p);
      // Aquí sí es «no se pudo»: el mercado consta y la pieza no trae texto.
      if (texto.trim().length === 0) return undefined;

      const ajenas = (SENALES_DE_MERCADO[mercado] ?? []).filter((s) => s.patron.test(texto));
      return ajenas.length > 0
        ? `el cliente opera en ${mercado} y la pieza trae ${ajenas.map((a) => a.que).join(", ")}`
        : null;
    },
  },
  {
    id: "no-inventa-la-historia-del-cliente",
    descripcion: "No se inventa datos del negocio que constan de otra forma",
    clase: "determinista",
    gravedad: "bloqueante",
    evaluar: (p) => {
      // NO APLICA: sin año en la ficha no se puede desmentir nada, e inventar
      // una acusación sería el mismo error que inventar el hecho.
      const consta = anioQueConsta(p);
      if (consta === null) return null;

      const texto = textoDe(p);
      const dichos = [...texto.matchAll(ANIO_DE_FUNDACION)].map((m) => Number(m[1]));
      if (dichos.length === 0) return null;

      const falsos = [...new Set(dichos.filter((a) => a !== consta))];
      return falsos.length > 0
        ? `dice «desde ${falsos[0]}» y el año que consta es ${consta}`
        : null;
    },
  },
];
