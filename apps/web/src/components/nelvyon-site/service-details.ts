import type { ServiceSlug } from "./brand";

export type ServiceDetail = {
  slug: ServiceSlug;
  title: string;
  subtitle: string;
  intro: string;
  features: string[];
  steps: { title: string; body: string }[];
  results: string[];
};

export const SERVICE_DETAILS: Record<ServiceSlug, ServiceDetail> = {
  "seo-ia": {
    slug: "seo-ia",
    title: "SEO IA",
    subtitle: "Autoridad orgánica sin fricción humana",
    intro:
      "Agentes especializados auditan, priorizan y ejecutan SEO técnico y de contenido con cadencia constante. Tu dominio gana visibilidad mientras tú defines el norte estratégico.",
    features: [
      "Auditoría técnica y semántica continua",
      "Clusters de contenido por intención de búsqueda",
      "Optimización on-page y enlazado interno",
      "Informes de posiciones y oportunidades",
      "Integración con CRM y landings",
    ],
    steps: [
      { title: "Conecta", body: "Vincula tu dominio y competidores en minutos." },
      { title: "Ejecuta", body: "Los agentes publican y optimizan sin esperar briefs." },
      { title: "Escala", body: "Duplica lo que rankea y elimina lo que no aporta." },
    ],
    results: ["Tráfico cualificado", "Menor dependencia de paid", "Contenido con cadencia premium"],
  },
  "publicidad-ia": {
    slug: "publicidad-ia",
    title: "Publicidad IA",
    subtitle: "ROAS optimizado en Google, Meta y TikTok",
    intro:
      "Campañas estructuradas, creatividades iteradas y pujas ajustadas en tiempo real. Publicidad de performance con la velocidad de la IA y el control de un dashboard unificado.",
    features: [
      "Estructura de campañas multicanal",
      "Variantes de copy y creatividades A/B",
      "Optimización de audiencias y presupuesto",
      "Alertas de fatiga creativa",
      "Atribución unificada",
    ],
    steps: [
      { title: "Objetivo", body: "Leads, ventas o awareness — alineamos mensaje y funnel." },
      { title: "Lanzamiento", body: "Agentes publican y testean variantes automáticamente." },
      { title: "Escala", body: "Presupuesto hacia winners, pausa en perdedores." },
    ],
    results: ["CPA reducido", "Tests continuos", "Visibilidad cross-channel"],
  },
  "contenido-ia": {
    slug: "contenido-ia",
    title: "Contenido IA",
    subtitle: "Voz de marca a escala editorial",
    intro:
      "Calendarios, artículos, posts y guiones con coherencia premium. Tu audiencia percibe una marca impecable; el sistema produce sin cuellos de botella.",
    features: [
      "Calendario editorial multicanal",
      "Tono entrenado por sector",
      "Repurposing inteligente",
      "Workflow de aprobación opcional",
      "Export a CMS y redes",
    ],
    steps: [
      { title: "Brief", body: "Pilares, audiencia y restricciones de marca." },
      { title: "Producción", body: "Borradores listos para revisar o publicar." },
      { title: "Distribución", body: "Conecta canales o exporta en un clic." },
    ],
    results: ["Presencia constante", "Mensaje unificado", "Menos tiempo idea→live"],
  },
  "email-ia": {
    slug: "email-ia",
    title: "Email IA",
    subtitle: "Secuencias que convierten en automático",
    intro:
      "Desde bienvenida hasta win-back: emails personalizados, segmentados y optimizados por engagement. Tu base existente se convierte en motor de ingresos.",
    features: [
      "Secuencias de onboarding",
      "Reactivación y nurturing",
      "Newsletters editoriales",
      "A/B de asuntos y CTAs",
      "Métricas de conversión",
    ],
    steps: [
      { title: "Journey", body: "Mapeamos touchpoints desde lead a cliente." },
      { title: "Redacción", body: "Agentes escriben y programan en timing óptimo." },
      { title: "Optimización", body: "Iteración según aperturas y revenue." },
    ],
    results: ["Más MRR desde base", "Menor churn", "Campañas en días, no semanas"],
  },
  "branding-ia": {
    slug: "branding-ia",
    title: "Branding IA",
    subtitle: "Identidad que impone legado",
    intro:
      "Manifiesto, narrativa, guías visuales y mensajes clave — un sistema de marca que todos los agentes respetan en cada pieza generada.",
    features: [
      "Propuesta de valor y manifiesto",
      "Guía de tono y mensajes",
      "Dirección visual y paleta",
      "Pitch decks y one-pagers",
      "Despliegue cross-agente",
    ],
    steps: [
      { title: "Discovery", body: "Competencia, audiencia y diferenciación." },
      { title: "Sistema", body: "Identidad verbal y visual alineada." },
      { title: "Despliegue", body: "SEO, ads y contenido hablan igual." },
    ],
    results: ["Marca reconocible", "Coherencia total", "Escalado multi-cliente"],
  },
  "social-media-ia": {
    slug: "social-media-ia",
    title: "Social Media IA",
    subtitle: "Presencia social con inteligencia operativa",
    intro:
      "Publicación programada, respuestas asistidas y contenido nativo por red. Crece tu comunidad mientras mantienes control editorial desde el panel NELVYON.",
    features: [
      "Calendario por red social",
      "Copy y hooks por formato",
      "Respuestas sugeridas a comentarios",
      "Análisis de engagement",
      "Integración con campañas paid",
    ],
    steps: [
      { title: "Estrategia", body: "Pilares y frecuencia por canal." },
      { title: "Producción", body: "Posts, reels y carruseles listos." },
      { title: "Optimización", body: "Doble down en formatos ganadores." },
    ],
    results: ["Comunidad activa", "Marca visible", "Sin equipo dedicado 24/7"],
  },
};
