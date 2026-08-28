/**
 * LAS DIMENSIONES DEL CEREBRO DE NEGOCIO.
 *
 * Cada dimensión es una pregunta sobre el cliente que un agente puede necesitar
 * responder para hacer bien su trabajo. El catálogo vive aquí y no en un CHECK
 * de la base a propósito: añadir una dimensión no debe exigir una migración.
 *
 * QUÉ NO ES ESTO. No es un formulario. `os_clients` ya tiene 23 campos de
 * texto libre y ninguno sirve para que un agente decida nada: `ideal_customer`
 * es un párrafo y `competition` es otro párrafo. Un párrafo no se puede
 * consultar por dimensión, ni versionar, ni saber de dónde salió.
 *
 * Cada dimensión declara:
 *
 *   - qué forma tiene su valor, para que quien la lee no adivine;
 *   - si es IMPRESCINDIBLE para operar (sin ella no se puede empezar);
 *   - cuánto tarda en quedarse rancia;
 *   - qué servicios la necesitan, que es lo que permite decirle al cliente
 *     «para tu SEO nos falta esto» en vez de pedirle los 26 campos de golpe.
 */

/** Forma del valor. Quien lee una dimensión sabe qué esperar sin inspeccionar. */
export type FormaDeValor =
  | "texto"        // { texto: string }
  | "lista"        // { items: string[] }
  | "personas"     // { personas: Array<{ nombre, rol, dolor, objecion }> }
  | "competidores" // { competidores: Array<{ nombre, url?, fortaleza?, hueco? }> }
  | "ubicaciones"  // { ubicaciones: Array<{ nombre, direccion?, ciudad, pais }> }
  | "objetivos"    // { objetivos: Array<{ metrica, valorObjetivo?, plazo? }> }
  | "presupuesto"  // { moneda, mensualCents?, porCanal?: Record<string, number> }
  | "mapa"         // { [clave: string]: unknown }
  | "booleano";    // { valor: boolean }

export interface Dimension {
  id: string;
  /** Cómo se le pregunta al cliente. En su idioma, no en el nuestro. */
  pregunta: string;
  forma: FormaDeValor;
  /**
   * Sin esto NO se puede empezar a trabajar para el cliente. Es una lista corta
   * a propósito: si todo es imprescindible, el onboarding se vuelve un muro y
   * el cliente se va antes de terminarlo.
   */
  imprescindible: boolean;
  /** Días tras los cuales el dato deja de ser de fiar. `null` = no caduca. */
  caducaEnDias: number | null;
  /**
   * Servicios que la necesitan. Vacío = la necesita cualquiera. Es lo que
   * permite pedirle al cliente sólo lo que su servicio usa.
   */
  serviciosQueLaUsan: readonly string[];
  /** Quién debería aportarla. Orienta el onboarding y el customer success. */
  laAporta: "cliente" | "nelvyon" | "medicion";
}

export const DIMENSIONES: readonly Dimension[] = [
  // ── Quién es y qué vende ─────────────────────────────────────────────────
  {
    id: "empresa",
    pregunta: "¿Cómo se llama tu empresa y a qué se dedica?",
    forma: "texto",
    imprescindible: true,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "sector",
    pregunta: "¿En qué sector operas?",
    forma: "texto",
    imprescindible: true,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "productos",
    pregunta: "¿Qué productos vendes?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 365,
    serviciosQueLaUsan: ["ecommerce_premium", "ads_premium", "seo_premium"],
    laAporta: "cliente",
  },
  {
    id: "servicios",
    pregunta: "¿Qué servicios ofreces?",
    forma: "lista",
    imprescindible: true,
    caducaEnDias: 365,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "ubicaciones",
    pregunta: "¿Dónde estás? ¿Tienes más de un sitio?",
    forma: "ubicaciones",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: ["seo_premium", "ads_premium", "social_media_premium"],
    laAporta: "cliente",
  },

  // ── A quién le vende ─────────────────────────────────────────────────────
  {
    id: "icp",
    pregunta: "¿Quién es tu cliente ideal?",
    forma: "texto",
    imprescindible: true,
    caducaEnDias: 365,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "buyer_personas",
    pregunta: "¿Quién decide la compra, y qué le preocupa?",
    forma: "personas",
    imprescindible: false,
    caducaEnDias: 365,
    serviciosQueLaUsan: [
      "ads_premium",
      "email_marketing_premium",
      "contenido_copywriting_premium",
      "funnel_premium",
    ],
    laAporta: "nelvyon",
  },
  {
    id: "competidores",
    pregunta: "¿Con quién te comparan tus clientes?",
    forma: "competidores",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: ["seo_premium", "ads_premium", "branding_premium"],
    laAporta: "cliente",
  },

  // ── Cómo se presenta ─────────────────────────────────────────────────────
  {
    id: "marca",
    pregunta: "¿Cómo es tu marca? Colores, logo, estilo.",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "brand_voice",
    pregunta: "¿Cómo hablas a tus clientes? ¿De tú o de usted? ¿Formal o cercano?",
    forma: "texto",
    imprescindible: true,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "propuesta_de_valor",
    pregunta: "¿Por qué te eligen a ti y no a otro?",
    forma: "texto",
    imprescindible: true,
    caducaEnDias: 365,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "ofertas",
    pregunta: "¿Qué ofertas o promociones tienes activas?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 90,
    serviciosQueLaUsan: ["ads_premium", "email_marketing_premium", "funnel_premium"],
    laAporta: "cliente",
  },

  // ── Qué quiere conseguir ─────────────────────────────────────────────────
  {
    id: "objetivos",
    pregunta: "¿Qué quieres conseguir, y en cuánto tiempo?",
    forma: "objetivos",
    imprescindible: true,
    caducaEnDias: 180,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "restricciones",
    pregunta: "¿Hay algo que NO podamos hacer o decir?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "presupuestos",
    pregunta: "¿Cuánto puedes invertir al mes, y en qué?",
    forma: "presupuesto",
    imprescindible: false,
    caducaEnDias: 90,
    serviciosQueLaUsan: ["ads_premium", "influencer_marketing_premium"],
    laAporta: "cliente",
  },
  {
    id: "canales",
    pregunta: "¿Dónde están hoy tus clientes y dónde quieres estar?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: ["social_media_premium", "ads_premium", "canales_comunicaciones_premium"],
    laAporta: "cliente",
  },

  // ── Con qué se trabaja ───────────────────────────────────────────────────
  {
    id: "activos",
    pregunta: "¿Qué tienes ya? Web, redes, fotos, vídeos, base de clientes.",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "conexiones",
    pregunta: "¿Nos das acceso a tus cuentas para poder trabajar y medir?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: ["seo_premium", "ads_premium", "social_media_premium"],
    laAporta: "cliente",
  },
  {
    id: "keywords",
    pregunta: "¿Por qué palabras quieres que te encuentren?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: ["seo_premium", "ads_premium", "contenido_copywriting_premium"],
    laAporta: "nelvyon",
  },
  {
    id: "audiencias",
    pregunta: "Audiencias definidas para campañas.",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 90,
    serviciosQueLaUsan: ["ads_premium", "social_media_premium"],
    laAporta: "nelvyon",
  },
  {
    id: "creatividades",
    pregunta: "Creatividades disponibles y su rendimiento.",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 90,
    serviciosQueLaUsan: ["ads_premium", "diseno_grafico_creatividades_premium"],
    laAporta: "nelvyon",
  },

  // ── Qué ha pasado ────────────────────────────────────────────────────────
  {
    id: "historial",
    pregunta: "¿Qué habéis probado antes, y qué tal fue?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "resultados",
    pregunta: "Resultados medidos de lo que NELVYON ha hecho.",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 30,
    serviciosQueLaUsan: [],
    laAporta: "medicion",
  },
  {
    id: "analytics",
    pregunta: "Datos de analítica del cliente.",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 30,
    serviciosQueLaUsan: ["seo_premium", "ads_premium", "advisor_empresarial_premium"],
    laAporta: "medicion",
  },
  {
    id: "crm",
    pregunta: "Datos de su embudo comercial: qué entra, qué convierte, qué se pierde.",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 30,
    serviciosQueLaUsan: ["funnel_premium", "email_marketing_premium", "ads_premium"],
    laAporta: "medicion",
  },

  // ── Qué hay que respetar ─────────────────────────────────────────────────
  {
    id: "legal_compliance",
    pregunta: "¿Tu sector tiene reglas especiales sobre lo que se puede prometer?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "nelvyon",
  },
  {
    id: "aprobaciones",
    pregunta: "¿Qué quieres aprobar antes de que salga, y qué no hace falta?",
    forma: "mapa",
    imprescindible: true,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "preferencias",
    pregunta: "¿Cómo prefieres que te avisemos y cada cuánto?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [],
    laAporta: "cliente",
  },
  {
    id: "knowledge",
    pregunta: "Documentación, manuales y material propio del cliente.",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: ["bots_premium", "contenido_copywriting_premium"],
    laAporta: "cliente",
  },
] as const;

const PORID = new Map(DIMENSIONES.map((d) => [d.id, d]));

export function dimension(id: string): Dimension | null {
  return PORID.get(id) ?? null;
}

export function esDimensionConocida(id: string): boolean {
  return PORID.has(id);
}

/** Las que hacen falta para empezar. Deliberadamente pocas. */
export function dimensionesImprescindibles(): Dimension[] {
  return DIMENSIONES.filter((d) => d.imprescindible);
}

/**
 * Las que necesita UN servicio: las imprescindibles más las suyas.
 *
 * Es lo que permite pedirle al cliente sólo lo que su servicio usa, en vez de
 * los 28 campos de golpe. Un onboarding que pide todo es un onboarding que
 * nadie termina.
 */
export function dimensionesDeServicio(serviceId: string): Dimension[] {
  return DIMENSIONES.filter(
    (d) => d.imprescindible || d.serviciosQueLaUsan.includes(serviceId),
  );
}

/** Las que le tocan al cliente, para no pedirle lo que debemos deducir nosotros. */
export function dimensionesQueAportaElCliente(serviceId?: string): Dimension[] {
  const base = serviceId ? dimensionesDeServicio(serviceId) : [...DIMENSIONES];
  return base.filter((d) => d.laAporta === "cliente");
}
