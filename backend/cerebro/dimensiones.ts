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

  // ══ PROFUNDIDAD POR DISCIPLINA ═══════════════════════════════════════════
  //
  // POR QUÉ SE AÑADEN. Se midió cuántas dimensiones propias declara cada uno de
  // los 25 servicios que NELVYON vende: DIECINUEVE no declaraban ninguna.
  // Recibían el contexto común del cliente y las imprescindibles, y nada que
  // preguntara lo que ESA disciplina necesita saber.
  //
  // Un servicio sin intake propio no es un servicio flojo: es una consultoría
  // que empieza sin hacer la primera pregunta. Un especialista de email no
  // arranca sin saber si la lista tiene consentimiento; uno de conversión no
  // arranca sin saber cuánto tráfico hay, porque eso decide si el experimento
  // puede llegar a concluir o va a medir ruido.
  //
  // CÓMO ESTÁN ESCRITAS. En el idioma del cliente, no en el nuestro. «¿Tu lista
  // de correo de dónde salió?» y no «¿cuál es tu base legal de tratamiento?».
  // Un intake que el cliente no entiende es un intake que no se rellena.
  //
  // Y NINGUNA ES IMPRESCINDIBLE. Todas opcionales a propósito: convertir
  // veintitantas preguntas en obligatorias haría del alta un muro, y un cliente
  // que abandona el intake no llega a ser cliente. Lo imprescindible sigue
  // siendo la lista corta de arriba.

  // ── Email y ciclo de vida ────────────────────────────────────────────────
  {
    id: "lista_de_correo",
    pregunta: "¿Tu lista de correo de dónde salió y cuánta gente hay? ¿Te dieron permiso para escribirles?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: ["email_marketing_premium", "funnel_premium"],
    laAporta: "cliente",
  },
  {
    id: "salud_de_envio",
    pregunta: "¿Cuánta gente abre tus correos, y cuántos rebotan o te marcan como spam?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 90,
    serviciosQueLaUsan: ["email_marketing_premium"],
    laAporta: "medicion",
  },
  {
    id: "momentos_del_cliente",
    pregunta: "¿En qué momentos concretos quieres que le llegue algo? Compró, se registró, lleva tiempo sin volver…",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 365,
    serviciosQueLaUsan: ["email_marketing_premium", "funnel_premium", "bots_premium"],
    laAporta: "cliente",
  },

  // ── Conversión y web ─────────────────────────────────────────────────────
  {
    id: "trafico_actual",
    pregunta: "¿Cuánta gente entra en tu web al mes y cuántos acaban comprando o dejando sus datos?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 60,
    // Sin esto no se puede saber si un experimento llegará a concluir: con poco
    // tráfico, cualquier ganador es ruido con forma de resultado.
    serviciosQueLaUsan: ["web_premium", "landing_premium", "funnel_premium", "ecommerce_premium"],
    laAporta: "medicion",
  },
  {
    id: "donde_se_atascan",
    pregunta: "¿En qué paso se te cae la gente? ¿Qué te dicen que les frena?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 120,
    serviciosQueLaUsan: ["web_premium", "landing_premium", "funnel_premium", "ecommerce_premium"],
    laAporta: "cliente",
  },
  {
    id: "que_tiene_que_hacer_la_web",
    pregunta: "Cuando alguien entra en tu web, ¿qué quieres que haga exactamente?",
    forma: "texto",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: ["web_premium", "landing_premium", "mantenimiento_web_premium"],
    laAporta: "cliente",
  },

  // ── Comercio electrónico ─────────────────────────────────────────────────
  {
    id: "economia_del_pedido",
    pregunta: "¿Cuánto te deja de margen un pedido medio, y cuánto puedes pagar por conseguirlo?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 180,
    // Es LA cifra del comercio electrónico. Sin ella sólo se puede decir si una
    // campaña vende, no si gana o pierde dinero.
    serviciosQueLaUsan: ["ecommerce_premium", "ads_premium"],
    laAporta: "cliente",
  },
  {
    id: "catalogo",
    pregunta: "¿Cuántas referencias tienes, y cuáles son las que de verdad te dan el dinero?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 120,
    serviciosQueLaUsan: ["ecommerce_premium", "fotografia_producto_premium"],
    laAporta: "cliente",
  },

  // ── Reputación ───────────────────────────────────────────────────────────
  {
    id: "donde_te_resenan",
    pregunta: "¿Dónde te dejan reseñas y quién responde ahora mismo?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: ["reputacion_online_orm_premium"],
    laAporta: "cliente",
  },
  {
    id: "quejas_que_se_repiten",
    pregunta: "¿De qué se queja la gente una y otra vez? ¿Hay algo que prefieras que no se conteste en público?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 90,
    serviciosQueLaUsan: [
      "reputacion_online_orm_premium",
      "bots_premium",
      "canales_comunicaciones_premium",
    ],
    laAporta: "cliente",
  },

  // ── Conversaciones automáticas ───────────────────────────────────────────
  {
    id: "preguntas_frecuentes_reales",
    pregunta: "¿Qué os preguntan todos los días, y qué respondéis?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: ["bots_premium", "canales_comunicaciones_premium", "voz_premium"],
    laAporta: "cliente",
  },
  {
    id: "cuando_pasar_a_una_persona",
    pregunta: "¿En qué casos quieres que deje de contestar el bot y lo coja alguien del equipo?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    // La pregunta que separa un bot útil de uno que enfada: sin ella el bot
    // insiste en resolver lo que no puede resolver.
    serviciosQueLaUsan: ["bots_premium", "voz_premium", "canales_comunicaciones_premium"],
    laAporta: "cliente",
  },

  // ── Marca y creatividad ──────────────────────────────────────────────────
  {
    id: "lo_que_la_marca_no_hace",
    pregunta: "¿Hay algo que tu marca no haría nunca? Tono, colores, temas, comparaciones…",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [
      "branding_premium",
      "diseno_grafico_creatividades_premium",
      "social_media_premium",
      "video_multimedia_premium",
      "3d_contenido_inmersivo_premium",
    ],
    laAporta: "cliente",
  },
  {
    id: "donde_se_usa_esto",
    pregunta: "¿Dónde se va a ver? Redes, escaparate, feria, web, packaging…",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [
      "diseno_grafico_creatividades_premium",
      "fotografia_producto_premium",
      "video_multimedia_premium",
      "3d_contenido_inmersivo_premium",
    ],
    laAporta: "cliente",
  },

  // ── Creadores ────────────────────────────────────────────────────────────
  {
    id: "con_quien_no_quieres_aparecer",
    pregunta: "¿Con qué tipo de perfiles NO quieres que se te asocie?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: ["influencer_marketing_premium"],
    laAporta: "cliente",
  },
  {
    id: "colaboraciones_previas",
    pregunta: "¿Has trabajado ya con creadores? ¿Qué tal fue y qué pagaste?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: 365,
    serviciosQueLaUsan: ["influencer_marketing_premium"],
    laAporta: "cliente",
  },

  // ── Operaciones internas ─────────────────────────────────────────────────
  {
    id: "lo_que_hacen_a_mano",
    pregunta: "¿Qué hacéis a mano cada semana que os come tiempo?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: [
      "consultoria_automatizacion_premium",
      "integraciones_apis_premium",
      "advisor_empresarial_premium",
    ],
    laAporta: "cliente",
  },
  {
    id: "herramientas_que_usais",
    pregunta: "¿Qué programas usáis a diario y cuáles NO se pueden tocar?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: 180,
    serviciosQueLaUsan: [
      "integraciones_apis_premium",
      "consultoria_automatizacion_premium",
      "mantenimiento_web_premium",
      "advisor_empresarial_premium",
    ],
    laAporta: "cliente",
  },
  {
    id: "quien_lo_va_a_usar",
    pregunta: "¿Quién va a usar esto en el día a día, y con qué nivel de manejo?",
    forma: "texto",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: [
      "formacion_capacitacion_digital_premium",
      "consultoria_automatizacion_premium",
      "personal_digital_premium",
      "mantenimiento_web_premium",
    ],
    laAporta: "cliente",
  },

  // ── Marca personal y voz ─────────────────────────────────────────────────
  {
    id: "de_que_quieres_que_te_conozcan",
    pregunta: "¿Por qué tema quieres ser la persona de referencia?",
    forma: "texto",
    imprescindible: false,
    caducaEnDias: 365,
    serviciosQueLaUsan: ["personal_digital_premium", "advisor_empresarial_premium"],
    laAporta: "cliente",
  },
  {
    id: "cuanto_tiempo_puedes_dedicar",
    pregunta: "¿Cuánto tiempo puedes dedicarle tú a la semana, siendo realista?",
    forma: "texto",
    imprescindible: false,
    caducaEnDias: 180,
    // Un plan de cinco publicaciones semanales para quien tiene media hora es
    // un plan que no se va a cumplir, y el servicio muere por incumplimiento
    // del cliente cuando en realidad murió al diseñarlo.
    serviciosQueLaUsan: [
      "personal_digital_premium",
      "social_media_premium",
      "contenido_copywriting_premium",
    ],
    laAporta: "cliente",
  },
  // ── Formación ────────────────────────────────────────────────────────────
  {
    id: "que_tienen_que_saber_hacer",
    pregunta: "Al terminar la formacion, ¿que tienen que ser capaces de hacer solos?",
    forma: "lista",
    imprescindible: false,
    caducaEnDias: null,
    // Una formacion sin esto se convierte en un temario. Con esto se convierte
    // en algo que se puede comprobar al final.
    serviciosQueLaUsan: ["formacion_capacitacion_digital_premium"],
    laAporta: "cliente",
  },
  {
    id: "cuanto_tiempo_de_formacion",
    pregunta: "¿Cuanto tiempo puede dedicar el equipo, y en que formato? Presencial, en video, poco a poco…",
    forma: "texto",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: ["formacion_capacitacion_digital_premium"],
    laAporta: "cliente",
  },

  // ── 3D e inmersivo ───────────────────────────────────────────────────────
  {
    id: "que_hay_que_representar",
    pregunta: "¿Que producto o espacio hay que recrear, y tienes planos, medidas o fotos?",
    forma: "mapa",
    imprescindible: false,
    caducaEnDias: null,
    serviciosQueLaUsan: ["3d_contenido_inmersivo_premium", "fotografia_producto_premium"],
    laAporta: "cliente",
  },
  {
    id: "donde_se_va_a_ver_en_3d",
    pregunta: "¿Se va a ver en la web, en el movil, con gafas o en una pantalla de feria?",
    forma: "texto",
    imprescindible: false,
    caducaEnDias: null,
    // Decide el presupuesto de poligonos y el formato de entrega. Preguntarlo
    // al final obliga a rehacerlo entero.
    serviciosQueLaUsan: ["3d_contenido_inmersivo_premium"],
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
