export const MARKETING_BG = "#0a0a0a";

export const NAV_LINKS = [
  { href: "/seo", label: "SEO IA" },
  { href: "/ads", label: "Publicidad IA" },
  { href: "/contenido", label: "Contenido IA" },
  { href: "/email-marketing", label: "Email IA" },
  { href: "/branding", label: "Branding IA" },
  { href: "/pricing", label: "Precios" },
  { href: "/contacto", label: "Contacto" },
] as const;

export const FOOTER_GROUPS = [
  {
    title: "Servicios",
    links: [
      { href: "/seo", label: "SEO IA" },
      { href: "/ads", label: "Publicidad IA" },
      { href: "/contenido", label: "Contenido IA" },
      { href: "/email-marketing", label: "Email Marketing IA" },
      { href: "/branding", label: "Branding IA" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/pricing", label: "Precios" },
      { href: "/contacto", label: "Contacto" },
      { href: "/auth/login", label: "Acceder" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Términos" },
      { href: "/legal/privacy", label: "Privacidad" },
      { href: "/legal", label: "Centro legal" },
    ],
  },
] as const;

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 47,
    description: "Ideal para founders y equipos que arrancan con marketing IA.",
    highlights: ["SEO IA", "Contenido IA", "Informes mensuales", "Soporte email"],
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 197,
    description: "Para negocios que escalan adquisición y conversión cada mes.",
    highlights: ["Todo Starter", "Publicidad IA", "Email Marketing IA", "Prioridad en cola", "Integraciones"],
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 497,
    description: "Agencias y equipos que gestionan múltiples marcas con IA.",
    highlights: ["Todo Pro", "Branding IA", "Multi-workspace", "API & white-label", "Account manager"],
    featured: false,
  },
] as const;

export type ServiceSlug = "seo" | "ads" | "contenido" | "email-marketing" | "branding";

export type ServicePageConfig = {
  slug: ServiceSlug;
  path: string;
  title: string;
  subtitle: string;
  gradient: string;
  planName: string;
  planPrice: number;
  features: string[];
  steps: { title: string; body: string }[];
  results: string[];
};

export const SERVICE_PAGES: Record<ServiceSlug, ServicePageConfig> = {
  seo: {
    slug: "seo",
    path: "/seo",
    title: "SEO IA",
    subtitle: "Posicionamiento orgánico, contenido y autoridad — ejecutado por agentes especializados.",
    gradient: "from-violet-600 via-indigo-500 to-blue-600",
    planName: "Starter",
    planPrice: 95,
    features: [
      "Auditoría técnica y semántica automatizada",
      "Investigación de keywords y clusters de contenido",
      "Artículos optimizados para intención de búsqueda",
      "Enlaces internos y estructura de silos",
      "Informes de posiciones y tráfico orgánico",
      "Recomendaciones de conversión en landings",
    ],
    steps: [
      { title: "Conecta tu web", body: "NELVYON analiza tu dominio, competidores y mercado en minutos." },
      { title: "Agentes ejecutan", body: "SEO técnico, contenido y optimización on-page sin intervención manual." },
      { title: "Mides resultados", body: "Dashboard con rankings, clics y oportunidades priorizadas." },
    ],
    results: [
      "Más tráfico cualificado sin aumentar presupuesto en ads",
      "Contenido publicado con cadencia constante",
      "Visibilidad en búsquedas de alta intención",
    ],
  },
  ads: {
    slug: "ads",
    path: "/ads",
    title: "Publicidad IA",
    subtitle: "Campañas en Google, Meta y TikTok optimizadas para ROAS — creatividades y pujas con IA.",
    gradient: "from-purple-600 via-violet-500 to-indigo-600",
    planName: "Pro",
    planPrice: 270,
    features: [
      "Estructura de campañas y grupos de anuncios",
      "Copy y hooks para cada canal",
      "Variantes de creatividades y tests A/B",
      "Optimización de pujas y audiencias",
      "Informes de ROAS y CPA por campaña",
      "Alertas de fatiga creativa y presupuesto",
    ],
    steps: [
      { title: "Define objetivo", body: "Leads, ventas o tráfico — NELVYON alinea mensaje y funnel." },
      { title: "Lanza y optimiza", body: "Agentes publican variantes y ajustan según rendimiento en tiempo real." },
      { title: "Escala winners", body: "Duplica lo que convierte y pausa lo que quema presupuesto." },
    ],
    results: [
      "Menor CPA con mismas creatividades humanas",
      "Tests continuos sin depender de una agencia",
      "Visibilidad unificada cross-channel",
    ],
  },
  contenido: {
    slug: "contenido",
    path: "/contenido",
    title: "Contenido IA",
    subtitle: "Artículos, redes, guiones y calendarios editoriales — marca consistente a escala.",
    gradient: "from-indigo-600 via-blue-500 to-cyan-500",
    planName: "Starter",
    planPrice: 95,
    features: [
      "Calendario editorial multicanal",
      "Posts para LinkedIn, Instagram y blog",
      "Guiones para video y reels",
      "Tono de marca entrenado por sector",
      "Repurposing de piezas largas a microcontenido",
      "Revisión humana opcional antes de publicar",
    ],
    steps: [
      { title: "Brief de marca", body: "Voz, audiencia y pilares de contenido en un solo perfil." },
      { title: "Producción masiva", body: "Agentes generan borradores listos para aprobar o publicar." },
      { title: "Distribución", body: "Exporta o conecta canales según tu flujo de trabajo." },
    ],
    results: [
      "Presencia constante sin equipo de contenido completo",
      "Mensaje alineado en todos los touchpoints",
      "Menos tiempo de idea a publicación",
    ],
  },
  "email-marketing": {
    slug: "email-marketing",
    path: "/email-marketing",
    title: "Email Marketing IA",
    subtitle: "Secuencias, newsletters y nurturing personalizado — automatización que convierte.",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    planName: "Pro",
    planPrice: 270,
    features: [
      "Secuencias de bienvenida y onboarding",
      "Campañas de reactivación y win-back",
      "Newsletters con líneas editoriales propias",
      "Segmentación por comportamiento y plan",
      "A/B de asuntos y CTAs",
      "Métricas de apertura, clic y conversión",
    ],
    steps: [
      { title: "Mapea el journey", body: "Desde lead hasta cliente — cada touch con objetivo claro." },
      { title: "Escribe y programa", body: "Agentes redactan emails y definen timing óptimo." },
      { title: "Optimiza", body: "Iteración automática según engagement y conversiones." },
    ],
    results: [
      "Más MRR desde base existente",
      "Menor churn con nurturing proactivo",
      "Campañas listas en días, no semanas",
    ],
  },
  branding: {
    slug: "branding",
    path: "/branding",
    title: "Branding IA",
    subtitle: "Identidad, posicionamiento y narrativa de marca — coherencia premium en cada activo.",
    gradient: "from-blue-600 via-indigo-600 to-violet-600",
    planName: "Agency",
    planPrice: 470,
    features: [
      "Manifiesto de marca y propuesta de valor",
      "Guías de tono y mensajes clave",
      "Paleta, tipografía y dirección visual",
      "Naming y taglines alternativos",
      "Pitch decks y one-pagers",
      "Aplicación cross-channel con agentes",
    ],
    steps: [
      { title: "Discovery", body: "Competencia, audiencia y diferenciación en un brief vivo." },
      { title: "Sistema", body: "NELVYON genera identidad verbal y visual alineada." },
      { title: "Despliegue", body: "Todos los agentes usan la misma voz en SEO, ads y contenido." },
    ],
    results: [
      "Marca reconocible y profesional desde día uno",
      "Menos inconsistencias entre equipos y canales",
      "Escalado a múltiples clientes con Agency",
    ],
  },
};

export const HOME_SERVICES = [
  {
    href: "/seo",
    title: "SEO IA",
    description: "Rankings, contenido y autoridad orgánica sin agencia.",
    gradient: SERVICE_PAGES.seo.gradient,
  },
  {
    href: "/ads",
    title: "Publicidad IA",
    description: "Google, Meta y TikTok optimizados para ROAS.",
    gradient: SERVICE_PAGES.ads.gradient,
  },
  {
    href: "/contenido",
    title: "Contenido IA",
    description: "Calendarios, posts y guiones con tu voz de marca.",
    gradient: SERVICE_PAGES.contenido.gradient,
  },
  {
    href: "/email-marketing",
    title: "Email Marketing IA",
    description: "Secuencias y newsletters que convierten.",
    gradient: SERVICE_PAGES["email-marketing"].gradient,
  },
  {
    href: "/branding",
    title: "Branding IA",
    description: "Identidad y narrativa coherentes a escala.",
    gradient: SERVICE_PAGES.branding.gradient,
  },
] as const;

export const CTA_REGISTER = "/register";
