export const nelvyonNavLinks = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "SaaS", href: "/saas" },
  { label: "Precios", href: "/pricing" },
  { label: "Nosotros", href: "/nosotros" },
] as const;

export const nelvyonHero = {
  title:
    "NELVYON une SaaS, marketing, automatización e IA para hacer crecer negocios con orden.",
  subtitle:
    "Servicios profesionales y plataforma en un mismo sistema operativo: captación, CRM, automatizaciones y reporting sin saltar entre herramientas.",
  ctaPrimary: "Solicitar información",
  ctaSecondary: "Ver SaaS",
};

export const nelvyonServices = [
  {
    title: "SEO",
    href: "/seo",
    description: "Visibilidad orgánica, contenido y técnica alineados a demanda real.",
  },
  {
    title: "Publicidad",
    href: "/ads",
    description: "Campañas de adquisición con seguimiento y optimización continua.",
  },
  {
    title: "Branding",
    href: "/branding",
    description: "Identidad y mensaje coherentes en cada punto de contacto.",
  },
  {
    title: "Desarrollo Web",
    href: "/desarrollo-web",
    description: "Sitios y landings orientados a conversión y rendimiento.",
  },
  {
    title: "Ecommerce",
    href: "/ecommerce",
    description: "Tiendas y funnels de venta con operación conectada al CRM.",
  },
  {
    title: "Automatización",
    href: "/automatizacion",
    description: "Flujos entre marketing, ventas y operación para reducir trabajo manual.",
  },
] as const;

export const nelvyonSaasPlans = [
  {
    name: "Starter",
    forWho:
      "Equipos pequeños o fundadores que necesitan ordenar leads, clientes y tareas repetitivas.",
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
      "Con equipos en crecimiento y operaciones ya activas. El alcance se adapta al volumen de canales, integraciones y procesos que haya que ordenar.",
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
    "NELVYON centraliza marketing, ventas, automatización e IA en un sistema operativo para negocios modernos.",
  ctaTitle: nelvyonPageCtas.global,
  ctaHref: "/contacto",
  description:
    "Servicios profesionales y plataforma SaaS para ejecutar marketing, ventas y automatización con método.",
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
