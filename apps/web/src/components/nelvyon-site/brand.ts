export const NELVYON = {
  name: "NELVYON",
  slogan: "Donde nace tu imperio, crece tu marca y se impone tu legado",
  tagline: "Sistema autónomo de marketing con inteligencia artificial",
  electric: "#0066FF",
  electricGlow: "rgba(0, 102, 255, 0.45)",
  bg: "#050505",
  bgElevated: "#0c0c0e",
  border: "rgba(255,255,255,0.08)",
} as const;

export const NAV = [
  { href: "/servicios", label: "Servicios" },
  { href: "/precios", label: "Precios" },
  { href: "/sobre-nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
] as const;

export const FOOTER = {
  producto: [
    { href: "/servicios", label: "Servicios" },
    { href: "/precios", label: "Precios" },
    { href: "/register", label: "Registro" },
    { href: "/login", label: "Acceder" },
  ],
  legal: [
    { href: "/privacidad", label: "Privacidad" },
    { href: "/cookies", label: "Cookies" },
    { href: "/terminos", label: "Términos" },
  ],
  empresa: [
    { href: "/sobre-nosotros", label: "Sobre nosotros" },
    { href: "/contacto", label: "Contacto" },
  ],
} as const;

export const SERVICES = [
  {
    slug: "seo-ia",
    href: "/servicios/seo-ia",
    title: "SEO IA",
    short: "Posicionamiento orgánico ejecutado por agentes especializados.",
    icon: "◎",
    gradient: "from-[#0066FF] to-[#0044AA]",
  },
  {
    slug: "publicidad-ia",
    href: "/servicios/publicidad-ia",
    title: "Publicidad IA",
    short: "Google, Meta y TikTok optimizados para ROAS real.",
    icon: "◆",
    gradient: "from-[#0066FF] to-[#00AAFF]",
  },
  {
    slug: "contenido-ia",
    href: "/servicios/contenido-ia",
    title: "Contenido IA",
    short: "Calendarios editoriales y piezas con voz de marca premium.",
    icon: "▣",
    gradient: "from-[#0055DD] to-[#0066FF]",
  },
  {
    slug: "email-ia",
    href: "/servicios/email-ia",
    title: "Email IA",
    short: "Secuencias, nurturing y newsletters que convierten.",
    icon: "✉",
    gradient: "from-[#0044BB] to-[#0088FF]",
  },
  {
    slug: "branding-ia",
    href: "/servicios/branding-ia",
    title: "Branding IA",
    short: "Identidad, narrativa y coherencia en cada activo.",
    icon: "◈",
    gradient: "from-[#0066FF] to-[#5533FF]",
  },
  {
    slug: "social-media-ia",
    href: "/servicios/social-media-ia",
    title: "Social Media IA",
    short: "Publicación, community y growth en redes con IA.",
    icon: "◉",
    gradient: "from-[#0066FF] to-[#00CCFF]",
  },
  {
    slug: "chatbot-ia",
    href: "/servicios/chatbot-ia",
    title: "Chatbot IA",
    short: "Atención, cualificación y ventas 24/7 en web y WhatsApp.",
    icon: "💬",
    gradient: "from-[#0055EE] to-[#00AAFF]",
  },
  {
    slug: "automatizacion-ia",
    href: "/servicios/automatizacion-ia",
    title: "Automatización IA",
    short: "Workflows que conectan CRM, email, ads y operaciones.",
    icon: "⚡",
    gradient: "from-[#0066FF] to-[#8844FF]",
  },
  {
    slug: "crm-ia",
    href: "/servicios/crm-ia",
    title: "CRM IA",
    short: "Pipeline, scoring y seguimiento inteligente de leads.",
    icon: "◐",
    gradient: "from-[#0044CC] to-[#0066FF]",
  },
  {
    slug: "landing-pages-ia",
    href: "/servicios/landing-pages-ia",
    title: "Landing Pages IA",
    short: "Landings de conversión generadas y optimizadas con IA.",
    icon: "▤",
    gradient: "from-[#0066FF] to-[#00BBFF]",
  },
  {
    slug: "tiendas-online-ia",
    href: "/servicios/tiendas-online-ia",
    title: "Tiendas Online IA",
    short: "Ecommerce con catálogo, checkout y growth automatizado.",
    icon: "🛒",
    gradient: "from-[#0055DD] to-[#3388FF]",
  },
  {
    slug: "diseno-ia",
    href: "/servicios/diseno-ia",
    title: "Diseño IA",
    short: "Creatividades, UI y assets visuales con calidad premium.",
    icon: "✦",
    gradient: "from-[#0066FF] to-[#AA44FF]",
  },
] as const;

export type ServiceSlug = (typeof SERVICES)[number]["slug"];

export const HOME_STATS = [
  { value: "12", label: "Servicios IA", suffix: "+" },
  { value: "24/7", label: "Ejecución autónoma", suffix: "" },
  { value: "95€", label: "Desde / mes", suffix: "" },
  { value: "6", label: "Idiomas soportados", suffix: "" },
] as const;

export const PLANS = [
  {
    id: "plan-1",
    name: "Plan 1",
    monthly: null as number | null,
    annual: null as number | null,
    description: "Para equipos que empiezan a escalar su marca con IA.",
    highlights: ["Acceso a módulos core", "Workspace único", "Soporte estándar", "Informes mensuales"],
    featured: false,
  },
  {
    id: "plan-2",
    name: "Plan 2",
    monthly: null,
    annual: null,
    description: "Para negocios en crecimiento que exigen ejecución autónoma.",
    highlights: ["Todo Plan 1", "Automatizaciones avanzadas", "Integraciones premium", "Prioridad en cola"],
    featured: true,
  },
  {
    id: "plan-3",
    name: "Plan 3",
    monthly: null,
    annual: null,
    description: "Para agencias y marcas que operan a escala internacional.",
    highlights: ["Todo Plan 2", "Multi-workspace", "White-label", "Account manager dedicado"],
    featured: false,
  },
] as const;

export const COMPARE_ROWS = [
  { label: "Agentes IA especializados", p1: true, p2: true, p3: true },
  { label: "CRM integrado", p1: true, p2: true, p3: true },
  { label: "Automatizaciones", p1: false, p2: true, p3: true },
  { label: "Integraciones API", p1: false, p2: true, p3: true },
  { label: "Multi-workspace", p1: false, p2: false, p3: true },
  { label: "White-label", p1: false, p2: false, p3: true },
  { label: "Soporte prioritario", p1: false, p2: true, p3: true },
  { label: "Account manager", p1: false, p2: false, p3: true },
] as const;
