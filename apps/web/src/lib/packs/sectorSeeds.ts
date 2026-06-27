/**
 * sectorSeeds.ts — seed templates for all 20 OS sectors.
 *
 * Each sector has ≥1 seed. getSeedByIndex(sectorId, index) returns the seed
 * at `index` (or null if out of range / unknown sector).
 *
 * seed_id format: `${sectorId}_tpl_${index}`
 *
 * The `prompt` field is the non-empty agent system prompt injected when the
 * LLM generates content for this sector. `output_schema` declares the fields
 * the deliverable must include.
 */

export type SectorSeed = {
  seed_id: string;
  sector: string;
  prompt: string;
  output_schema: { fields: string[] };
  landing_headline: string;
  landing_subheadline: string;
  meta_title: string;
  meta_desc: string;
  chatbot_greeting: string;
  blog_h1_ideas: string[];
};

// ---------------------------------------------------------------------------
// Internal registry: sectorId → SectorSeed[]
// ---------------------------------------------------------------------------

const SEEDS: Record<string, SectorSeed[]> = {
  dental: [
    {
      seed_id: "dental_tpl_0",
      sector: "dental",
      prompt: "Genera contenido de marketing para una clínica dental en {{city}}. Enfócate en generar confianza, destacar tratamientos sin dolor y captar citas online. Usa un tono profesional y empático. Incluye disclaimer sanitario. No hagas diagnósticos ni prometas resultados garantizados.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Sonríe con confianza — sin dolor en {{city}}",
      landing_subheadline: "{{value_proposition}} — reserva tu primera visita hoy",
      meta_title: "{{business_name}} — Clínica Dental en {{city}} | Reservar cita",
      meta_desc: "{{value_proposition}} en {{city}}. Especialistas dentales con tecnología avanzada. Sin dolor. Pide cita online.",
      chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Quieres pedir cita o tienes alguna pregunta sobre nuestros tratamientos?",
      blog_h1_ideas: ["Implantes dentales en {{city}}: guía completa", "¿Ortodoncia invisible o brackets? Te ayudamos a elegir", "Cómo mantener una sonrisa sana todo el año"],
    },
  ],
  legal: [
    {
      seed_id: "legal_tpl_0",
      sector: "legal",
      prompt: "Genera contenido de marketing para un despacho de abogados especializado. Enfócate en autoridad, confidencialidad y resultados (sin prometer % de éxito). Usa tono profesional y empático. No proporciones asesoramiento jurídico concreto. Siempre incluye ESCALATE_OPERATOR.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Abogados especialistas que defienden tus intereses en {{city}}",
      landing_subheadline: "{{value_proposition}} — consulta inicial gratuita y confidencial",
      meta_title: "{{business_name}} — Abogados en {{city}} | Consulta gratuita",
      meta_desc: "{{value_proposition}}. Despacho en {{city}} especializado en {{sector}}. Primera consulta gratuita y confidencial.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Tienes alguna consulta legal? Cuéntame y te ayudo a orientarte.",
      blog_h1_ideas: ["Guía para entender tu derecho laboral en España", "¿Cuándo necesitas un abogado de familia?", "Cómo proteger tu empresa con un buen asesoramiento jurídico"],
    },
  ],
  fitness: [
    {
      seed_id: "fitness_tpl_0",
      sector: "fitness",
      prompt: "Genera contenido de marketing para un gimnasio o centro de fitness en {{city}}. Enfócate en transformación personal, comunidad y prueba sin riesgo. Evita claims garantizados de pérdida de peso. Tono motivador y cercano.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Tu transformación empieza hoy en {{city}}",
      landing_subheadline: "{{value_proposition}} — prueba 7 días gratis sin compromiso",
      meta_title: "{{business_name}} — Gimnasio en {{city}} | Prueba gratis 7 días",
      meta_desc: "{{value_proposition}} en {{city}}. Clases dirigidas, entrenadores personales y comunidad de apoyo. Prueba 7 días gratis.",
      chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Quieres probar nuestras clases o tienes alguna pregunta?",
      blog_h1_ideas: ["Los mejores ejercicios para empezar en el gimnasio", "Nutrición y entrenamiento: la combinación ganadora", "Por qué la constancia es la clave del fitness"],
    },
  ],
  beauty: [
    {
      seed_id: "beauty_tpl_0",
      sector: "beauty",
      prompt: "Genera contenido de marketing para una clínica estética o centro de belleza en {{city}}. Enfócate en confianza médica, resultados naturales y experiencia personalizada. No incluyas antes/después engañosos ni prometas resultados garantizados. Requiere revisión operador.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Belleza que te hace sentir tú misma en {{city}}",
      landing_subheadline: "{{value_proposition}} — valoración gratuita sin compromiso",
      meta_title: "{{business_name}} — Estética en {{city}} | Valoración gratuita",
      meta_desc: "{{value_proposition}} en {{city}}. Tratamientos estéticos con profesionales certificados. Reserva tu valoración.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿En qué tratamiento estás interesada? Te ayudo a elegir el más adecuado.",
      blog_h1_ideas: ["Los tratamientos de estética más solicitados este año", "Cómo cuidar tu piel en casa entre sesiones", "Medicina estética vs cirugía: ¿cuál te conviene?"],
    },
  ],
  restaurant: [
    {
      seed_id: "restaurant_tpl_0",
      sector: "restaurant",
      prompt: "Genera contenido de marketing para un restaurante en {{city}}. Enfócate en la experiencia gastronómica, reservas directas y carta de temporada. Tono cálido y apetitoso. Menciona reserva directa como ventaja vs apps.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Sabor auténtico en el corazón de {{city}}",
      landing_subheadline: "{{value_proposition}} — reserva tu mesa hoy sin comisiones",
      meta_title: "{{business_name}} — Restaurante en {{city}} | Reservar mesa",
      meta_desc: "{{value_proposition}} en {{city}}. Cocina de temporada, ambiente único. Reserva directa con beneficios exclusivos.",
      chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Quieres reservar mesa o consultar nuestra carta?",
      blog_h1_ideas: ["Los platos más populares de {{business_name}} esta temporada", "Guía de maridaje para tu cena perfecta en {{city}}", "Eventos privados en {{business_name}}: todo lo que necesitas saber"],
    },
  ],
  real_estate: [
    {
      seed_id: "real_estate_tpl_0",
      sector: "real_estate",
      prompt: "Genera contenido de marketing para una inmobiliaria en {{city}}. Enfócate en captación de vendedores (mandatos), confianza y valoración gratuita. Tono profesional. No inventes referencias catastrales ni precios de mercado concretos.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Vende tu piso en {{city}} al mejor precio — sin estrés",
      landing_subheadline: "{{value_proposition}} — tasación gratuita en 24h",
      meta_title: "{{business_name}} — Inmobiliaria en {{city}} | Tasación gratis",
      meta_desc: "{{value_proposition}} en {{city}}. Compramos, vendemos y alquilamos con garantías. Tasación gratuita sin compromiso.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Buscas comprar, vender o alquilar una propiedad?",
      blog_h1_ideas: ["Guía para vender tu piso en {{city}} rápido y bien", "¿Cómo valorar tu propiedad en el mercado actual?", "Los barrios más demandados de {{city}} este trimestre"],
    },
  ],
  ecommerce: [
    {
      seed_id: "ecommerce_tpl_0",
      sector: "ecommerce",
      prompt: "Genera contenido de marketing para una tienda online. Enfócate en envío rápido, devolución fácil y oferta del producto hero. Tono directo y orientado a conversión. Incluye precios con IVA, política de devoluciones y cookies según normativa.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Envío en 24h — calidad garantizada en cada pedido",
      landing_subheadline: "{{value_proposition}} — devolución gratis en 30 días",
      meta_title: "{{business_name}} — Comprar online | Envío rápido España",
      meta_desc: "{{value_proposition}}. Envío en 24h. Devolución gratuita 30 días. Compra segura en {{business_name}}.",
      chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿En qué producto puedo ayudarte hoy?",
      blog_h1_ideas: ["Guía de compra: todo sobre {{value_proposition}}", "Cómo elegir el mejor producto para tus necesidades", "Por qué nuestros clientes repiten en {{business_name}}"],
    },
  ],
  solar: [
    {
      seed_id: "solar_tpl_0",
      sector: "solar",
      prompt: "Genera contenido de marketing para un instalador de paneles solares. Enfócate en ahorro en factura, estudio gratuito y ROI orientativo (no garantizado). Requiere revisión operador si hay % ahorro exacto. No prometas ayudas o subvenciones concretas sin fecha vigente.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Reduce tu factura de luz hasta un 70% con paneles solares",
      landing_subheadline: "{{value_proposition}} — estudio de consumo gratuito sin compromiso",
      meta_title: "{{business_name}} — Instalación solar en {{city}} | Estudio gratis",
      meta_desc: "{{value_proposition}} en {{city}}. Instalación llave en mano. Ahorra en factura. Estudio gratuito sin compromiso.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres un estudio de consumo gratuito para tu vivienda o negocio?",
      blog_h1_ideas: ["Cuánto se ahorra realmente con placas solares en {{city}}", "Autoconsumo solar: guía completa para propietarios", "Cómo aprovechar las subvenciones solares (y cuándo no confiar en ellas)"],
    },
  ],
  coaching: [
    {
      seed_id: "coaching_tpl_0",
      sector: "coaching",
      prompt: "Genera contenido de marketing para un coach de negocios o vida. Enfócate en transformación, metodología propia y sesión de descubrimiento gratuita. No prometas ingresos garantizados. Tono inspiracional y auténtico.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Desbloquea tu máximo potencial con el método {{business_name}}",
      landing_subheadline: "{{value_proposition}} — sesión de descubrimiento gratuita",
      meta_title: "{{business_name}} — Coaching de negocios | Sesión gratis",
      meta_desc: "{{value_proposition}}. Programa de coaching para emprendedores y directivos. Resultados probados. Sesión inicial gratuita.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres saber más sobre el programa o agenda tu sesión gratuita?",
      blog_h1_ideas: ["Los 3 bloqueos mentales que frenan tu negocio", "Cómo multiplicar tus resultados con la mentalidad correcta", "Metodología {{business_name}}: transformación en 90 días"],
    },
  ],
  saas_b2b: [
    {
      seed_id: "saas_b2b_tpl_0",
      sector: "saas_b2b",
      prompt: "Genera contenido de marketing para un SaaS B2B. Enfócate en outcomes de negocio (no features), ICP específico, trial o demo gratuita. Tono directo y orientado a conversión. Incluye comparativas honestas, sin claims SOC2 a menos que certificado.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "{{value_proposition}} — empieza tu prueba gratis hoy",
      landing_subheadline: "14 días sin tarjeta de crédito. ROI positivo en los primeros 30 días.",
      meta_title: "{{business_name}} — Software B2B | Trial 14 días gratis",
      meta_desc: "{{value_proposition}}. Software para equipos B2B. Sin contrato inicial. Prueba {{business_name}} 14 días gratis.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Quieres ver una demo personalizada o empezar el trial?",
      blog_h1_ideas: ["Cómo {{business_name}} reduce el tiempo de cierre en ventas B2B", "La guía definitiva para automatizar tu proceso comercial", "Casos de éxito: empresas que crecen con {{business_name}}"],
    },
  ],
  veterinaria: [
    {
      seed_id: "veterinaria_tpl_0",
      sector: "veterinaria",
      prompt: "Genera contenido de marketing para una clínica veterinaria en {{city}}. Enfócate en amor por las mascotas, urgencias cubiertas y planes de salud anuales. No hagas diagnósticos online. Tono cálido y tranquilizador.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "La salud de tu mascota en manos expertas en {{city}}",
      landing_subheadline: "{{value_proposition}} — primera revisión de cachorros gratis",
      meta_title: "{{business_name}} — Veterinario en {{city}} | Cita online",
      meta_desc: "{{value_proposition}} en {{city}}. Cuidamos a tu mascota con amor y tecnología. Urgencias y citas online.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Necesitas pedir cita o tienes alguna duda sobre tu mascota?",
      blog_h1_ideas: ["Guía de vacunación para perros y gatos en España", "Señales de alerta que no debes ignorar en tu mascota", "Plan de salud anual: por qué merece la pena en {{city}}"],
    },
  ],
  educacion: [
    {
      seed_id: "educacion_tpl_0",
      sector: "educacion",
      prompt: "Genera contenido de marketing para una academia o centro educativo. Enfócate en resultados académicos (con disclaimer), metodología diferenciadora y clase de prueba gratuita. Tono motivador y cercano. No prometas aprobados garantizados sin condiciones.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Aprueba con confianza — resultados que hablan por sí solos en {{city}}",
      landing_subheadline: "{{value_proposition}} — clase de prueba gratuita esta semana",
      meta_title: "{{business_name}} — Academia en {{city}} | Clase de prueba gratis",
      meta_desc: "{{value_proposition}} en {{city}}. Metodología personalizada y grupos reducidos. Clase de prueba gratuita.",
      chatbot_greeting: "¡Hola! Soy el asistente de {{business_name}}. ¿Qué materia o idioma buscas mejorar?",
      blog_h1_ideas: ["Cómo preparar los exámenes finales sin agobiarte", "Metodología activa vs clases magistrales: ¿cuál funciona mejor?", "5 técnicas de estudio que cambian todo en {{city}}"],
    },
  ],
  turismo: [
    {
      seed_id: "turismo_tpl_0",
      sector: "turismo",
      prompt: "Genera contenido de marketing para un hotel boutique o alojamiento turístico. Enfócate en experiencia única, reserva directa con ventajas y disponibilidad limitada. Tono aspiracional. Incluye política de cancelación visible.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Una experiencia única en el corazón de {{city}}",
      landing_subheadline: "{{value_proposition}} — reserva directa con desayuno incluido",
      meta_title: "{{business_name}} — Alojamiento en {{city}} | Reservar directo",
      meta_desc: "{{value_proposition}} en {{city}}. Reserva directa con ventajas exclusivas: desayuno, late checkout y mejor precio.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Buscas disponibilidad o quieres conocer nuestros packs especiales?",
      blog_h1_ideas: ["Guía de {{city}} en 3 días: lo imprescindible", "Por qué reservar directo en {{business_name}} es mejor que las OTAs", "Los mejores eventos en {{city}} esta temporada"],
    },
  ],
  construccion: [
    {
      seed_id: "construccion_tpl_0",
      sector: "construccion",
      prompt: "Genera contenido de marketing para una empresa de reformas o construcción. Enfócate en confianza, portfolio real y presupuesto sin compromiso. No incluyas presupuestos exactos sin visita. Tono sólido y profesional.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Reformas de calidad con garantía en {{city}}",
      landing_subheadline: "{{value_proposition}} — presupuesto gratuito en 48 horas",
      meta_title: "{{business_name}} — Reformas en {{city}} | Presupuesto gratis",
      meta_desc: "{{value_proposition}} en {{city}}. Empresa de reformas con más de X proyectos realizados. Presupuesto sin compromiso.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿En qué tipo de reforma puedo ayudarte?",
      blog_h1_ideas: ["Cómo planificar una reforma integral sin sorpresas", "Materiales que marcan la diferencia en una cocina renovada", "Cuánto cuesta reformar un baño en {{city}} en 2025"],
    },
  ],
  automocion: [
    {
      seed_id: "automocion_tpl_0",
      sector: "automocion",
      prompt: "Genera contenido de marketing para un concesionario o taller de automóviles en {{city}}. Enfócate en stock real, financiación accesible y servicio postventa. No inventes km ni características de vehículos concretos. Tono directo y de confianza.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Tu próximo coche te espera en {{business_name}}, {{city}}",
      landing_subheadline: "{{value_proposition}} — tasación gratuita de tu vehículo actual",
      meta_title: "{{business_name}} — Coches en {{city}} | Financiación desde €X/mes",
      meta_desc: "{{value_proposition}} en {{city}}. Amplio stock de vehículos nuevos y de ocasión. Financiación sin intereses 12 meses.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Buscas un vehículo nuevo, de ocasión o cita para taller?",
      blog_h1_ideas: ["Cómo elegir entre coche eléctrico o híbrido en 2025", "Los pasos para conseguir la mejor financiación para tu coche", "ITV en {{city}}: todo lo que necesitas saber para no fallar"],
    },
  ],
  logistica: [
    {
      seed_id: "logistica_tpl_0",
      sector: "logistica",
      prompt: "Genera contenido de marketing para una empresa de logística o transporte B2B. Enfócate en fiabilidad, SLA garantizado y cotización rápida. No prometas precios sin conocer peso y destino. Tono profesional y orientado a negocio.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Logística que llega siempre — SLA garantizado para tu empresa",
      landing_subheadline: "{{value_proposition}} — cotización en 2 horas",
      meta_title: "{{business_name}} — Transporte y logística B2B | Cotización rápida",
      meta_desc: "{{value_proposition}}. SLA garantizado, tracking en tiempo real y atención 24h. Pide cotización en 2 horas.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Necesitas cotizar un envío o hablar con un comercial?",
      blog_h1_ideas: ["Cómo elegir un operador logístico para tu ecommerce", "Last-mile delivery: tendencias y soluciones en España", "SLA vs precio: qué priorizar en tu contrato de transporte"],
    },
  ],
  seguros: [
    {
      seed_id: "seguros_tpl_0",
      sector: "seguros",
      prompt: "Genera contenido de marketing para una correduría de seguros. Enfócate en asesoramiento imparcial, comparativa gratuita y valor añadido frente a comparadores. No des precios concretos sin datos del cliente. Requiere revisión operador siempre.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "El seguro que necesitas — asesoramiento sin prisas en {{city}}",
      landing_subheadline: "{{value_proposition}} — comparativa gratuita sin compromiso",
      meta_title: "{{business_name}} — Seguros en {{city}} | Comparativa gratis",
      meta_desc: "{{value_proposition}} en {{city}}. Correduría independiente que trabaja para ti, no para las aseguradoras. Comparativa gratis.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Qué tipo de seguro estás buscando? Te ayudo a comparar.",
      blog_h1_ideas: ["Cómo elegir el mejor seguro de hogar en {{city}}", "Seguro de vida: lo que debes saber antes de contratar", "Por qué un corredor de seguros te ahorra dinero a largo plazo"],
    },
  ],
  contabilidad: [
    {
      seed_id: "contabilidad_tpl_0",
      sector: "contabilidad",
      prompt: "Genera contenido de marketing para una asesoría fiscal y laboral. Enfócate en tranquilidad fiscal, precio claro y primera consulta gratuita. No proporciones asesoramiento fiscal concreto sin contrato. Tono profesional y de confianza.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Tu contabilidad al día — sin sorpresas ni sanciones en {{city}}",
      landing_subheadline: "{{value_proposition}} — primera consulta fiscal gratuita",
      meta_title: "{{business_name}} — Asesoría en {{city}} | 1ª consulta gratis",
      meta_desc: "{{value_proposition}} en {{city}}. Asesoría fiscal, laboral y contable para autónomos y pymes. Sin letra pequeña.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Eres autónomo o empresa? Te ayudo con tus dudas fiscales.",
      blog_h1_ideas: ["Calendario fiscal del autónomo en España 2025", "Cómo reducir legalmente tu factura de IRPF siendo autónomo", "Alta como autónomo o SL: ¿qué te conviene más?"],
    },
  ],
  hosteleria: [
    {
      seed_id: "hosteleria_tpl_0",
      sector: "hosteleria",
      prompt: "Genera contenido de marketing para un hotel de 3–5 estrellas. Enfócate en la experiencia del huésped, tarifa directa con ventajas y captación MICE. Tono aspiracional y profesional. Incluye paridad tarifaria real con OTAs.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Tu estancia perfecta en {{city}} — reserva directo y ahorra",
      landing_subheadline: "{{value_proposition}} — mejor precio garantizado + early check-in",
      meta_title: "{{business_name}} — Hotel en {{city}} | Mejor precio directo",
      meta_desc: "{{value_proposition}} en {{city}}. Hotel con encanto, restaurante y spa. Reserva directo y disfruta de ventajas exclusivas.",
      chatbot_greeting: "Bienvenido a {{business_name}}. Soy tu asistente virtual. ¿Buscas habitaciones disponibles o información sobre eventos?",
      blog_h1_ideas: ["Los mejores planes para disfrutar {{city}} desde {{business_name}}", "Organiza tu evento o reunión de empresa en {{city}}", "Escapada romántica en {{business_name}}: lo que incluye nuestro pack"],
    },
  ],
  tecnologia: [
    {
      seed_id: "tecnologia_tpl_0",
      sector: "tecnologia",
      prompt: "Genera contenido de marketing para una agencia de desarrollo de software o IT services. Enfócate en outcomes de negocio (no en tecnología), portfolio real y auditoría gratuita. No prometas horas de desarrollo sin discovery previo. Tono directo y orientado a resultados.",
      output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
      landing_headline: "Software a medida que hace crecer tu negocio en {{city}}",
      landing_subheadline: "{{value_proposition}} — auditoría técnica gratuita sin compromiso",
      meta_title: "{{business_name}} — Desarrollo software en {{city}} | Auditoría gratis",
      meta_desc: "{{value_proposition}} en {{city}}. Agencia de desarrollo con foco en resultados reales. MVP en 4 semanas. Auditoría gratuita.",
      chatbot_greeting: "Hola, soy el asistente de {{business_name}}. ¿Tienes un proyecto en mente? Cuéntame y te digo cómo podemos ayudarte.",
      blog_h1_ideas: ["Por qué el software a medida supera a las soluciones genéricas", "Cómo lanzar un MVP en 4 semanas sin perder calidad", "El stack tecnológico de {{business_name}}: por qué elegimos lo que elegimos"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSeedByIndex(
  sectorId: string,
  index: number,
  _rootOverride?: undefined,
  learningRanks?: Map<string, number>,
): SectorSeed | null {
  const seeds = SEEDS[sectorId];
  if (!seeds || seeds.length === 0) return null;
  // O26 — when a DNA/learning rank map is provided, prefer the best-ranked seed
  // (lowest rank = highest priority) over the requested index. Falls back to index.
  if (learningRanks && learningRanks.size > 0) {
    let best: SectorSeed | null = null;
    let bestRank = Infinity;
    for (const s of seeds) {
      const r = learningRanks.get(s.seed_id);
      if (r !== undefined && r < bestRank) { bestRank = r; best = s; }
    }
    if (best) return best;
  }
  if (index < 0 || index >= seeds.length) return null;
  return seeds[index]!;
}

export function getSectorSeedCount(sectorId: string): number {
  return SEEDS[sectorId]?.length ?? 0;
}

export const ALL_SECTOR_IDS = Object.keys(SEEDS) as string[];
