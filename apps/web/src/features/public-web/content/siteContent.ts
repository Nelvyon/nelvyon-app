/**
 * Contenido tipado del sitio público NELVYON (ES-ES).
 * Fuente única de copy para páginas marketing, navegación y legal introductorio.
 */

export type NavLink = {
  readonly label: string;
  readonly href: string;
};

export type MegaNavGroup = {
  readonly id: string;
  readonly title: string;
  readonly links: readonly NavLink[];
};

export type CtaLink = {
  readonly label: string;
  readonly href: string;
};

export type ContentSection = {
  readonly heading: string;
  readonly body: string;
  readonly bullets?: readonly string[];
};

export type PageContentEntry = {
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly sections: readonly ContentSection[];
};

export type PricingPlan = {
  readonly id: string;
  readonly name: string;
  readonly priceMonthlyEur: number;
  readonly priceLabel: string;
  readonly period: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly featured: boolean;
  readonly badge?: string;
  readonly cta: CtaLink;
};

export type FaqItem = {
  readonly question: string;
  readonly answer: string;
};

export type SectorItem = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly outcomes: readonly string[];
};

export type IntegrationItem = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly summary: string;
  readonly connectivity: "nativo" | "webhook" | "api" | "infraestructura";
  readonly statusNote: string;
};

export type CaseStudy = {
  readonly id: string;
  readonly profileLabel: string;
  readonly industry: string;
  readonly challenge: string;
  readonly solution: string;
  readonly resultMetrics: readonly string[];
  readonly framingNote: string;
};

export type ResourceItem = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly href: string;
};

export type LegalBlurbEntry = {
  readonly title: string;
  readonly intro: string;
  readonly href: string;
};

export const siteBrand = {
  name: "NELVYON",
  tagline: "Agencia de marketing digital operada por IA y plataforma SaaS B2B",
  description:
    "Agencia de marketing digital operada por IA y plataforma SaaS B2B: CRM, campanas, workflows, packs OS y automatizacion enterprise.",
  contactEmail: "contact@nelvyon.com",
  supportEmail: "support@nelvyon.com",
} as const;

export type SiteBrand = typeof siteBrand;

export const mainNav = [
  { label: "Plataforma", href: "/plataforma" },
  { label: "Agencia", href: "/agencia" },
  { label: "Soluciones", href: "/soluciones" },
  { label: "Servicios", href: "/servicios" },
  { label: "Precios", href: "/precios" },
  { label: "Recursos", href: "/recursos" },
  { label: "Empresa", href: "/nosotros" },
] as const satisfies readonly NavLink[];

export type MainNavItem = (typeof mainNav)[number];

export const megaNav = [
  {
    id: "producto",
    title: "Producto",
    links: [
      { label: "Inicio", href: "/" },
      { label: "Plataforma", href: "/plataforma" },
      { label: "Agencia", href: "/agencia" },
      { label: "Automatizaciones IA", href: "/automatizaciones-ia" },
      { label: "Acceso SaaS", href: "/saas" },
      { label: "Iniciar sesión", href: "/login" },
      { label: "Precios", href: "/precios" },
    ],
  },
  {
    id: "soluciones",
    title: "Soluciones",
    links: [
      { label: "Soluciones", href: "/soluciones" },
      { label: "Servicios", href: "/servicios" },
      { label: "Sectores", href: "/sectores" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "Integraciones", href: "/integraciones" },
      { label: "Casos de éxito", href: "/casos-de-exito" },
    ],
  },
  {
    id: "empresa",
    title: "Empresa",
    links: [
      { label: "Nosotros", href: "/nosotros" },
      { label: "Contacto", href: "/contacto" },
      { label: "Estado del servicio", href: "/status" },
      { label: "Seguridad", href: "/seguridad" },
    ],
  },
  {
    id: "recursos",
    title: "Recursos",
    links: [
      { label: "Centro de recursos", href: "/recursos" },
      { label: "Blog", href: "/blog" },
      { label: "Preguntas frecuentes", href: "/faq" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    links: [
      { label: "Aviso legal", href: "/aviso-legal" },
      { label: "Privacidad", href: "/privacidad" },
      { label: "Cookies", href: "/cookies" },
      { label: "Términos", href: "/terminos" },
      { label: "Acuerdo de tratamiento (DPA)", href: "/legal/dpa" },
      { label: "Subprocesadores", href: "/legal/subprocessors" },
    ],
  },
] as const satisfies readonly MegaNavGroup[];

export type MegaNav = typeof megaNav;

export const homeContent = {
  hero: {
    eyebrow: "Agencia IA + SaaS B2B",
    titleLines: [
      "Marketing digital ejecutado por IA.",
      "Operación comercial en una sola plataforma.",
    ] as const,
    subtitle:
      "NELVYON une agencia autónoma y software enterprise: CRM, campañas, workflows, packs OS y automatización con control, trazabilidad y resultados medibles.",
    primaryCta: { label: "Solicitar demo", href: "/contacto" } satisfies CtaLink,
    secondaryCta: { label: "Ver plataforma", href: "/plataforma" } satisfies CtaLink,
  },
  pillars: [
    {
      title: "Agencia operada por IA",
      body: "Packs de marketing ejecutados por agentes especializados con revisión de calidad y flujo de aprobación.",
    },
    {
      title: "Plataforma SaaS B2B",
      body: "CRM, campañas, inbox, pipeline y billing en un entorno multi-tenant con autenticación y roles.",
    },
    {
      title: "Workflows con idempotencia",
      body: "Automatizaciones programadas y por disparador diseñadas para continuidad operativa sin duplicados.",
    },
    {
      title: "Packs OS autónomos",
      body: "Crecimiento local, ecommerce y SaaS B2B con orquestación, entregables y portal cliente.",
    },
    {
      title: "Automatización enterprise",
      body: "Integraciones nativas y por webhook, observabilidad y criterios de seguridad para equipos exigentes.",
    },
    {
      title: "Gobierno y trazabilidad",
      body: "Estados, métricas y auditoría de ejecución para que la dirección vea qué se hizo, cuándo y con qué resultado.",
    },
  ] as const,
  platformLayers: [
    {
      title: "Capa SaaS",
      body: "CRM, campañas email, workflows, billing Stripe y operación diaria del equipo comercial y de marketing.",
    },
    {
      title: "Capa OS",
      body: "Motor de packs de marketing con agentes IA, kickoff, QA y auto-aprobación según umbrales de calidad.",
    },
    {
      title: "Capa Portal",
      body: "Portal cliente para revisar y aprobar entregables con continuidad entre agencia, plataforma y negocio.",
    },
  ] as const,
  capabilities: [
    {
      title: "CRM y pipeline",
      body: "Gestión de contactos, etapas y seguimiento comercial con contexto de campañas y automatizaciones.",
    },
    {
      title: "Campañas y email",
      body: "Envío con AWS SES, manejo de bounces y tracking de apertura/clic con secretos HMAC.",
    },
    {
      title: "Workflows",
      body: "Motor de flujos programados y por evento con protecciones de idempotencia para entornos reales.",
    },
    {
      title: "Packs de crecimiento",
      body: "Orquestación de entregables SEO, landing, chatbot y más, con reporting orientado a dirección.",
    },
    {
      title: "Billing y planes",
      body: "Stripe conectado al plan del tenant para escalar Starter, Growth o Elite según la operación.",
    },
    {
      title: "Portal y aprobación",
      body: "Revisión cliente de entregables con trazabilidad entre ejecución IA y decisión humana.",
    },
  ] as const,
  sectorsPreview: [
    {
      title: "Negocios locales",
      body: "Captación, reputación y conversión con packs orientados a demanda cercana y seguimiento comercial.",
    },
    {
      title: "Ecommerce",
      body: "Adquisición, retención y automatización de catálogo a campaña con foco en margen y recurrencia.",
    },
    {
      title: "SaaS B2B",
      body: "Pipeline, nurturing y contenido orientado a ciclo de venta consultivo y expansión de cuentas.",
    },
    {
      title: "Enterprise",
      body: "Gobierno, seguridad, integraciones y operación multi-equipo con criterios de continuidad.",
    },
  ] as const,
  proofStats: [
    {
      value: "3",
      label: "Capas de producto",
      detail: "SaaS, OS de packs y portal cliente en una arquitectura unificada.",
    },
    {
      value: "24/7",
      label: "Ejecución operativa",
      detail: "Agentes y workflows diseñados para continuidad, no solo demos puntuales.",
    },
    {
      value: "QA ≥ 85",
      label: "Umbral de calidad",
      detail: "Auto-aprobación de entregables cuando la revisión de calidad alcanza el criterio definido.",
    },
    {
      value: "€97–€797",
      label: "Planes SaaS",
      detail: "Starter, Growth y Elite alineados a escala de operación, sin inventar métricas de clientes.",
    },
  ] as const,
  faqPreview: [
    {
      question: "¿NELVYON es una agencia o un software?",
      answer:
        "Ambas capas: agencia de marketing digital operada por IA y plataforma SaaS B2B para CRM, campañas, workflows y packs OS.",
    },
    {
      question: "¿Qué incluye la plataforma SaaS?",
      answer:
        "Módulos operativos de CRM, campañas, workflows, pipeline, inbox y billing, con autenticación por tenant y despliegue pensado para producción.",
    },
    {
      question: "¿Cómo funcionan los packs OS?",
      answer:
        "Un kickoff lanza la orquestación de agentes; se generan entregables, pasan control de calidad y pueden auto-aprobarse o revisarse en el portal.",
    },
    {
      question: "¿Los precios son mensuales?",
      answer:
        "Sí. Los planes Starter (€97), Growth (€297) y Elite (€797) se facturan mensualmente según el alcance de la operación.",
    },
    {
      question: "¿Dónde puedo ver seguridad y legal?",
      answer:
        "En Seguridad, Privacidad, Términos, Cookies, Aviso legal, DPA y Subprocesadores — rutas públicas del sitio con documentación formal.",
    },
  ] as const,
  cta: {
    title: "Ponga orden en marketing y ventas con un sistema real",
    body: "Hable con el equipo para evaluar su operación, el plan adecuado y el camino de activación de plataforma y packs.",
    primaryCta: { label: "Hablar con NELVYON", href: "/contacto" } satisfies CtaLink,
    secondaryCta: { label: "Ver precios", href: "/precios" } satisfies CtaLink,
  },
} as const;

export type HomeContent = typeof homeContent;

export const pageContent = {
  plataforma: {
    title: "Plataforma NELVYON",
    eyebrow: "SaaS B2B",
    description:
      "El sistema operativo comercial y de marketing: CRM, campañas, workflows, billing y reporting en un entorno multi-tenant.",
    seoTitle: "Plataforma SaaS B2B | NELVYON",
    seoDescription:
      "Conozca la plataforma NELVYON: CRM, campañas, workflows, packs OS y automatización enterprise para equipos B2B.",
    sections: [
      {
        heading: "Una operación unificada",
        body: "Deje de repartir leads, campañas y seguimiento entre herramientas desconectadas. La capa SaaS centraliza el día a día del equipo.",
        bullets: [
          "CRM y pipeline con contexto de campañas",
          "Email y workflows con controles de producción",
          "Billing Stripe alineado al plan del tenant",
        ],
      },
      {
        heading: "Diseñada para continuidad",
        body: "Las rutas críticas leen estado real de base de datos, con autenticación por cookies httpOnly y separación de contextos SaaS y plataforma.",
      },
      {
        heading: "Puente hacia la agencia IA",
        body: "La misma organización puede operar software y lanzar packs OS, con portal de revisión para entregables generados por agentes.",
      },
    ],
  },
  agencia: {
    title: "Agencia operada por IA",
    eyebrow: "Ejecución autónoma",
    description:
      "Marketing digital ejecutado por agentes especializados, con orquestación de packs, control de calidad y aprobación cliente.",
    seoTitle: "Agencia de marketing IA | NELVYON",
    seoDescription:
      "Agencia NELVYON: packs de crecimiento, agentes IA, QA y portal cliente para marketing digital con trazabilidad.",
    sections: [
      {
        heading: "Packs de crecimiento",
        body: "Orquestación de entregables para negocios locales, ecommerce y SaaS B2B, con SKUs autónomos y reporting orientado a dirección.",
        bullets: [
          "Kickoff con parámetros de negocio",
          "Entregables con umbral de calidad",
          "Portal para revisión y aprobación",
        ],
      },
      {
        heading: "Humano donde aporta",
        body: "La IA ejecuta a escala; el gobierno, los criterios de marca y las decisiones estratégicas permanecen bajo control del cliente y del equipo NELVYON.",
      },
      {
        heading: "Sin teatro de demos",
        body: "La propuesta se apoya en APIs, migraciones y flujos reales — no en mockups estáticos presentados como producto.",
      },
    ],
  },
  "automatizaciones-ia": {
    title: "Automatizaciones IA",
    eyebrow: "Workflows + agentes",
    description:
      "Flujos programados, disparadores y orquestación de packs para conectar CRM, email, canales y entregables de marketing.",
    seoTitle: "Automatizaciones IA | NELVYON",
    seoDescription:
      "Automatice marketing y ventas con workflows NELVYON, packs OS e integraciones nativas o por webhook.",
    sections: [
      {
        heading: "Motor de workflows",
        body: "Automatizaciones con idempotencia para evitar ejecuciones duplicadas en ventanas cortas y mantener fiabilidad en producción.",
        bullets: [
          "Programación temporal y por evento",
          "Integración con campañas y CRM",
          "Señales operativas para soporte y ops",
        ],
      },
      {
        heading: "Orquestación de packs",
        body: "Los packs OS coordinan agentes especializados, generan entregables y aplican umbrales de calidad antes de la entrega.",
      },
      {
        heading: "Integración con su stack",
        body: "Stripe, AWS SES, Twilio, canales publicitarios y webhooks permiten encajar NELVYON en el ecosistema existente sin reescrituras innecesarias.",
      },
    ],
  },
  soluciones: {
    title: "Soluciones NELVYON",
    eyebrow: "Por objetivo de negocio",
    description:
      "Arquitecturas de solución para captación, conversión, retención y operación enterprise — con plataforma y agencia IA.",
    seoTitle: "Soluciones de marketing y SaaS | NELVYON",
    seoDescription:
      "Soluciones NELVYON para crecimiento local, ecommerce, SaaS B2B y enterprise con CRM, campañas y packs IA.",
    sections: [
      {
        heading: "Crecimiento medible",
        body: "Cada solución combina módulos SaaS y, cuando aplica, packs OS para ejecutar marketing con trazabilidad de entregables.",
        bullets: [
          "Captación y nurturing",
          "Pipeline y seguimiento comercial",
          "Automatización de operación recurrente",
        ],
      },
      {
        heading: "Ajuste por sector",
        body: "Los patrones de activación cambian entre negocio local, ecommerce y B2B; el catálogo de sectores detalla outcomes esperables.",
      },
      {
        heading: "Enterprise ready",
        body: "Seguridad, DPA, subprocesadores y criterios de despliegue para organizaciones con requisitos de cumplimiento y continuidad.",
      },
    ],
  },
  "servicios-overview": {
    title: "Servicios",
    eyebrow: "Catálogo operativo",
    description:
      "Servicios de marketing y operación digital ejecutados con IA y gobernados desde la plataforma NELVYON.",
    seoTitle: "Servicios de marketing IA | NELVYON",
    seoDescription:
      "SEO, publicidad, contenido, email, CRM, automatización y más: servicios NELVYON con ejecución IA y control SaaS.",
    sections: [
      {
        heading: "Ejecución + software",
        body: "Los servicios no viven aislados: se conectan a CRM, campañas, workflows y packs para que el resultado sea operable, no solo un entregable suelto.",
        bullets: [
          "SEO y contenidos con continuidad editorial",
          "Publicidad y creatividades orientadas a ROAS",
          "Email, CRM y automatización en el mismo sistema",
        ],
      },
      {
        heading: "Packs y especialidades",
        body: "Además del hub de servicios, los packs OS concentran entregables de crecimiento con orquestación y portal de aprobación.",
      },
      {
        heading: "Activación clara",
        body: "Contacto comercial para alcance, plan SaaS adecuado y secuencia de kickoff — sin promesas de canales no conectados en producción.",
      },
    ],
  },
  sectores: {
    title: "Sectores",
    eyebrow: "Patrones de activación",
    description:
      "Enfoques de solución por tipo de negocio: locales, ecommerce, SaaS B2B, servicios profesionales y más.",
    seoTitle: "Sectores y verticales | NELVYON",
    seoDescription:
      "Cómo NELVYON aplica plataforma y packs IA a negocios locales, ecommerce, SaaS B2B y operaciones enterprise.",
    sections: [
      {
        heading: "Mismo sistema, distinta priorización",
        body: "La plataforma es común; cambian KPIs, mensajes, cadencia de campañas y packs recomendados según el sector.",
      },
      {
        heading: "Outcomes operativos",
        body: "Cada vertical enumera resultados esperables en términos de capacidad (pipeline, retención, automatización), no de logos inventados.",
      },
    ],
  },
  enterprise: {
    title: "NELVYON Enterprise",
    eyebrow: "Gobierno y escala",
    description:
      "Operación multi-equipo, seguridad, integraciones y continuidad para organizaciones que exigen control y evidencia.",
    seoTitle: "Enterprise | NELVYON",
    seoDescription:
      "NELVYON Enterprise: seguridad, DPA, subprocesadores, automatización y plataforma B2B para operaciones exigentes.",
    sections: [
      {
        heading: "Control y segregación",
        body: "Contextos de autenticación SaaS y plataforma, tenants aislados y prácticas de despliegue orientadas a producción.",
        bullets: [
          "JWT y cookies httpOnly en SaaS",
          "Secretos de tracking y cron protegidos",
          "Migraciones versionadas en Postgres",
        ],
      },
      {
        heading: "Cumplimiento y transparencia",
        body: "Documentación de privacidad, términos, cookies, DPA y subprocesadores disponible en rutas legales públicas.",
      },
      {
        heading: "Integración con su stack",
        body: "APIs, webhooks e integraciones nativas selectas para encajar facturación, email, voz y canales sin deuda oculta.",
      },
    ],
  },
  integraciones: {
    title: "Integraciones",
    eyebrow: "Ecosistema conectado",
    description:
      "Conexiones nativas, API e infraestructura — con honestidad sobre qué está integrado de forma directa y qué vía webhook.",
    seoTitle: "Integraciones | NELVYON",
    seoDescription:
      "Stripe, AWS SES, Twilio, Google, Meta, WhatsApp, Slack, webhooks, Postgres, Railway e IA privada compatible OpenAI.",
    sections: [
      {
        heading: "Nativo frente a webhook",
        body: "Publicamos el modo de conectividad de cada integración para evitar expectativas de conectores fantasma.",
      },
      {
        heading: "Infraestructura de confianza",
        body: "Postgres 16 y despliegue Railway forman la base de datos y runtime del producto en el target de producción documentado.",
      },
    ],
  },
  "casos-de-exito": {
    title: "Perfiles de proyecto",
    eyebrow: "Patrones anonimizados",
    description:
      "Casos tipo basados en perfiles de proyecto — no en marcas inventadas ni logos de clientes ficticios.",
    seoTitle: "Casos y perfiles de proyecto | NELVYON",
    seoDescription:
      "Perfiles de proyecto NELVYON: retos, soluciones y rangos de resultado orientativos por industria, sin clientes fabricados.",
    sections: [
      {
        heading: "Transparencia metodológica",
        body: "Los resultados se expresan como rangos de capacidad o outcomes típicos de implementación, no como métricas atribuidas a empresas nombradas.",
      },
      {
        heading: "Úselos como referencia",
        body: "Sirven para alinear alcance en discovery; el plan real se define tras diagnóstico de operación y datos.",
      },
    ],
  },
  recursos: {
    title: "Recursos",
    eyebrow: "Documentación y soporte",
    description:
      "Guías, FAQ, seguridad, estado del servicio y contacto para equipos que evalúan o operan NELVYON.",
    seoTitle: "Recursos | NELVYON",
    seoDescription:
      "Centro de recursos NELVYON: blog, FAQ, seguridad, DPA, estado del servicio y contacto.",
    sections: [
      {
        heading: "Todo lo necesario para decidir",
        body: "Desde preguntas frecuentes hasta documentación legal y de seguridad, sin diluir el mensaje comercial con relleno genérico.",
      },
    ],
  },
  faq: {
    title: "Preguntas frecuentes",
    eyebrow: "FAQ",
    description:
      "Respuestas claras sobre producto, precios, packs, seguridad e integración — tono enterprise, sin jerga vacía.",
    seoTitle: "Preguntas frecuentes | NELVYON",
    seoDescription:
      "FAQ NELVYON: agencia IA, plataforma SaaS, precios Starter/Growth/Elite, packs OS, seguridad e integraciones.",
    sections: [
      {
        heading: "Antes de hablar con ventas",
        body: "Consulte las doce preguntas frecuentes del sitio; si necesita detalle contractual o de seguridad, use las rutas legales y de contacto.",
      },
    ],
  },
  contacto: {
    title: "Contacto",
    eyebrow: "Hable con el equipo",
    description:
      "Solicite demo, evaluación de plan o soporte sobre activación de plataforma y packs. Email principal: contact@nelvyon.com.",
    seoTitle: "Contacto | NELVYON",
    seoDescription:
      "Contacte con NELVYON para demo, precios o activación. Email: contact@nelvyon.com. Soporte: support@nelvyon.com.",
    sections: [
      {
        heading: "Canales",
        body: "Use el formulario de contacto o escriba a contact@nelvyon.com. Para incidencias de cuenta o plataforma, support@nelvyon.com.",
        bullets: [
          "Demo y discovery comercial",
          "Alcance de packs y enterprise",
          "Soporte a clientes activos",
        ],
      },
      {
        heading: "Qué preparar",
        body: "Sector, tamaño del equipo, stack actual y objetivo prioritario (captación, retención, automatización o gobierno) aceleran la propuesta.",
      },
    ],
  },
  "aviso-legal": {
    title: "Aviso legal",
    eyebrow: "Información societaria",
    description:
      "Datos identificativos y condiciones de uso informativo del sitio público NELVYON. Consulte la página legal completa.",
    seoTitle: "Aviso legal | NELVYON",
    seoDescription:
      "Aviso legal del sitio NELVYON: información societaria y condiciones de uso informativo.",
    sections: [
      {
        heading: "Ámbito",
        body: "Este aviso identifica al titular del sitio y el carácter informativo de los contenidos públicos. El texto íntegro está en /aviso-legal.",
      },
      {
        heading: "Relación con otros documentos",
        body: "Privacidad, cookies, términos, DPA y subprocesadores completan el marco legal aplicable a usuarios y clientes.",
      },
    ],
  },
  seguridad: {
    title: "Seguridad",
    eyebrow: "Prácticas de producto",
    description:
      "Autenticación, secretos, segregación de tenants y controles operativos orientados a entornos de producción.",
    seoTitle: "Seguridad | NELVYON",
    seoDescription:
      "Seguridad NELVYON: autenticación, secretos, Postgres, despliegue y transparencia sobre subprocesadores.",
    sections: [
      {
        heading: "Controles de acceso",
        body: "JWT en cookies httpOnly para SaaS, claims de plataforma para OS/portal y protección de crons y webhooks con secretos de entorno.",
        bullets: [
          "Sin secretos hardcodeados en código de producto",
          "Separación de contextos SaaS y plataforma",
          "Variables de entorno documentadas para producción",
        ],
      },
      {
        heading: "Datos e infraestructura",
        body: "Postgres 16 con migraciones versionadas; despliegue target en Railway. Detalle de encargados en subprocesadores y DPA.",
      },
      {
        heading: "Reporte responsable",
        body: "Para hallazgos de seguridad, contacte a support@nelvyon.com o contact@nelvyon.com con descripción reproducible y sin explotación activa.",
      },
    ],
  },
  subprocessors: {
    title: "Subprocesadores",
    eyebrow: "Transparencia",
    description:
      "Listado introductorio de categorías de subprocesadores. El detalle formal vive en /legal/subprocessors.",
    seoTitle: "Subprocesadores | NELVYON",
    seoDescription:
      "Subprocesadores NELVYON: categorías de infraestructura, email, pagos e IA. Página legal completa en /legal/subprocessors.",
    sections: [
      {
        heading: "Categorías típicas",
        body: "Infraestructura de hosting y base de datos, email transaccional, pagos, comunicaciones y proveedores de modelos de IA según configuración del entorno.",
        bullets: [
          "Hosting y Postgres (p. ej. Railway)",
          "Email (AWS SES)",
          "Pagos (Stripe)",
          "IA y canales según activación",
        ],
      },
      {
        heading: "Actualizaciones",
        body: "La página legal de subprocesadores es la fuente de verdad contractual; este contenido de marketing solo orienta.",
      },
    ],
  },
  "saas-acceso": {
    title: "Acceso a la plataforma SaaS",
    eyebrow: "Clientes y equipos",
    description:
      "Entre en el entorno SaaS NELVYON para CRM, campañas, workflows y operación diaria. Registro y login según su tenant.",
    seoTitle: "Acceso SaaS | NELVYON",
    seoDescription:
      "Acceda a la plataforma SaaS NELVYON: login, planes Starter/Growth/Elite y operación de marketing y ventas.",
    sections: [
      {
        heading: "Para clientes activos",
        body: "Use /login o /saas según el flujo de su cuenta. El plan del tenant determina módulos y límites operativos.",
        bullets: [
          "Starter desde €97/mes",
          "Growth €297/mes — operación completa recomendada",
          "Elite €797/mes — escala e integraciones ampliadas",
        ],
      },
      {
        heading: "¿Aún no es cliente?",
        body: "Solicite demo en /contacto o revise /precios y /plataforma antes de activar. Soporte: support@nelvyon.com.",
      },
    ],
  },
} as const satisfies Record<string, PageContentEntry>;

export type PageContentSlug = keyof typeof pageContent;
export type PageContent = typeof pageContent;

export const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    priceMonthlyEur: 97,
    priceLabel: "€97",
    period: "/mes",
    description: "Centralice marketing, CRM y reporting con orden operativo desde el primer día.",
    features: [
      "Dashboard unificado",
      "CRM y pipeline esencial",
      "Email básico (AWS SES cuando esté configurado)",
      "1 canal publicitario en alcance inicial",
      "1 usuario",
      "Soporte por email",
    ],
    featured: false,
    cta: { label: "Empezar con Starter", href: "/contacto" },
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthlyEur: 297,
    priceLabel: "€297",
    period: "/mes",
    description: "Operación completa con automatización, multi-canal y soporte prioritario.",
    features: [
      "Todo lo de Starter",
      "Meta + Google (+ alcance multi-canal según activación)",
      "CRM integrado y workflows",
      "Automatización con idempotencia",
      "Hasta 5 usuarios",
      "Soporte prioritario",
      "Acceso a packs OS según acuerdo",
    ],
    featured: true,
    badge: "Recomendado",
    cta: { label: "Elegir Growth", href: "/contacto" },
  },
  {
    id: "elite",
    name: "Elite",
    priceMonthlyEur: 797,
    priceLabel: "€797",
    period: "/mes",
    description: "Escala enterprise: módulos avanzados, integraciones ampliadas y acompañamiento estratégico.",
    features: [
      "Todo lo de Growth",
      "Canales y usuarios ampliados",
      "CRM y reporting avanzados",
      "Integraciones y webhooks prioritarios",
      "Gobierno y criterios enterprise",
      "Account manager",
    ],
    featured: false,
    cta: { label: "Hablar de Elite", href: "/contacto" },
  },
] as const satisfies readonly PricingPlan[];

export type PricingPlanId = (typeof pricingPlans)[number]["id"];

export const faqItems = [
  {
    question: "¿Qué es NELVYON exactamente?",
    answer:
      "NELVYON es una agencia de marketing digital operada por inteligencia artificial y, a la vez, una plataforma SaaS B2B con CRM, campañas, workflows, packs OS y automatización enterprise.",
  },
  {
    question: "¿Puedo usar solo la plataforma sin la agencia?",
    answer:
      "Sí. Puede operar la capa SaaS de forma autónoma. Los packs OS y la ejecución de agencia se activan cuando encajan con su plan y acuerdo de servicio.",
  },
  {
    question: "¿Cuáles son los planes y precios?",
    answer:
      "Starter €97/mes, Growth €297/mes y Elite €797/mes. El detalle de alcance está en /precios; el plan concreto del tenant se refleja en billing tras Stripe.",
  },
  {
    question: "¿Hay permanencia?",
    answer:
      "Los planes SaaS se presentan sin permanencia forzosa en la comunicación comercial estándar; condiciones contractuales específicas de enterprise o packs pueden acordarse por escrito.",
  },
  {
    question: "¿Cómo se envían las campañas de email?",
    answer:
      "Mediante AWS SES cuando las credenciales y el remitente verificado están configurados. Sin esa configuración, la UI advierte; no se simula un envío exitoso en silencio.",
  },
  {
    question: "¿Qué son los packs OS?",
    answer:
      "Unidades de ejecución de marketing orquestadas por agentes (por ejemplo crecimiento local, ecommerce o SaaS B2B), con kickoff, entregables, QA y flujo de aprobación en portal.",
  },
  {
    question: "¿La auto-aprobación elimina siempre la revisión humana?",
    answer:
      "No. Existe un umbral de calidad (p. ej. QA ≥ 85) que puede auto-aprobar; por debajo, o según política del cliente, la revisión humana o de portal sigue siendo el camino.",
  },
  {
    question: "¿NELVYON sustituye a HubSpot u otras suites?",
    answer:
      "Puede centralizar CRM, campañas y workflows en NELVYON. La sincronización tipo HubSpot se contempla vía API/webhook de forma honesta: no afirmamos un conector nativo completo salvo que esté implementado en su entorno.",
  },
  {
    question: "¿Dónde se alojan los datos?",
    answer:
      "El target de producción documentado usa Postgres 16 en infraestructura Railway, con migraciones versionadas. Consulte DPA y subprocesadores para el marco de tratamiento.",
  },
  {
    question: "¿Ofrecen SLA y seguridad enterprise?",
    answer:
      "Hay documentación de seguridad, DPA y subprocesadores. Los SLA numéricos y anexos de seguridad formales se acuerdan en contratos Enterprise — solicítelos en contacto.",
  },
  {
    question: "¿Cómo accedo al producto?",
    answer:
      "Clientes activos vía /login o /saas. Si aún no tiene cuenta, use /contacto o /precios para iniciar el alta.",
  },
  {
    question: "¿En qué idioma opera el sitio y el soporte?",
    answer:
      "El sitio público está en español de España con tono profesional. El soporte operativo responde en español; otros idiomas pueden acordarse según cuenta.",
  },
] as const satisfies readonly FaqItem[];

export type FaqItemEntry = (typeof faqItems)[number];

export const sectorItems = [
  {
    id: "negocios-locales",
    title: "Negocios locales",
    summary:
      "Captación de demanda cercana, reputación y conversión a cita o venta, con seguimiento en CRM.",
    outcomes: [
      "Presencia y captación local coherente",
      "Pipeline de leads con seguimiento",
      "Automatizaciones de recordatorio y nurturing",
    ],
  },
  {
    id: "ecommerce",
    title: "Ecommerce",
    summary:
      "Adquisición, retención y operación de campañas conectadas a catálogo y márgenes.",
    outcomes: [
      "Campañas y creatividades orientadas a conversión",
      "Flujos de recuperación y retención",
      "Reporting operable para marketing y dirección",
    ],
  },
  {
    id: "saas-b2b",
    title: "SaaS B2B",
    summary:
      "Ciclo de venta consultivo: pipeline, contenidos, nurturing y expansión de cuentas.",
    outcomes: [
      "CRM alineado a etapas B2B",
      "Nurturing y campañas por segmento",
      "Packs de crecimiento SaaS cuando apliquen",
    ],
  },
  {
    id: "servicios-profesionales",
    title: "Servicios profesionales",
    summary:
      "Despachos y firmas que necesitan demanda cualificada y operación comercial ordenada.",
    outcomes: [
      "Cualificación de leads",
      "Contenido y SEO con voz profesional",
      "Seguimiento sin depender de hojas sueltas",
    ],
  },
  {
    id: "salud-bienestar",
    title: "Salud y bienestar",
    summary:
      "Clínicas y centros con necesidad de captación ética, citas y comunicación recurrente.",
    outcomes: [
      "Captación con mensajes claros y conformes",
      "Automatización de recordatorios",
      "Visibilidad de funnel en CRM",
    ],
  },
  {
    id: "enterprise-multiunidad",
    title: "Enterprise y multi-unidad",
    summary:
      "Organizaciones con varios equipos o marcas que exigen gobierno, seguridad e integraciones.",
    outcomes: [
      "Roles y tenants con segregación",
      "Integraciones y webhooks controlados",
      "Marco legal y de seguridad documentado",
    ],
  },
] as const satisfies readonly SectorItem[];

export type SectorItemId = (typeof sectorItems)[number]["id"];

export const integrationItems = [
  {
    id: "stripe",
    name: "Stripe",
    category: "Pagos y billing",
    summary: "Checkout y webhooks de suscripción que actualizan el plan del tenant en base de datos.",
    connectivity: "nativo",
    statusNote: "Integración nativa de billing SaaS cuando las claves y price IDs están configurados.",
  },
  {
    id: "aws-ses",
    name: "AWS SES",
    category: "Email",
    summary: "Envío de campañas y mensajes transaccionales con remitente verificado y manejo de bounces.",
    connectivity: "nativo",
    statusNote: "Nativo; sin SES configurado la UI advierte en lugar de fingir envíos.",
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "Voz y mensajería",
    summary: "Capacidad de voz/SMS según módulos activados en el entorno; requiere credenciales operativas.",
    connectivity: "api",
    statusNote: "API; la activación plena depende de configuración ops (no asumir canal live sin credenciales).",
  },
  {
    id: "google",
    name: "Google",
    category: "Publicidad y datos",
    summary: "Alcance publicitario y propiedades Google según conectores y cuentas enlazadas por el cliente.",
    connectivity: "api",
    statusNote: "Vía API/OAuth de cuenta; no se presenta como conector mágico sin autorización del anunciante.",
  },
  {
    id: "meta",
    name: "Meta",
    category: "Publicidad y social",
    summary: "Campañas y activos Meta dentro del alcance de canales del plan y de las cuentas autorizadas.",
    connectivity: "api",
    statusNote: "API/OAuth; el alcance real depende de permisos de Business Manager del cliente.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    category: "Mensajería",
    summary: "Conversaciones orientadas a CRM e inbox cuando el canal está aprovisionado.",
    connectivity: "api",
    statusNote: "Canal API; límites y plantillas dependen del proveedor y del plan (p. ej. cupos en Starter).",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Colaboración",
    summary: "Notificaciones operativas a canales de equipo mediante webhooks o apps autorizadas.",
    connectivity: "webhook",
    statusNote: "Principalmente webhook/app; útil para alertas de workflows y ops.",
  },
  {
    id: "zapier-webhooks",
    name: "Zapier / Webhooks",
    category: "Automatización externa",
    summary: "Entrada y salida de eventos hacia herramientas de terceros sin conector propietario por cada SaaS.",
    connectivity: "webhook",
    statusNote: "Webhook/API genérica — la vía honesta para la mayoría de herramientas long-tail.",
  },
  {
    id: "postgres",
    name: "Postgres",
    category: "Datos",
    summary: "Base de datos primaria del producto con migraciones SQL versionadas.",
    connectivity: "infraestructura",
    statusNote: "Infraestructura nativa del sistema (Postgres 16), no un conector cosmético.",
  },
  {
    id: "railway",
    name: "Railway",
    category: "Infraestructura",
    summary: "Target de despliegue de aplicación y base de datos en el entorno de producción documentado.",
    connectivity: "infraestructura",
    statusNote: "Plataforma de hosting/runtime del producto; no es una integración de marketing superficial.",
  },
  {
    id: "openai-compatible",
    name: "IA privada compatible OpenAI",
    category: "Inteligencia artificial",
    summary: "Agentes y generación vía endpoints compatibles con la API OpenAI, incluyendo despliegues privados.",
    connectivity: "api",
    statusNote: "API configurable; el proveedor concreto depende del entorno (no hay dependencia de una sola marca en el copy).",
  },
  {
    id: "crm-sync",
    name: "Sincronización CRM (tipo HubSpot)",
    category: "CRM externo",
    summary: "Intercambio de contactos y etapas con CRMs externos mediante API o webhooks, según proyecto.",
    connectivity: "webhook",
    statusNote: "No se afirma un espejo nativo completo tipo marketplace; sync vía API/webhook según alcance acordado.",
  },
] as const satisfies readonly IntegrationItem[];

export type IntegrationItemId = (typeof integrationItems)[number]["id"];

export const caseStudies = [
  {
    id: "perfil-local-captacion",
    profileLabel: "Perfil de proyecto A — Captación local",
    industry: "Servicios locales / multi-sede pequeña",
    challenge:
      "Leads repartidos entre formularios, WhatsApp y hojas de cálculo; sin seguimiento homogéneo ni reporting semanal fiable.",
    solution:
      "Activación de CRM + campañas email + automatizaciones de seguimiento, con pack de crecimiento local cuando procede.",
    resultMetrics: [
      "Ejemplo de capacidad: consolidar 100% de leads entrantes en un solo pipeline",
      "Rango orientativo: reducción del tiempo de primer contacto a horas en lugar de días",
      "Outcome típico: visibilidad semanal de tasas de cita/cierre por fuente",
    ],
    framingNote:
      "Métricas expresadas como rangos de capacidad / outcomes de implementación, no como resultados de un cliente con nombre propio.",
  },
  {
    id: "perfil-ecommerce-retencion",
    profileLabel: "Perfil de proyecto B — Ecommerce y retención",
    industry: "Ecommerce D2C",
    challenge:
      "Adquisición cara y retención débil; creatividades y secuencias desconectadas del catálogo y del margen.",
    solution:
      "Campañas y workflows de recuperación, reporting unificado y pack ecommerce para entregables de crecimiento con QA.",
    resultMetrics: [
      "Ejemplo de capacidad: secuencias de recuperación y post-compra operativas en la misma plataforma",
      "Rango orientativo: mejora de recurrencia cuando el flujo de retención deja de ser manual",
      "Outcome típico: menos herramientas sueltas entre ads, email y CRM",
    ],
    framingNote:
      "No representa un logo ni un caso publicitado con cifras de un anunciante concreto.",
  },
  {
    id: "perfil-saas-pipeline",
    profileLabel: "Perfil de proyecto C — Pipeline SaaS B2B",
    industry: "Software B2B",
    challenge:
      "Ciclo de venta largo con nurturing irregular y poca trazabilidad entre marketing y ventas.",
    solution:
      "CRM por etapas, campañas de nurturing, workflows y pack SaaS B2B para contenidos y activos de conversión.",
    resultMetrics: [
      "Ejemplo de capacidad: etapas de pipeline compartidas entre marketing y ventas",
      "Rango orientativo: nurturing continuo sin depender de envíos manuales sueltos",
      "Outcome típico: reporting de funnel usable en comité semanal",
    ],
    framingNote:
      "Patrón anonimizado de proyecto; las cifras de negocio reales se definen en discovery.",
  },
  {
    id: "perfil-enterprise-gobierno",
    profileLabel: "Perfil de proyecto D — Gobierno enterprise",
    industry: "Organización multi-equipo",
    challenge:
      "Necesidad de automatización con controles de acceso, marco legal y subprocesadores claros.",
    solution:
      "Plan Elite / enterprise, revisión de seguridad, DPA, integraciones controladas y operación multi-usuario.",
    resultMetrics: [
      "Ejemplo de capacidad: segregación por tenant y roles",
      "Rango orientativo: activación con checklist de secretos, SES, Stripe y cron",
      "Outcome típico: documentación legal y de seguridad alineada al alta",
    ],
    framingNote:
      "Enfoque de capacidad enterprise; no implica certificación pública inventada ni cliente nominado.",
  },
] as const satisfies readonly CaseStudy[];

export type CaseStudyId = (typeof caseStudies)[number]["id"];

export const resourceItems = [
  {
    id: "blog",
    title: "Blog",
    summary: "Artículos sobre marketing operado por IA, SaaS B2B y operación de crecimiento.",
    href: "/blog",
  },
  {
    id: "faq",
    title: "Preguntas frecuentes",
    summary: "Respuestas directas sobre producto, precios, packs e integraciones.",
    href: "/faq",
  },
  {
    id: "seguridad",
    title: "Seguridad",
    summary: "Prácticas de autenticación, secretos, datos e infraestructura.",
    href: "/seguridad",
  },
  {
    id: "dpa",
    title: "Acuerdo de tratamiento (DPA)",
    summary: "Marco de encargado del tratamiento para clientes que lo requieren.",
    href: "/legal/dpa",
  },
  {
    id: "status",
    title: "Estado del servicio",
    summary: "Página de estado para continuidad y comunicación operativa.",
    href: "/status",
  },
  {
    id: "contacto",
    title: "Contacto",
    summary: "Demo, evaluación de plan y soporte: contact@nelvyon.com.",
    href: "/contacto",
  },
] as const satisfies readonly ResourceItem[];

export type ResourceItemId = (typeof resourceItems)[number]["id"];

export const legalBlurb = {
  privacy: {
    title: "Privacidad",
    intro:
      "Resumen: tratamos datos conforme a la normativa aplicable y a nuestra política de privacidad completa. Consulte el texto íntegro en la página de Privacidad.",
    href: "/privacidad",
  },
  terms: {
    title: "Términos",
    intro:
      "Resumen: el uso del sitio y de los servicios NELVYON se rige por los términos y condiciones publicados. El documento completo está en Términos.",
    href: "/terminos",
  },
  cookies: {
    title: "Cookies",
    intro:
      "Resumen: utilizamos cookies técnicas y, en su caso, de medición según preferencias. Detalle de categorías y gestión en la política de Cookies.",
    href: "/cookies",
  },
  "aviso-legal": {
    title: "Aviso legal",
    intro:
      "Resumen: el aviso legal identifica al titular del sitio y el carácter informativo de los contenidos. Texto completo en Aviso legal.",
    href: "/aviso-legal",
  },
  dpa: {
    title: "Acuerdo de tratamiento (DPA)",
    intro:
      "Resumen: el DPA regula el encargo de tratamiento entre el cliente y NELVYON cuando aplica. Documento completo en /legal/dpa.",
    href: "/legal/dpa",
  },
  subprocessors: {
    title: "Subprocesadores",
    intro:
      "Resumen: publicamos las categorías y proveedores que pueden tratar datos en nombre de NELVYON. Listado formal en /legal/subprocessors.",
    href: "/legal/subprocessors",
  },
} as const satisfies Record<string, LegalBlurbEntry>;

export type LegalBlurbKey = keyof typeof legalBlurb;
export type LegalBlurb = typeof legalBlurb;
