import { HOME_COPY } from "@/components/agenforce/home-copy";

export const nelvyonNavLinks = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "SaaS", href: "/saas" },
  { label: "Precios", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Nosotros", href: "/nosotros" },
] as const;

export const nelvyonHero = {
  title: `${HOME_COPY.hero.titleBefore}${HOME_COPY.hero.titleAccent1}${HOME_COPY.hero.titleMid}${HOME_COPY.hero.titleAccent2}${HOME_COPY.hero.titleMid2}${HOME_COPY.hero.titleAccent3}${HOME_COPY.hero.titleEnd}`,
  subtitle: HOME_COPY.hero.subtitle,
  ctaPrimary: HOME_COPY.hero.ctaPrimary,
  ctaSecondary: HOME_COPY.hero.ctaSecondary,
};

export const nelvyonServices = HOME_COPY.servicios.items.map((service) => ({
  title: service.name,
  description: service.phrase,
}));

export const nelvyonSaasPlans = [
  {
    name: "Starter",
    subtitle: "Para equipos que comienzan a ordenar su operacion digital.",
    price: 97,
    currency: "EUR",
    billing: "/mes",
    cta: "Solicitar informacion",
    features: [
      "CRM base para leads y clientes",
      "Automatizaciones esenciales",
      "Panel operativo inicial",
      "Soporte por email",
    ],
  },
  {
    name: "Growth",
    subtitle: "Para empresas que escalan captacion y procesos internos.",
    price: 297,
    currency: "EUR",
    billing: "/mes",
    cta: "Solicitar informacion",
    features: [
      "CRM avanzado con pipelines",
      "Automatizaciones multi-canal",
      "Integraciones clave",
      "Revision estrategica mensual",
    ],
  },
  {
    name: "Elite",
    subtitle: "Operacion unificada para equipos con alta complejidad.",
    price: 797,
    currency: "EUR",
    billing: "/mes",
    cta: "Solicitar informacion",
    features: [
      "Arquitectura operativa completa",
      "Integraciones y flujos a medida",
      "Analitica y reporting ejecutivo",
      "Acompanamiento prioritario",
    ],
  },
] as const;

export const nelvyonFaq = [
  {
    question: "Que diferencia a NELVYON de una agencia tradicional?",
    answer:
      "NELVYON combina servicios profesionales con plataforma SaaS para que la estrategia y la ejecucion vivan en el mismo sistema operativo.",
  },
  {
    question: "Trabajan con empresas pequenas o solo con equipos grandes?",
    answer:
      "Trabajamos con empresas en crecimiento y operaciones consolidadas. Ajustamos alcance, roadmap y stack al momento operativo de cada negocio.",
  },
  {
    question: "Cuanto tarda la puesta en marcha?",
    answer:
      "La fase inicial suele completarse en 2 a 4 semanas, dependiendo del volumen de activos, integraciones y procesos actuales.",
  },
  {
    question: "Puedo contratar solo servicios sin plan SaaS?",
    answer:
      "Si. Puedes iniciar por servicios puntuales y evolucionar a una operacion integrada con nuestra plataforma cuando tenga sentido.",
  },
  {
    question: "Como gestionan soporte y seguimiento?",
    answer:
      "Definimos responsables, cadencia de revision y un panel compartido para seguimiento de acciones, resultados y prioridades.",
  },
] as const;

export const nelvyonAbout = {
  title: "Nosotros",
  intro:
    "NELVYON es un ecosistema de estrategia, marketing, automatizacion y tecnologia orientado a ejecucion real.",
  paragraphs: [
    "Unimos talento multidisciplinar y sistemas de trabajo claros para ayudar a empresas a crecer sin dispersar su operacion.",
    "Nuestra metodologia prioriza diagnostico, planificacion, implementacion y optimizacion continua con objetivos medibles.",
    "Sin humo, sin metricas infladas y sin promesas vacias: foco en impacto operativo y crecimiento sostenible.",
  ],
};

export const nelvyonFooter = {
  ctaTitle: "Centraliza marketing, ventas y operacion en NELVYON.",
  ctaHref: "/contacto",
  description:
    "Servicios profesionales y plataforma SaaS para ejecutar con metodo y escalar con control.",
  columns: {
    Producto: [
      { label: "SaaS", href: "/saas" },
      { label: "Precios", href: "/pricing" },
      { label: "Contacto", href: "/contacto" },
    ],
    Empresa: [
      { label: "Blog", href: "/blog" },
      { label: "Nosotros", href: "/nosotros" },
      { label: "Servicios", href: "/servicios" },
    ],
    Legal: [
      { label: "Privacidad", href: "/privacidad" },
      { label: "Terminos", href: "/terminos" },
    ],
  },
  copyright: `© ${new Date().getFullYear()} NELVYON. Todos los derechos reservados.`,
};

export const nelvyonContact = {
  email: "contacto@nelvyon.com",
  formAction: "https://formspree.io/f/xpwzgvbq",
};
