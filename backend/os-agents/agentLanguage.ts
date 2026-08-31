/**
 * EN QUÉ IDIOMA ESCRIBE UN AGENTE.
 *
 * QUÉ HACÍA MAL LA VERSIÓN ANTERIOR. Recorría un diccionario de idiomas en el
 * orden en que estaba escrito y devolvía **el primero que casara**. Como la
 * palabra `service` estaba en las listas de inglés, francés y alemán, y el
 * inglés se miraba antes, cualquier texto francés o alemán que dijera
 * «service» —que es como se dice en los tres— salía como inglés. Lo mismo con
 * `empresa`, que está en español y en portugués: el portugués salía español.
 *
 * MEDIDO SOBRE DIEZ FRASES REALISTAS: 6 aciertos, 4 fallos. Y la consecuencia
 * no era un matiz: `localizedPrompt` le ordena al modelo el idioma de salida,
 * así que un cliente alemán recibía su trabajo **en inglés**.
 *
 * CÓMO LO RESUELVE ESTA VERSIÓN. No gana el primero: se puntúan todos y gana el
 * mejor. Y cada palabra vale **según cuántos idiomas la compartan**:
 *
 *     peso(palabra) = 1 / (número de idiomas que la contienen)
 *
 * Así `service`, que está en tres, aporta un tercio a cada uno y no decide
 * nada; `brauchen` o `nossa`, que están en uno solo, deciden. Es la misma idea
 * que hace útil a un índice invertido: lo que aparece en todas partes no
 * distingue nada.
 *
 * LOS MARCADORES SON PALABRAS FUNCIONALES —artículos, pronombres,
 * preposiciones, auxiliares— y no vocabulario de negocio. Son las que más se
 * repiten en cualquier texto y las que menos se prestan entre idiomas. Poner
 * `marketing` o `service` como marcador principal es elegir justo las palabras
 * que todos los idiomas se han copiado.
 *
 * SE COMPARA SIN TILDES. Mucha gente escribe sin acentos, y «Munchen» o
 * «servico» no deberían valer menos que «München» o «serviço».
 *
 * LO QUE SIGUE SIN HACER: no es un identificador de idioma de verdad. Con una
 * frase de tres palabras acertará poco, y lo correcto entonces es que mande el
 * idioma declarado del cliente, no la adivinación. Por eso `resolveAgentLocale`
 * mira primero lo declarado y sólo adivina cuando no hay nada.
 */

export type AgentLocale = "es" | "en" | "fr" | "pt" | "de" | "it";

export const LOCALES_SOPORTADOS: readonly AgentLocale[] = ["es", "en", "fr", "pt", "de", "it"];

/**
 * Marcadores por idioma: palabras funcionales frecuentes.
 *
 * Se solapan a propósito en algunos casos (`una`/`uma`, `per`/`por`/`para`).
 * El solapamiento no estorba porque el peso lo neutraliza; esconderlo quitando
 * palabras dejaría idiomas con poca señal.
 */
const MARCADORES: Record<AgentLocale, readonly string[]> = {
  es: [
    "que", "para", "con", "una", "por", "pero", "nuestra", "nuestro", "nosotros",
    "necesitamos", "necesito", "empresa", "hola", "gracias", "servicio", "del",
    "las", "los", "esta", "muy", "tambien", "porque", "cuando", "hacer", "sin",
  ],
  en: [
    "the", "and", "with", "our", "need", "for", "that", "have", "this",
    "hello", "thanks", "please", "company", "service", "are", "you", "would",
    "your", "from", "about", "want", "more",
  ],
  fr: [
    "nous", "notre", "avec", "pour", "une", "des", "besoin", "bonjour", "merci",
    "entreprise", "service", "que", "vous", "cette", "dans", "sont", "leur",
    "plus", "tres", "aussi", "sur",
  ],
  pt: [
    "nossa", "nosso", "precisamos", "preciso", "uma", "para", "nao", "voce",
    "empresa", "servico", "obrigado", "ola", "com", "mais", "muito", "tambem",
    "porque", "quando", "fazer", "esta", "dos",
  ],
  de: [
    "wir", "unser", "unsere", "und", "fur", "mit", "brauchen", "brauche", "ein",
    "eine", "nicht", "hallo", "danke", "unternehmen", "service", "sind", "haben",
    "auch", "sehr", "aber", "oder", "bei", "mehr", "einen",
  ],
  it: [
    "nostra", "nostro", "siamo", "abbiamo", "una", "per", "con", "non", "ciao",
    "grazie", "azienda", "servizio", "bisogno", "che", "questa", "molto",
    "anche", "perche", "quando", "fare", "della",
  ],
};

/** En cuántos idiomas aparece cada marcador. Se calcula una sola vez. */
const CUANTOS_IDIOMAS: ReadonlyMap<string, number> = (() => {
  const cuenta = new Map<string, number>();
  for (const loc of LOCALES_SOPORTADOS) {
    for (const palabra of new Set(MARCADORES[loc])) {
      cuenta.set(palabra, (cuenta.get(palabra) ?? 0) + 1);
    }
  }
  return cuenta;
})();

/** Minúsculas y sin tildes: «München» y «Munchen» deben valer lo mismo. */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function palabrasDe(texto: string): string[] {
  return normalizar(texto)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Puntúa cada idioma sobre un texto.
 *
 * Se expone para poder explicar una decisión —y para que una prueba compruebe
 * el MARGEN y no sólo el ganador: acertar por los pelos y acertar con holgura
 * no son lo mismo, y sólo lo segundo aguanta un texto un poco distinto.
 */
export function puntuarIdiomas(texto: string): Record<AgentLocale, number> {
  const vistas = new Set(palabrasDe(texto));
  const puntos = Object.fromEntries(LOCALES_SOPORTADOS.map((l) => [l, 0])) as Record<
    AgentLocale,
    number
  >;
  for (const loc of LOCALES_SOPORTADOS) {
    for (const palabra of new Set(MARCADORES[loc])) {
      if (!vistas.has(palabra)) continue;
      // Lo que aparece en todos los idiomas no distingue ninguno.
      puntos[loc] += 1 / (CUANTOS_IDIOMAS.get(palabra) ?? 1);
    }
  }
  return puntos;
}

export function detectLanguageFromText(text: string, fallback: AgentLocale = "es"): AgentLocale {
  const muestra = (text || "").trim();
  if (!muestra) return fallback;

  const puntos = puntuarIdiomas(muestra);
  let mejor: AgentLocale = fallback;
  let mejorPunto = 0;

  for (const loc of LOCALES_SOPORTADOS) {
    if (puntos[loc] > mejorPunto + 1e-9) {
      mejor = loc;
      mejorPunto = puntos[loc];
    }
  }

  // ¿Hay otro idioma empatado con el ganador? Entonces no hay ganador.
  const empatados = LOCALES_SOPORTADOS.filter(
    (l) => Math.abs(puntos[l] - mejorPunto) <= 1e-9,
  );

  // Sin señal, o con un empate que no se rompe, se devuelve el idioma por
  // defecto en vez de elegir a cara o cruz. Adivinar mal es peor que no saber:
  // quien no sabe puede preguntar; quien adivina entrega en otro idioma.
  if (mejorPunto === 0 || empatados.length > 1) return fallback;
  return mejor;
}

export function localizedPrompt(basePrompt: string, locale: AgentLocale): string {
  const labels: Record<AgentLocale, string> = {
    es: "español",
    en: "English",
    fr: "français",
    pt: "português",
    de: "Deutsch",
    it: "italiano",
  };
  return (
    `You are a NELVYON OS agent. ALWAYS write output in ${labels[locale]} (${locale}).\n\n` +
    basePrompt.trim()
  );
}

/**
 * El idioma de un encargo.
 *
 * EL ORDEN IMPORTA, y es el que sigue:
 *
 *   1. lo que el cliente tiene declarado en su perfil;
 *   2. lo que el propio encargo declara (`language` / `locale` / `idioma`);
 *   3. y sólo si no hay nada declarado, lo que se adivine del texto.
 *
 * Un dato declarado siempre gana a una conjetura. La versión anterior se
 * saltaba el paso 2: un encargo podía traer `language: "de"` y no servía de
 * nada, porque pasaba directamente a adivinar sobre el texto libre.
 */
export function resolveAgentLocale(
  payload: Record<string, unknown>,
  profileLanguage?: string | null,
): AgentLocale {
  const normalizado = (v: unknown): AgentLocale | null => {
    if (typeof v !== "string") return null;
    // Acepta «de», «de-DE», «DE_de»: lo que manda es la raíz.
    const raiz = v.trim().toLowerCase().split(/[-_]/)[0];
    return (LOCALES_SOPORTADOS as readonly string[]).includes(raiz) ? (raiz as AgentLocale) : null;
  };

  const delPerfil = normalizado(profileLanguage);
  if (delPerfil) return delPerfil;

  for (const clave of ["language", "locale", "idioma", "lang"]) {
    const declarado = normalizado(payload[clave]);
    if (declarado) return declarado;
  }

  const brief = String(payload.brief ?? payload.prompt ?? payload.message ?? "");
  return detectLanguageFromText(brief);
}
