export const nelvyonNavLinks = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "SaaS", href: "/saas" },
  { label: "Precios", href: "/pricing" },
  { label: "Nosotros", href: "/nosotros" },
] as const;

export const nelvyonHero = {
  title:
    "NELVYON une SaaS, marketing, automatización e IA para construir sistemas digitales que ayudan a captar, vender y operar con más orden.",
  subtitle:
    "Diseñamos y conectamos web, CRM, campañas, automatizaciones y datos para que tu negocio dependa menos de procesos sueltos y tenga una operación más clara.",
  ctaPrimary: "Solicitar información",
  ctaSecondary: "Ver SaaS",
};

export const nelvyonServices = [
  {
    title: "Desarrollo Web",
    href: "/desarrollo-web",
    problem: "Tu web no transmite confianza ni convierte visitas en oportunidades.",
    solution: "Sitios y landings profesionales, rápidos y conectados a captación y CRM.",
    microcopy: "Presencia digital profesional y conversión.",
  },
  {
    title: "SEO",
    href: "/seo",
    problem: "Tu marca no aparece de forma constante cuando el cliente busca.",
    solution: "Estrategia orgánica, contenido y técnica para captación a largo plazo.",
    microcopy: "Visibilidad orgánica y demanda sostenida.",
  },
  {
    title: "Publicidad",
    href: "/ads",
    problem: "Inviertes en anuncios sin medir bien qué genera negocio.",
    solution: "Campañas estructuradas con seguimiento de coste, lead y calidad.",
    microcopy: "Captación inmediata con medición clara.",
  },
  {
    title: "Branding",
    href: "/branding",
    problem: "Tu marca se percibe genérica o inconsistente entre canales.",
    solution: "Identidad, mensaje y piezas que transmiten confianza y claridad.",
    microcopy: "Identidad, confianza y percepción premium.",
  },
  {
    title: "Automatización",
    href: "/automatizacion",
    problem: "El equipo pierde tiempo en tareas repetitivas de seguimiento.",
    solution: "Flujos que asignan, avisan y actualizan el CRM según reglas del negocio.",
    microcopy: "Ahorro de tiempo y seguimiento fiable.",
  },
  {
    title: "Ecommerce",
    href: "/ecommerce",
    problem: "La tienda vende pero el proceso post-compra y los datos están dispersos.",
    solution: "Funnel de compra, tracking y coordinación con campañas y operación.",
    microcopy: "Venta online con proceso claro.",
  },
] as const;

export const nelvyonSaasPlans = [
  {
    name: "Starter",
    forWho:
      "Equipos pequeños o fundadores que necesitan estructurar leads, clientes y tareas repetitivas.",
    subtitle: "Base operativa para empezar sin complejidad innecesaria.",
    price: 97,
    currency: "EUR",
    billing: "/mes",
    cta: "Solicitar información",
    features: [
      "CRM base: contactos, leads y seguimiento simple",
      "Automatizaciones esenciales (email y tareas)",
      "Panel operativo con vistas iniciales",
      "Soporte por email en horario laboral",
    ],
  },
  {
    name: "Growth",
    forWho:
      "Empresas en crecimiento que coordinan varios canales y necesitan pipelines claros.",
    subtitle: "Más capacidad de integración y seguimiento comercial.",
    price: 297,
    currency: "EUR",
    billing: "/mes",
    cta: "Solicitar información",
    features: [
      "CRM con pipelines y etapas personalizables",
      "Automatizaciones multi-canal (email, SMS, tareas)",
      "Integraciones con herramientas clave del stack",
      "Revisión operativa mensual con el equipo NELVYON",
    ],
  },
  {
    name: "Elite",
    forWho:
      "Operaciones con alta complejidad que requieren arquitectura a medida y acompañamiento cercano.",
    subtitle: "Capa completa para unificar marketing, ventas y automatización.",
    price: 797,
    currency: "EUR",
    billing: "/mes",
    cta: "Solicitar información",
    features: [
      "Arquitectura operativa y flujos a medida",
      "Integraciones avanzadas y APIs según alcance",
      "Reporting ejecutivo y cuadros de mando",
      "Acompañamiento prioritario y canal directo",
    ],
  },
] as const;

export const nelvyonFaq = [
  {
    question: "¿Qué diferencia a NELVYON de una agencia tradicional?",
    answer:
      "Combinamos ejecución de servicios con plataforma SaaS propia. La estrategia y la operación comparten el mismo entorno, no entregables desconectados.",
  },
  {
    question: "¿Trabajan con empresas pequeñas o solo con equipos grandes?",
    answer:
      "Con equipos en crecimiento y operaciones ya activas. El alcance se adapta al volumen de canales, integraciones y procesos a estructurar.",
  },
  {
    question: "¿Cuánto tarda la puesta en marcha?",
    answer:
      "Depende del alcance acordado, las integraciones existentes y el estado de tus activos. Lo definimos en el diagnóstico inicial, sin plazos genéricos.",
  },
  {
    question: "¿Puedo contratar solo servicios sin plan SaaS?",
    answer:
      "Sí. Puedes empezar por servicios puntuales y pasar a la plataforma cuando el volumen y la complejidad lo justifiquen.",
  },
  {
    question: "¿Cómo gestionan soporte y seguimiento?",
    answer:
      "Asignamos responsables, cadencia de revisión y un panel compartido para prioridades, entregables y siguientes pasos.",
  },
] as const;

export const nelvyonAbout = {
  title: "Nosotros",
  intro:
    "NELVYON es un ecosistema de estrategia, marketing, automatización y tecnología orientado a ejecución real.",
  paragraphs: [
    "Unimos talento multidisciplinar y sistemas de trabajo claros para que las empresas crezcan sin dispersar su operación.",
    "Trabajamos con diagnóstico, planificación, implementación y optimización continua, con objetivos acordados en cada fase.",
    "Sin humo ni promesas vacías: foco en procesos, continuidad operativa y decisiones con datos que ya tengas o puedas medir.",
  ],
};

export const nelvyonPageCtas = {
  home: "Solicitar información",
  servicios: "Hablemos de tu estrategia digital",
  saas: "Solicitar acceso a NELVYON SaaS",
  nosotros: "Construyamos tu sistema de crecimiento",
  contacto: "Enviar solicitud",
  global: "¿Quieres ordenar tu operación digital?",
} as const;

export const nelvyonFooter = {
  tagline:
    "SaaS, marketing, automatización e IA en un mismo partner para negocios que quieren operar con método.",
  ctaTitle: nelvyonPageCtas.global,
  ctaHref: "/contacto",
  description: "",
  mainLinks: [
    { label: "Home", href: "/" },
    { label: "Servicios", href: "/servicios" },
    { label: "SaaS", href: "/saas" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contacto", href: "/contacto" },
  ],
  legalLinks: [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Términos", href: "/terminos" },
    { label: "Legal", href: "/legal" },
  ],
  copyright: `© ${new Date().getFullYear()} NELVYON. Todos los derechos reservados.`,
};

export const nelvyonContact = {
  email: "contacto@nelvyon.com",
  formAction: "https://formspree.io/f/xpwzgvbq",
};

export function getNavbarCta(pathname: string): string {
  if (pathname === "/servicios" || pathname.startsWith("/seo") || pathname.startsWith("/ads") || pathname.startsWith("/branding") || pathname.startsWith("/contenido") || pathname.startsWith("/email-marketing") || pathname.startsWith("/desarrollo-web") || pathname.startsWith("/ecommerce") || pathname.startsWith("/automatizacion")) {
    return nelvyonPageCtas.servicios;
  }
  if (pathname === "/saas" || pathname === "/pricing") return nelvyonPageCtas.saas;
  if (pathname === "/nosotros") return nelvyonPageCtas.nosotros;
  if (pathname === "/contacto") return nelvyonPageCtas.contacto;
  return nelvyonPageCtas.home;
}
