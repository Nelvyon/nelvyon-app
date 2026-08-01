/**
 * Catálogo SSOT — web pública corporativa NELVYON.
 * Marketing: /producto/* · App autenticada: /saas/*
 * status: en_producto | por_proyecto | enterprise — sin vaporware.
 */

export type CatalogStatus = "en_producto" | "por_proyecto" | "enterprise";

export type ProductMockVariant =
  | "dashboard"
  | "crm"
  | "pipeline"
  | "campaigns"
  | "workflows"
  | "inbox"
  | "billing"
  | "ai"
  | "analytics"
  | "calendar"
  | "store"
  | "lms"
  | "funnels"
  | "whatsapp"
  | "portal"
  | "agentes";

export type DeepFeature = { title: string; body: string };
export type DeepPageBlock = {
  eyebrow?: string;
  title: string;
  body: string;
  bullets?: readonly string[];
  image?: string;
  imageAlt?: string;
};

export type ModuleCatalogItem = {
  id: string;
  slug: string;
  name: string;
  short: string;
  seoTitle: string;
  seoDescription: string;
  status: CatalogStatus;
  productPath?: string;
  hero: DeepPageBlock;
  benefits: readonly DeepFeature[];
  features: readonly DeepFeature[];
  useCases: readonly DeepFeature[];
  faqs: readonly { question: string; answer: string }[];
  related: readonly string[];
  mockVariant: ProductMockVariant;
  comparisonPoints?: readonly string[];
};

export type ServiceCatalogItem = {
  id: string;
  slug: string;
  href: string;
  name: string;
  short: string;
  seoTitle: string;
  seoDescription: string;
  problem: string;
  solution: string;
  deliverables: readonly string[];
  process: readonly DeepFeature[];
  benefits: readonly DeepFeature[];
  faqs: readonly { question: string; answer: string }[];
  image: string;
  relatedServices: readonly string[];
};

export type SectorCatalogItem = {
  id: string;
  slug: string;
  name: string;
  short: string;
  seoTitle: string;
  seoDescription: string;
  challenges: readonly string[];
  outcomes: readonly string[];
  modules: readonly string[];
  services: readonly string[];
  faqs: readonly { question: string; answer: string }[];
  image: string;
};

export type UseCaseCatalogItem = {
  id: string;
  slug: string;
  name: string;
  audience: string;
  short: string;
  seoTitle: string;
  seoDescription: string;
  story: readonly DeepPageBlock[];
  metrics: readonly { label: string; value: string }[];
  image: string;
};

export type IntegrationCatalogItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  short: string;
  connectivity: "nativo" | "api" | "webhook" | "oauth";
  status: CatalogStatus;
  statusNote: string;
  capabilities: readonly string[];
  initial: string;
};

/** premium stock library photos + real saas-shots for product UI (never third-party dashboards). */
const img = {
  hero: "/brand/public/library/photos/F-01.webp",
  platform: "/brand/public/saas-shots/dashboard.webp",
  analytics: "/brand/public/saas-shots/analytics.webp",
  automation: "/brand/public/saas-shots/workflows.webp",
  agency: "/brand/public/library/photos/F-01.webp",
  brand: "/brand/public/library/photos/F-01.webp",
  enterprise: "/brand/public/library/photos/F-02.webp",
  ops: "/brand/public/library/photos/F-02.webp",
  service: "/brand/public/library/photos/F-01.webp",
  office: "/brand/public/library/photos/F-02.webp",
  blog: "/brand/public/library/photos/F-01.webp",
  crm: "/brand/public/saas-shots/crm.webp",
  ai: "/brand/public/saas-shots/ai.webp",
  pipeline: "/brand/public/saas-shots/pipeline.webp",
  campaigns: "/brand/public/saas-shots/campanias.webp",
} as const;

function mod(
  partial: Omit<ModuleCatalogItem, "benefits" | "features" | "useCases" | "faqs" | "hero"> & {
    heroTitle: string;
    heroBody: string;
    image?: string;
    benefits?: readonly DeepFeature[];
    features?: readonly DeepFeature[];
    useCases?: readonly DeepFeature[];
    faqs?: readonly { question: string; answer: string }[];
  },
): ModuleCatalogItem {
  const name = partial.name;
  return {
    id: partial.id,
    slug: partial.slug,
    name,
    short: partial.short,
    seoTitle: partial.seoTitle,
    seoDescription: partial.seoDescription,
    status: partial.status,
    productPath: partial.productPath,
    related: partial.related,
    mockVariant: partial.mockVariant,
    comparisonPoints: partial.comparisonPoints,
    hero: {
      eyebrow: "Módulo SaaS",
      title: partial.heroTitle,
      body: partial.heroBody,
      image: partial.image ?? img.platform,
      imageAlt: `Captura conceptual ${name}`,
    },
    benefits: partial.benefits ?? [
      { title: "Operación real", body: `${name} vive en el panel multi-tenant con permisos y trazabilidad.` },
      { title: "Integrado al stack", body: "Comparte contexto con CRM, campañas, workflows e inbox según alcance." },
      { title: "Sin demos vacías", body: "La página describe capacidades alineadas a rutas /saas existentes." },
    ],
    features: partial.features ?? [
      { title: "Panel dedicado", body: `Interfaz operativa en ${partial.productPath ?? "/saas"}.` },
      { title: "Permisos", body: "Acceso según rol y plan del tenant." },
      { title: "Datos de tenant", body: "Aislamiento multi-tenant por diseño." },
      { title: "Extensible", body: "Webhooks y APIs según módulo e integraciones activas." },
    ],
    useCases: partial.useCases ?? [
      { title: "Equipos de growth", body: `Usan ${name} en el día a día comercial y de marketing.` },
      { title: "Agencias multi-cliente", body: "Operación segregada por organización." },
    ],
    faqs: partial.faqs ?? [
      {
        question: `¿${name} está incluido en todos los planes?`,
        answer: "El alcance exacto se confirma en onboarding y según plan Starter/Growth/Elite.",
      },
      {
        question: "¿Puedo verlo en demo?",
        answer: "Sí. Solicitamos demo en /contacto y recorremos el módulo en un tenant de evaluación.",
      },
      {
        question: "¿Requiere servicios de agencia?",
        answer: "No. El SaaS se licencia aparte. La agencia es opcional y se presupuesta por separado.",
      },
    ],
  };
}

export const saasModules: readonly ModuleCatalogItem[] = [
  mod({
    id: "crm",
    slug: "crm",
    name: "CRM",
    short: "Contactos, empresas e historial comercial en un solo lugar.",
    seoTitle: "CRM B2B | SaaS NELVYON",
    seoDescription: "CRM multi-tenant con pipeline, actividad y vínculo a campañas y workflows.",
    status: "en_producto",
    productPath: "/saas/crm",
    mockVariant: "crm",
    related: ["pipeline", "campanas", "workflows", "inbox"],
    image: img.crm,
    heroTitle: "CRM pensado para operar, no solo para almacenar fichas",
    heroBody:
      "Gestione contactos, empresas y actividad con aislamiento por tenant, permisos RBAC y vínculo real a campañas, inbox y workflows.",
    comparisonPoints: ["CRM + campañas + workflows en el mismo tenant", "Sin pegamentos frágiles entre herramientas sueltas"],
    benefits: [
      { title: "Contexto completo", body: "Cada ficha arrastra historial de emails, tareas y etapas." },
      { title: "Multi-tenant seguro", body: "Datos aislados por organización con roles." },
      { title: "Listo para automatizar", body: "Eventos del CRM alimentan workflows." },
    ],
    features: [
      { title: "Contactos y empresas", body: "Fichas, etiquetas y búsqueda operativa." },
      { title: "Actividad y notas", body: "Registro de interacciones del equipo." },
      { title: "Integración pipeline", body: "De lead a oportunidad sin perder contexto." },
      { title: "Permisos", body: "Lectura/escritura según RBAC del tenant." },
    ],
  }),
  mod({
    id: "pipeline",
    slug: "pipeline",
    name: "Pipeline",
    short: "Oportunidades, etapas y previsión comercial medible.",
    seoTitle: "Pipeline comercial | SaaS NELVYON",
    seoDescription: "Pipeline de ventas con etapas e integración al CRM NELVYON.",
    status: "en_producto",
    productPath: "/saas/pipeline",
    mockVariant: "pipeline",
    related: ["crm", "workflows", "campanas"],
    image: img.pipeline,
    heroTitle: "Pipeline comercial con etapas claras y gobierno",
    heroBody:
      "Visualice oportunidades, avance etapas y conecte el ciclo de venta con CRM y automatizaciones. Forecast ponderado y playbooks por etapa viven en el mismo Sales Hub.",
    benefits: [
      { title: "Etapas operativas", body: "new → contacted → qualified → proposal → won/lost, sin hojas sueltas." },
      { title: "Forecast honesto", body: "Weighted / best case / committed desde deals reales del tenant." },
      { title: "Kanban y detalle", body: "Mueva deals y abra ficha sin salir del Sales Hub." },
    ],
    features: [
      { title: "Deals", body: "Valor, probabilidad, fechas y notas por oportunidad." },
      { title: "Forecast", body: "Vista ponderada por etapa." },
      { title: "Playbooks", body: "Acciones sugeridas por etapa (cuando estén configurados)." },
      { title: "CPQ / presupuestos", body: "Presupuestos y contratos en el mismo hub cuando el tenant los use." },
    ],
    comparisonPoints: ["Pipeline + CRM + workflows en un tenant", "Sin inventar ROAS ni win-rate de clientes"],
  }),
  mod({
    id: "workflows",
    slug: "workflows",
    name: "Automatizaciones",
    short: "Workflows con triggers, acciones e idempotencia.",
    seoTitle: "Automatizaciones y workflows | SaaS NELVYON",
    seoDescription: "Motor de workflows SaaS con idempotencia y acciones reales.",
    status: "en_producto",
    productPath: "/saas/workflows",
    mockVariant: "workflows",
    related: ["crm", "campanas", "ia", "agentes"],
    image: img.automation,
    heroTitle: "Automatice sin duplicar envíos ni perder el control",
    heroBody: "Diseñe flujos con triggers, acciones y ventanas de idempotencia. Editor clásico y visual alineados a APIs reales.",
    features: [
      { title: "Triggers", body: "Eventos de contacto, deal, tiempo y más según catálogo." },
      { title: "Acciones", body: "Email, notificaciones y pasos operativos soportados." },
      { title: "Idempotencia", body: "Protección temporal frente a doble ejecución." },
      { title: "Editor visual", body: "Flujos con nodos publicados al motor SaaS." },
    ],
  }),
  mod({
    id: "ia",
    slug: "ia",
    name: "IA NELVYON",
    short: "Panel de IA con gobierno, kill-switch y evidencia.",
    seoTitle: "IA con gobierno | SaaS NELVYON",
    seoDescription: "Panel IA NELVYON: canary kill, spend off y operación con control.",
    status: "en_producto",
    productPath: "/saas/ai",
    mockVariant: "ai",
    related: ["agentes", "workflows", "campanas"],
    image: img.ai,
    heroTitle: "IA operativa con kill-switch y criterios enterprise",
    heroBody:
      "El panel IA existe en producto. En producción el canary y el spend permanecen off hasta autorización explícita. Gobierno humano en decisiones críticas.",
  }),
  mod({
    id: "agentes",
    slug: "agentes",
    name: "Agentes IA",
    short: "Agentes especializados para tareas de marketing y ops.",
    seoTitle: "Agentes IA | SaaS NELVYON",
    seoDescription: "Agentes IA NELVYON para producción asistida con control.",
    status: "en_producto",
    productPath: "/saas/agentes",
    mockVariant: "agentes",
    related: ["ia", "workflows", "campanas"],
    image: img.automation,
    heroTitle: "Agentes que producen con supervisión humana",
    heroBody: "Orqueste agentes para tareas de marketing y operación. La publicación y el spend críticos requieren gobierno.",
  }),
  mod({
    id: "marketing",
    slug: "marketing",
    name: "Marketing",
    short: "Captación y canales: publicidad, SEO y reputación en el SaaS.",
    seoTitle: "Marketing digital en SaaS | NELVYON",
    seoDescription: "Módulo de marketing: publicidad, SEO y reputación conectados al CRM.",
    status: "en_producto",
    productPath: "/saas/publicidad",
    mockVariant: "campaigns",
    related: ["campanas", "funnels", "crm", "analytics"],
    image: img.service,
    heroTitle: "Marketing conectado a CRM y medición",
    heroBody: "Publicidad, SEO y reputación en el mismo entorno que contactos, campañas y reportes — sin silos inventados.",
  }),
  mod({
    id: "campanas",
    slug: "campanas",
    name: "Email",
    short: "Campañas y secuencias sobre AWS SES con tracking.",
    seoTitle: "Email marketing SaaS | NELVYON",
    seoDescription: "Campañas email NELVYON con SES, bounces y tracking.",
    status: "en_producto",
    productPath: "/saas/campanias",
    mockVariant: "campaigns",
    related: ["workflows", "crm", "inbox"],
    image: img.campaigns,
    heroTitle: "Email de producción, no newsletters decorativas",
    heroBody: "Envío vía SES, higiene de lista, open/click tracking y estados honestos cuando la infraestructura está configurada.",
  }),
  mod({
    id: "whatsapp",
    slug: "whatsapp",
    name: "WhatsApp",
    short: "Conversaciones y plantillas vía Twilio / WhatsApp Business.",
    seoTitle: "WhatsApp Business | SaaS NELVYON",
    seoDescription: "WhatsApp en NELVYON: inbox y mensajería según configuración Twilio.",
    status: "en_producto",
    productPath: "/saas/whatsapp",
    mockVariant: "whatsapp",
    related: ["inbox", "crm", "workflows"],
    image: img.ops,
    heroTitle: "WhatsApp en el mismo loop que CRM e inbox",
    heroBody: "Canal de mensajería operativo cuando Twilio/WhatsApp está configurado. Estados honestos si falta infraestructura.",
  }),
  mod({
    id: "calendario",
    slug: "calendario",
    name: "Calendario",
    short: "Agenda, citas y estados de asistencia.",
    seoTitle: "Calendario y citas | SaaS NELVYON",
    seoDescription: "Calendario y citas NELVYON con estados y CRM.",
    status: "en_producto",
    productPath: "/saas/citas",
    mockVariant: "calendar",
    related: ["crm", "workflows", "inbox"],
    image: img.office,
    heroTitle: "Citas con estados reales, no un calendario vacío",
    heroBody: "Programe, confirme, complete o cancele citas con vínculo al contacto y visibilidad operativa.",
  }),
  mod({
    id: "billing",
    slug: "billing",
    name: "Facturación",
    short: "Plan del tenant, Stripe y facturas de plataforma.",
    seoTitle: "Facturación y billing | SaaS NELVYON",
    seoDescription: "Billing NELVYON: Stripe, plan del tenant y facturas.",
    status: "en_producto",
    productPath: "/saas/billing",
    mockVariant: "billing",
    related: ["crm", "analytics"],
    image: img.enterprise,
    heroTitle: "Billing alineado al plan real del tenant",
    heroBody: "Checkout Stripe, webhooks de suscripción y resumen de plan. Facturación de clientes del tenant en módulo aparte según alcance.",
  }),
  mod({
    id: "funnels",
    slug: "funnels",
    name: "Embudos",
    short: "Funnels de captación con pasos y medición.",
    seoTitle: "Embudos y funnels | SaaS NELVYON",
    seoDescription: "Funnels NELVYON para captación y conversión.",
    status: "en_producto",
    productPath: "/saas/funnels",
    mockVariant: "funnels",
    related: ["landing-pages", "campanas", "crm"],
    image: img.analytics,
    heroTitle: "Embudos que conectan captación y CRM",
    heroBody: "Diseñe funnels de captación y midalos en el mismo entorno que formularios, landings y contactos.",
  }),
  mod({
    id: "landing-pages",
    slug: "landing-pages",
    name: "Landing Pages",
    short: "Web builder y páginas de conversión.",
    seoTitle: "Landing pages | SaaS NELVYON",
    seoDescription: "Web builder NELVYON para landings y páginas de conversión.",
    status: "en_producto",
    productPath: "/saas/web-builder",
    mockVariant: "funnels",
    related: ["funnels", "formularios", "campanas"],
    image: img.office,
    heroTitle: "Landings publicables desde el SaaS",
    heroBody: "Editor de páginas con secciones, preview y publicación — conectadas a formularios y captación.",
  }),
  mod({
    id: "lms",
    slug: "lms",
    name: "Cursos",
    short: "LMS: cursos, inscripciones y progreso.",
    seoTitle: "LMS y cursos | SaaS NELVYON",
    seoDescription: "LMS NELVYON para formación y membresías educativas.",
    status: "en_producto",
    productPath: "/saas/lms",
    mockVariant: "lms",
    related: ["store", "crm", "campanas"],
    image: img.blog,
    heroTitle: "Cursos y progreso en el mismo tenant",
    heroBody: "Publique cursos, gestione inscripciones y avance. Certificados y membresías según alcance del plan.",
  }),
  mod({
    id: "store",
    slug: "store",
    name: "Ecommerce",
    short: "Tienda online: productos, pedidos y estados.",
    seoTitle: "Ecommerce / tienda | SaaS NELVYON",
    seoDescription: "Tienda online NELVYON con productos y pedidos.",
    status: "en_producto",
    productPath: "/saas/store",
    mockVariant: "store",
    related: ["billing", "crm", "campanas"],
    image: img.service,
    heroTitle: "Tienda operativa dentro del SaaS",
    heroBody: "Catálogo, pedidos y flujo de estados. Retención y email se conectan vía CRM y campañas.",
  }),
  mod({
    id: "analytics",
    slug: "analytics",
    name: "Analytics y reportes",
    short: "Informes, atribución y exportaciones.",
    seoTitle: "Analytics y reportes | SaaS NELVYON",
    seoDescription: "Reportes NELVYON: generación, historial y atribución.",
    status: "en_producto",
    productPath: "/saas/reportes",
    mockVariant: "analytics",
    related: ["crm", "campanas", "billing"],
    image: img.analytics,
    heroTitle: "Reportes generados, no dashboards inventados",
    heroBody: "Genere informes, consulte historial y explore atribución. KPIs alineados a datos reales del tenant.",
  }),
  mod({
    id: "inbox",
    slug: "inbox",
    name: "Inbox",
    short: "Bandeja unificada de conversaciones.",
    seoTitle: "Inbox unificado | SaaS NELVYON",
    seoDescription: "Inbox NELVYON para conversaciones y seguimiento.",
    status: "en_producto",
    productPath: "/saas/inbox",
    mockVariant: "inbox",
    related: ["whatsapp", "crm", "campanas"],
    image: img.ops,
    heroTitle: "Conversaciones con contexto de CRM",
    heroBody: "Centralice hilos y responda con el historial del contacto a mano.",
  }),
  mod({
    id: "portal",
    slug: "portal",
    name: "Portal cliente",
    short: "Revisión y aprobación de entregables.",
    seoTitle: "Portal cliente | NELVYON",
    seoDescription: "Portal cliente para aprobar entregables de packs y agencia.",
    status: "en_producto",
    productPath: "/portal",
    mockVariant: "portal",
    related: ["crm", "ia", "workflows"],
    image: img.agency,
    heroTitle: "Aprobación cliente con trazabilidad",
    heroBody: "El cliente revisa entregables en un flujo real — no en hilos sueltos ni PDFs perdidos.",
  }),
];

export const agencyServices: readonly ServiceCatalogItem[] = [
  {
    id: "desarrollo-web",
    slug: "desarrollo-web",
    href: "/desarrollo-web",
    name: "Desarrollo web",
    short: "Sitios y landings premium conectados a captación y CRM.",
    seoTitle: "Desarrollo web | Agencia NELVYON",
    seoDescription: "Diseño y desarrollo web con performance y conexión a CRM.",
    problem: "La web no transmite confianza ni convierte.",
    solution: "Arquitectura, UI premium, formularios y tracking conectados al SaaS.",
    deliverables: ["Arquitectura de páginas", "UI premium", "Integración formularios/CRM", "QA y publicación", "Handoff documentado"],
    process: [
      { title: "Discovery", body: "Objetivos, audiencia y stack." },
      { title: "Diseño", body: "Dirección visual y prototipos." },
      { title: "Build", body: "Implementación Next.js / páginas de conversión." },
      { title: "Lanzamiento", body: "QA, SEO base y handoff." },
    ],
    benefits: [
      { title: "Conversión", body: "Páginas pensadas para lead y confianza." },
      { title: "Performance", body: "Core Web Vitals y carga cuidada." },
      { title: "Conexión SaaS", body: "Formularios y CRM sin pegamento frágil." },
    ],
    faqs: [
      { question: "¿Incluye mantenimiento?", answer: "Se define en presupuesto de agencia; no está mezclado con el plan SaaS." },
      { question: "¿Usan el web builder del SaaS?", answer: "Según proyecto: web corporativa custom o landings del builder." },
      { question: "¿Hay precio fijo?", answer: "No. Presupuesto tras discovery." },
    ],
    image: img.office,
    relatedServices: ["seo", "branding", "diseno"],
  },
  {
    id: "seo",
    slug: "seo",
    href: "/seo",
    name: "SEO",
    short: "Visibilidad orgánica y demanda sostenida.",
    seoTitle: "SEO | Agencia NELVYON",
    seoDescription: "SEO técnico, contenido y medición.",
    problem: "No aparece cuando el cliente busca.",
    solution: "Técnica, contenidos y reporting alineado a negocio.",
    deliverables: ["Auditoría", "Arquitectura de contenidos", "On-page", "Reporting mensual"],
    process: [
      { title: "Auditoría", body: "Técnica y de contenidos." },
      { title: "Plan", body: "Prioridades por impacto." },
      { title: "Ejecución", body: "Optimización y publicación." },
      { title: "Medición", body: "KPIs honestos." },
    ],
    benefits: [
      { title: "Demanda", body: "Tráfico con intención." },
      { title: "Activos", body: "Contenido que acumula valor." },
      { title: "Transparencia", body: "Sin garantías de ranking inventadas." },
    ],
    faqs: [
      { question: "¿Garantizan posiciones?", answer: "No. Trabajamos hipótesis medibles." },
      { question: "¿Incluye contenidos?", answer: "Puede empaquetarse con el servicio de Contenido." },
      { question: "¿Plazo típico?", answer: "Se define en propuesta tras auditoría." },
    ],
    image: img.analytics,
    relatedServices: ["contenido", "sem", "desarrollo-web"],
  },
  {
    id: "sem",
    slug: "sem",
    href: "/agencia/sem",
    name: "SEM",
    short: "Paid search con medición de lead y calidad.",
    seoTitle: "SEM | Agencia NELVYON",
    seoDescription: "Search ads con tracking y CRM.",
    problem: "Inversión en search sin claridad de CPL/calidad.",
    solution: "Estructura de cuentas, creatividades y medición conectada.",
    deliverables: ["Estructura Search", "Keywords y anuncios", "Tracking conversiones", "Optimización continua"],
    process: [
      { title: "Setup", body: "Cuentas, conversiones, CRM." },
      { title: "Lanzamiento", body: "Campañas iniciales." },
      { title: "Optimización", body: "CPC, CPL y calidad." },
      { title: "Reporting", body: "Decisiones con datos." },
    ],
    benefits: [
      { title: "Demanda inmediata", body: "Visibilidad en búsqueda activa." },
      { title: "Control de spend", body: "El media spend es del cliente." },
      { title: "Loop CRM", body: "Leads en el SaaS." },
    ],
    faqs: [
      { question: "¿El spend está incluido?", answer: "No. Solo gestión de agencia." },
      { question: "¿Google Ads separado?", answer: "Sí: también hay página específica Google Ads." },
      { question: "¿Necesito SaaS?", answer: "Recomendado para CRM y seguimiento." },
    ],
    image: img.service,
    relatedServices: ["google-ads", "seo", "meta-ads"],
  },
  {
    id: "meta-ads",
    slug: "meta-ads",
    href: "/agencia/meta-ads",
    name: "Meta Ads",
    short: "Facebook e Instagram Ads con medición.",
    seoTitle: "Meta Ads | Agencia NELVYON",
    seoDescription: "Campañas Meta con pixel/CAPI y CRM.",
    problem: "Creatividades y audiencias sin retorno claro.",
    solution: "Estructura Meta + tracking + CRM.",
    deliverables: ["Estructura campañas", "Creatividades", "Pixel/CAPI según setup", "Optimización"],
    process: [
      { title: "Setup", body: "Business Manager, píxeles, eventos." },
      { title: "Creatividades", body: "Mensajes y formatos." },
      { title: "Escala", body: "Pruebas y presupuesto." },
      { title: "Reporting", body: "Calidad de lead." },
    ],
    benefits: [
      { title: "Alcance", body: "Audiencias frías y remarketing." },
      { title: "Creatividad", body: "Mensaje alineado a oferta." },
      { title: "CRM", body: "Leads en NELVYON." },
    ],
    faqs: [
      { question: "¿Incluye creatividades?", answer: "Sí, en el alcance acordado." },
      { question: "¿Spend incluido?", answer: "No." },
      { question: "¿WhatsApp ads?", answer: "Según canal y configuración." },
    ],
    image: img.agency,
    relatedServices: ["google-ads", "social-media", "branding"],
  },
  {
    id: "google-ads",
    slug: "google-ads",
    href: "/agencia/google-ads",
    name: "Google Ads",
    short: "Search, Performance Max y display según estrategia.",
    seoTitle: "Google Ads | Agencia NELVYON",
    seoDescription: "Google Ads con medición y calidad de lead.",
    problem: "Campañas Google sin estructura ni atribución operativa.",
    solution: "Cuentas ordenadas, conversiones y CRM.",
    deliverables: ["Estructura de cuenta", "Campañas Search/PMax", "Conversiones", "Optimización"],
    process: [
      { title: "Auditoría", body: "Cuenta y tracking." },
      { title: "Rebuild", body: "Estructura limpia." },
      { title: "Launch", body: "Campañas activas." },
      { title: "Iterate", body: "CPC/CPL y calidad." },
    ],
    benefits: [
      { title: "Intención", body: "Usuarios que buscan ahora." },
      { title: "Gobierno", body: "Presupuesto y exclusiones claras." },
      { title: "Datos", body: "Leads en CRM." },
    ],
    faqs: [
      { question: "¿Incluye YouTube?", answer: "Si entra en alcance del presupuesto." },
      { question: "¿Spend?", answer: "Del cliente." },
      { question: "¿Diferencia con SEM?", answer: "SEM es el marco; esta página profundiza Google." },
    ],
    image: img.analytics,
    relatedServices: ["sem", "seo", "meta-ads"],
  },
  {
    id: "automatizacion",
    slug: "automatizacion",
    href: "/servicios/automatizacion",
    name: "Automatizaciones",
    short: "Diseño e implantación de workflows sobre el SaaS.",
    seoTitle: "Automatización | Agencia NELVYON",
    seoDescription: "Implantación de automatizaciones NELVYON.",
    problem: "Tareas repetitivas y fugas de seguimiento.",
    solution: "Mapa de procesos + workflows con idempotencia.",
    deliverables: ["Mapa de procesos", "Workflows", "QA", "Documentación"],
    process: [
      { title: "Discovery ops", body: "Dolor y reglas." },
      { title: "Diseño", body: "Triggers/acciones." },
      { title: "Build", body: "Implementación en SaaS." },
      { title: "Monitor", body: "Ajustes post-lanzamiento." },
    ],
    benefits: [
      { title: "Tiempo", body: "Menos trabajo manual." },
      { title: "Consistencia", body: "Mismos pasos cada vez." },
      { title: "Producto real", body: "Sobre el motor /saas/workflows." },
    ],
    faqs: [
      { question: "¿Es lo mismo que el módulo Workflows?", answer: "El módulo es el producto; este servicio es el diseño e implantación." },
      { question: "¿Incluye IA?", answer: "Puede combinarse con IA/agentes según gobierno." },
      { question: "¿Presupuesto?", answer: "Tras discovery." },
    ],
    image: img.automation,
    relatedServices: ["ia-agencia", "email-marketing", "consultoria"],
  },
  {
    id: "ia-agencia",
    slug: "ia",
    href: "/agencia/ia",
    name: "IA para marketing",
    short: "Producción asistida por IA con edición humana y gobierno.",
    seoTitle: "IA marketing | Agencia NELVYON",
    seoDescription: "Servicios de IA con gobierno humano para marketing.",
    problem: "IA sin control genera ruido y riesgo de marca.",
    solution: "Flujos con agentes, revisión humana y kill-switch de producto.",
    deliverables: ["Mapa de casos IA", "Prompts/flujos", "QA humano", "Handoff al SaaS"],
    process: [
      { title: "Casos de uso", body: "Qué automatizar y qué no." },
      { title: "Diseño", body: "Agentes y límites." },
      { title: "Piloto", body: "Evidencia y ajustes." },
      { title: "Operación", body: "Gobierno continuo." },
    ],
    benefits: [
      { title: "Velocidad", body: "Más producción con control." },
      { title: "Marca", body: "Edición humana obligatoria donde importa." },
      { title: "Seguridad", body: "Alineado a flags enterprise." },
    ],
    faqs: [
      { question: "¿Publican borradores crudos?", answer: "No." },
      { question: "¿OpenAI en prod?", answer: "Solo con autorización; canary kill por defecto." },
      { question: "¿Incluye el plan SaaS?", answer: "Se cotiza aparte." },
    ],
    image: img.ops,
    relatedServices: ["automatizacion", "contenido", "consultoria"],
  },
  {
    id: "branding",
    slug: "branding",
    href: "/branding",
    name: "Branding",
    short: "Identidad y mensaje premium.",
    seoTitle: "Branding | Agencia NELVYON",
    seoDescription: "Identidad visual y verbal B2B.",
    problem: "Marca genérica o inconsistente.",
    solution: "Sistema de identidad y aplicación en canales.",
    deliverables: ["Territorio de marca", "Visual", "Guidelines", "Aplicaciones"],
    process: [
      { title: "Research", body: "Posicionamiento." },
      { title: "Concepto", body: "Dirección creativa." },
      { title: "Sistema", body: "Assets y normas." },
      { title: "Rollout", body: "Web/ads." },
    ],
    benefits: [
      { title: "Diferenciación", body: "Deja de parecer plantilla." },
      { title: "Consistencia", body: "Misma voz en todos los canales." },
      { title: "Confianza", body: "Percepción premium." },
    ],
    faqs: [
      { question: "¿Incluye web?", answer: "Puede empaquetarse con desarrollo web." },
      { question: "¿Incluye naming?", answer: "Si entra en alcance." },
      { question: "¿Plazos?", answer: "En propuesta." },
    ],
    image: img.brand,
    relatedServices: ["diseno", "desarrollo-web", "social-media"],
  },
  {
    id: "diseno",
    slug: "diseno",
    href: "/agencia/diseno",
    name: "Diseño",
    short: "Diseño de producto, creatividades y sistemas visuales.",
    seoTitle: "Diseño | Agencia NELVYON",
    seoDescription: "Diseño UI/creativo para marca y conversión.",
    problem: "Piezas inconsistentes o poco convertidoras.",
    solution: "Sistema visual aplicado a web, ads y producto.",
    deliverables: ["UI kits", "Creatividades", "Landings visuales", "QA de marca"],
    process: [
      { title: "Brief", body: "Objetivos y restricciones." },
      { title: "Exploración", body: "Direcciones." },
      { title: "Producción", body: "Entregables." },
      { title: "Aplicación", body: "Canales vivos." },
    ],
    benefits: [
      { title: "Claridad", body: "Jerarquía visual profesional." },
      { title: "Velocidad", body: "Sistema reutilizable." },
      { title: "Conversión", body: "Diseño al servicio del mensaje." },
    ],
    faqs: [
      { question: "¿Es branding?", answer: "Branding define el sistema; diseño lo aplica." },
      { question: "¿Incluye motion?", answer: "Según alcance." },
      { question: "¿Presupuesto?", answer: "Personalizado." },
    ],
    image: img.brand,
    relatedServices: ["branding", "meta-ads", "desarrollo-web"],
  },
  {
    id: "social-media",
    slug: "social-media",
    href: "/agencia/social-media",
    name: "Social Media",
    short: "Contenido y gestión de redes con medición.",
    seoTitle: "Social Media | Agencia NELVYON",
    seoDescription: "Social media con calendario y reporting.",
    problem: "Presencia irregular o sin vínculo a pipeline.",
    solution: "Calendario, producción y medición orientada a negocio.",
    deliverables: ["Calendario", "Piezas", "Publicación", "Reporting"],
    process: [
      { title: "Estrategia", body: "Canales y tono." },
      { title: "Producción", body: "Contenidos." },
      { title: "Publicación", body: "Cadencia." },
      { title: "Análisis", body: "Qué funciona." },
    ],
    benefits: [
      { title: "Consistencia", body: "Presencia sostenida." },
      { title: "Marca", body: "Mensaje coherente." },
      { title: "Embudo", body: "Apoyo a captación." },
    ],
    faqs: [
      { question: "¿Incluye community management 24/7?", answer: "Solo si se presupuesta explícitamente." },
      { question: "¿Ads incluidos?", answer: "Ads van en Meta/Google Ads." },
      { question: "¿Usan el módulo social del SaaS?", answer: "Cuando aporta al flujo operativo." },
    ],
    image: img.agency,
    relatedServices: ["contenido", "meta-ads", "branding"],
  },
  {
    id: "email-marketing",
    slug: "email-marketing",
    href: "/email-marketing",
    name: "Email marketing",
    short: "Estrategia y ejecución sobre el motor SaaS.",
    seoTitle: "Email marketing | Agencia NELVYON",
    seoDescription: "Email marketing sobre campañas NELVYON.",
    problem: "Listas sin nurturing ni higiene.",
    solution: "Estrategia + ejecución en SES/SaaS.",
    deliverables: ["Arquitectura de flujos", "Copy", "Setup campañas", "Reporting"],
    process: [
      { title: "Auditoría lista", body: "Higiene y segmentos." },
      { title: "Diseño", body: "Nurturing y triggers." },
      { title: "Ejecución", body: "Campañas." },
      { title: "Optimización", body: "Open/click/conversión." },
    ],
    benefits: [
      { title: "Retención", body: "Relación continua." },
      { title: "Producto real", body: "Sobre /saas/campanias." },
      { title: "Medición", body: "Tracking honesto." },
    ],
    faqs: [
      { question: "¿Necesito plan SaaS?", answer: "Recomendado." },
      { question: "¿Incluye diseño de plantillas?", answer: "Según alcance." },
      { question: "¿SMS/WhatsApp?", answer: "Servicios/canales aparte." },
    ],
    image: img.automation,
    relatedServices: ["automatizacion", "contenido", "consultoria"],
  },
  {
    id: "consultoria",
    slug: "consultoria",
    href: "/agencia/consultoria",
    name: "Consultoría",
    short: "Diagnóstico, arquitectura de growth y roadmap.",
    seoTitle: "Consultoría growth | Agencia NELVYON",
    seoDescription: "Consultoría de marketing, SaaS y operación.",
    problem: "Stack y procesos dispersos sin priorización.",
    solution: "Diagnóstico, roadmap y criterios de cierre medibles.",
    deliverables: ["Diagnóstico", "Arquitectura objetivo", "Roadmap 90 días", "Sesiones de dirección"],
    process: [
      { title: "Intake", body: "Datos y objetivos." },
      { title: "Diagnóstico", body: "Gaps y riesgos." },
      { title: "Plan", body: "Prioridades." },
      { title: "Acompañamiento", body: "Ejecución gobernada." },
    ],
    benefits: [
      { title: "Claridad", body: "Qué hacer primero." },
      { title: "Riesgo", body: "Menos proyectos vanidosos." },
      { title: "Alineación", body: "SaaS + agencia sin mezclar precios." },
    ],
    faqs: [
      { question: "¿Es un retainer?", answer: "Puede ser proyecto o retainer según propuesta." },
      { question: "¿Incluye ejecución?", answer: "La ejecución se presupuesta en servicios." },
      { question: "¿Enterprise?", answer: "Sí: discovery de seguridad e integración." },
    ],
    image: img.enterprise,
    relatedServices: ["automatizacion", "ia-agencia", "seo"],
  },
  {
    id: "contenido",
    slug: "contenido",
    href: "/contenido",
    name: "Contenido",
    short: "Editorial que alimenta SEO y nurturing.",
    seoTitle: "Contenido | Agencia NELVYON",
    seoDescription: "Producción de contenido SEO y campañas.",
    problem: "Contenido irregular o sin estrategia.",
    solution: "Calendario, producción y distribución.",
    deliverables: ["Calendario", "Artículos/piezas", "Adaptación canal", "Medición"],
    process: [
      { title: "Brief", body: "Temas y journey." },
      { title: "Producción", body: "Redacción/diseño." },
      { title: "Publicación", body: "Blog/ads/email." },
      { title: "Iteración", body: "Qué funciona." },
    ],
    benefits: [
      { title: "Activos", body: "Contenido acumulativo." },
      { title: "SEO", body: "Apoyo a organic." },
      { title: "Nurturing", body: "Material para email." },
    ],
    faqs: [
      { question: "¿Usan IA?", answer: "Con edición humana." },
      { question: "¿Incluye diseño?", answer: "Según paquete." },
      { question: "¿Blog NELVYON?", answer: "También podemos operar el suyo." },
    ],
    image: img.blog,
    relatedServices: ["seo", "email-marketing", "social-media"],
  },
  {
    id: "ads",
    slug: "ads",
    href: "/ads",
    name: "Publicidad digital",
    short: "Meta y Google Ads con medición de lead y calidad.",
    seoTitle: "Publicidad digital | Agencia NELVYON",
    seoDescription: "Gestión de Meta y Google Ads con CRM.",
    problem: "Inversión publicitaria sin claridad de retorno.",
    solution: "Estructura multi-canal + tracking + CRM.",
    deliverables: ["Estructura de cuentas", "Creatividades", "Tracking", "Optimización", "Reporting"],
    process: [
      { title: "Setup", body: "Cuentas y conversiones." },
      { title: "Lanzamiento", body: "Campañas iniciales." },
      { title: "Optimización", body: "CPL y calidad." },
      { title: "Reporting", body: "Decisiones con datos." },
    ],
    benefits: [
      { title: "Multi-canal", body: "Meta y Google según estrategia." },
      { title: "CRM", body: "Leads en NELVYON." },
      { title: "Transparencia", body: "Spend del cliente, gestión aparte." },
    ],
    faqs: [
      { question: "¿Diferencia con Meta/Google Ads?", answer: "Esta página cubre el marco multi-canal; Meta y Google tienen páginas específicas." },
      { question: "¿Spend incluido?", answer: "No." },
      { question: "¿Presupuesto?", answer: "Tras discovery." },
    ],
    image: img.service,
    relatedServices: ["meta-ads", "google-ads", "sem"],
  },
  {
    id: "ecommerce",
    slug: "ecommerce",
    href: "/servicios/ecommerce",
    name: "Ecommerce (agencia)",
    short: "Funnel, tracking y retención para tiendas.",
    seoTitle: "Ecommerce | Agencia NELVYON",
    seoDescription: "Crecimiento ecommerce: adquisición, conversión y retención.",
    problem: "Tráfico sin margen o datos dispersos.",
    solution: "Funnel + campañas + CRM/retención.",
    deliverables: ["Diagnóstico funnel", "Campañas", "Tracking", "Retención"],
    process: [
      { title: "Diagnóstico", body: "Embudo y datos." },
      { title: "Adquisición", body: "Ads/SEO." },
      { title: "Conversión", body: "CRO y mensajes." },
      { title: "Retención", body: "Email/CRM." },
    ],
    benefits: [
      { title: "Margen", body: "Campañas alineadas a rentabilidad." },
      { title: "Datos", body: "Menos silos." },
      { title: "Producto", body: "Puede combinar con módulo Store del SaaS." },
    ],
    faqs: [
      { question: "¿Montan la tienda?", answer: "Sí como alcance de proyecto; o vía módulo /producto/store." },
      { question: "¿Shopify?", answer: "Integración por proyecto." },
      { question: "¿Presupuesto?", answer: "Personalizado." },
    ],
    image: img.service,
    relatedServices: ["meta-ads", "email-marketing", "desarrollo-web"],
  },
];

export const sectorsCatalog: readonly SectorCatalogItem[] = [
  {
    id: "clinicas",
    slug: "clinicas",
    name: "Clínicas",
    short: "Captación ética, citas y seguimiento para salud y bienestar.",
    seoTitle: "NELVYON para clínicas",
    seoDescription: "CRM, citas y campañas para clínicas.",
    challenges: ["No-shows", "Leads sin seguimiento", "Cumplimiento cuidadoso"],
    outcomes: ["Citas confirmadas", "CRM ordenado", "Comunicación cuidada"],
    modules: ["crm", "calendario", "campanas", "workflows"],
    services: ["seo", "google-ads", "automatizacion"],
    faqs: [
      { question: "¿Es software sanitario certificado?", answer: "No sustituye historial clínico; se centra en marketing/ops comercial." },
      { question: "¿WhatsApp?", answer: "Disponible según configuración Twilio." },
    ],
    image: img.ops,
  },
  {
    id: "abogados",
    slug: "abogados",
    name: "Abogados",
    short: "Captación consultiva y pipeline de asuntos.",
    seoTitle: "NELVYON para despachos",
    seoDescription: "CRM y captación para abogados y despachos.",
    challenges: ["Ciclo largo", "Confidencialidad", "Seguimiento irregular"],
    outcomes: ["Pipeline claro", "Follow-up sistemático", "Web premium"],
    modules: ["crm", "pipeline", "inbox", "campanas"],
    services: ["seo", "desarrollo-web", "consultoria"],
    faqs: [
      { question: "¿Sustituye software jurídico?", answer: "No. Complementa captación y CRM comercial." },
      { question: "¿Cumplimiento?", answer: "DPA y prácticas documentadas en /seguridad." },
    ],
    image: img.enterprise,
  },
  {
    id: "inmobiliarias",
    slug: "inmobiliarias",
    name: "Inmobiliarias",
    short: "Leads de portales y ads a visita cualificada.",
    seoTitle: "NELVYON para inmobiliarias",
    seoDescription: "CRM inmobiliario, campañas y automatización.",
    challenges: ["Leads fríos", "Multi-agente", "Atribución débil"],
    outcomes: ["Asignación rápida", "Nurturing", "Visibilidad de embudo"],
    modules: ["crm", "pipeline", "campanas", "whatsapp"],
    services: ["meta-ads", "google-ads", "automatizacion"],
    faqs: [
      { question: "¿Integran portales?", answer: "Vía API/webhooks según proyecto." },
      { question: "¿Multi-sede?", answer: "Multi-tenant / roles según despliegue." },
    ],
    image: img.hero,
  },
  {
    id: "ecommerce",
    slug: "ecommerce",
    name: "Ecommerce",
    short: "Adquisición, conversión y retención con datos conectados.",
    seoTitle: "NELVYON para ecommerce",
    seoDescription: "Ads, email, CRM y tienda para ecommerce.",
    challenges: ["CAC alto", "Datos rotos", "Retención débil"],
    outcomes: ["Mejor atribución operativa", "Flujos post-compra", "Campañas a margen"],
    modules: ["store", "campanas", "crm", "analytics"],
    services: ["meta-ads", "google-ads", "email-marketing"],
    faqs: [
      { question: "¿Montan la tienda?", answer: "Sí como proyecto de agencia o vía módulo store." },
      { question: "¿Shopify?", answer: "Integración por proyecto/API." },
    ],
    image: img.service,
  },
  {
    id: "restauracion",
    slug: "restauracion",
    name: "Restauración",
    short: "Reservas, reputación y captación local.",
    seoTitle: "NELVYON para restauración",
    seoDescription: "Captación local y CRM para restauración.",
    challenges: ["Demanda irregular", "Reseñas", "No-shows"],
    outcomes: ["Más reservas", "Seguimiento", "Presencia local"],
    modules: ["crm", "calendario", "campanas", "whatsapp"],
    services: ["seo", "meta-ads", "social-media"],
    faqs: [
      { question: "¿Reservas en sala?", answer: "Citas/CRM; POS de sala es independiente." },
      { question: "¿Multi-local?", answer: "Evaluamos en discovery." },
    ],
    image: img.hero,
  },
  {
    id: "educacion",
    slug: "educacion",
    name: "Educación",
    short: "Captación de alumnos, LMS y nurturing.",
    seoTitle: "NELVYON para educación",
    seoDescription: "LMS, CRM y campañas para educación.",
    challenges: ["Ciclos de matrícula", "Contenido disperso", "Seguimiento"],
    outcomes: ["Embudo de matrícula", "Cursos en LMS", "Email nurturing"],
    modules: ["lms", "crm", "campanas", "funnels"],
    services: ["seo", "contenido", "meta-ads"],
    faqs: [
      { question: "¿Sustituye campus virtual completo?", answer: "Cubre LMS operativo; requisitos académicos se evalúan." },
      { question: "¿Certificados?", answer: "Según alcance LMS." },
    ],
    image: img.blog,
  },
  {
    id: "industria",
    slug: "industria",
    name: "Industria",
    short: "Pipeline B2B, cuentas y operaciones exigentes.",
    seoTitle: "NELVYON para industria",
    seoDescription: "CRM B2B e integraciones para industria.",
    challenges: ["Ciclo largo", "Multi-interlocutor", "Integraciones"],
    outcomes: ["Pipeline visible", "RBAC", "Integraciones gobernadas"],
    modules: ["crm", "pipeline", "analytics", "workflows"],
    services: ["consultoria", "automatizacion", "desarrollo-web"],
    faqs: [
      { question: "¿ERP?", answer: "Módulos ERP existen en producto; alcance en discovery." },
      { question: "¿On-prem?", answer: "Evaluación enterprise." },
    ],
    image: img.enterprise,
  },
  {
    id: "servicios",
    slug: "servicios",
    name: "Servicios profesionales",
    short: "Consultoras, estudios y firmas de servicios.",
    seoTitle: "NELVYON para servicios profesionales",
    seoDescription: "Captación y pipeline para servicios profesionales.",
    challenges: ["Propuestas lentas", "Follow-up", "Marca"],
    outcomes: ["Pipeline ordenado", "Web premium", "Automatización de seguimiento"],
    modules: ["crm", "pipeline", "inbox", "campanas"],
    services: ["branding", "desarrollo-web", "consultoria"],
    faqs: [
      { question: "¿Facturación de honorarios?", answer: "Billing NELVYON cubre el SaaS; su facturación profesional es independiente." },
      { question: "¿Portal cliente?", answer: "Sí para entregables de packs/agencia." },
    ],
    image: img.agency,
  },
  {
    id: "autonomos",
    slug: "autonomos",
    name: "Autónomos",
    short: "Operación ligera: CRM, agenda y captación.",
    seoTitle: "NELVYON para autónomos",
    seoDescription: "SaaS y agencia a medida para autónomos.",
    challenges: ["Tiempo", "Herramientas sueltas", "Presupuesto"],
    outcomes: ["Un panel", "Agenda", "Campañas simples"],
    modules: ["crm", "calendario", "campanas", "inbox"],
    services: ["seo", "meta-ads", "desarrollo-web"],
    faqs: [
      { question: "¿Plan Starter basta?", answer: "A menudo sí; lo validamos en demo." },
      { question: "¿Agencia mínima?", answer: "Presupuesto acotado tras discovery." },
    ],
    image: img.ops,
  },
  {
    id: "empresas",
    slug: "empresas",
    name: "Empresas",
    short: "Equipos multi-área con gobierno y escala.",
    seoTitle: "NELVYON para empresas",
    seoDescription: "SaaS B2B y enterprise para empresas.",
    challenges: ["Silos", "Permisos", "Reporting"],
    outcomes: ["Stack unificado", "RBAC", "Reportes"],
    modules: ["crm", "pipeline", "workflows", "analytics", "ia"],
    services: ["consultoria", "automatizacion", "ia-agencia"],
    faqs: [
      { question: "¿Enterprise?", answer: "Ver /enterprise para seguridad e implementación." },
      { question: "¿SSO?", answer: "Según proyecto enterprise." },
    ],
    image: img.enterprise,
  },
];

export const useCasesCatalog: readonly UseCaseCatalogItem[] = [
  {
    id: "captacion-local",
    slug: "captacion-local",
    name: "Captación local con CRM y citas",
    audience: "Clínicas, restauración, multi-sede",
    short: "De anuncio a cita confirmada sin fugas.",
    seoTitle: "Caso: captación local | NELVYON",
    seoDescription: "CRM, citas y automatización para captación local.",
    story: [
      { title: "Situación", body: "Leads por formularios y ads con seguimiento manual." },
      { title: "Enfoque", body: "CRM + citas + workflows de recordatorio + campañas." },
      { title: "Resultado operativo", body: "Menos leads fríos y más visibilidad para dirección." },
    ],
    metrics: [
      { label: "Capas", value: "CRM · Citas · Workflows" },
      { label: "Tipo", value: "Perfil tipificado" },
    ],
    image: img.hero,
  },
  {
    id: "ecommerce-retencion",
    slug: "ecommerce-retencion",
    name: "Retención ecommerce post-compra",
    audience: "Tiendas online",
    short: "Flujos post-compra con datos conectados.",
    seoTitle: "Caso: retención ecommerce | NELVYON",
    seoDescription: "Email, CRM y store para retención.",
    story: [
      { title: "Situación", body: "Primera compra ok; repetición débil." },
      { title: "Enfoque", body: "Store + segmentos + campañas + triggers." },
      { title: "Resultado", body: "Ciclos de retención medibles." },
    ],
    metrics: [
      { label: "Capas", value: "Store · Email · CRM" },
      { label: "Tipo", value: "Perfil tipificado" },
    ],
    image: img.service,
  },
  {
    id: "saas-pipeline",
    slug: "saas-pipeline",
    name: "Pipeline SaaS B2B con nurturing",
    audience: "Equipos growth B2B",
    short: "De MQL a oportunidad con contexto.",
    seoTitle: "Caso: pipeline SaaS | NELVYON",
    seoDescription: "CRM, pipeline y email para B2B.",
    story: [
      { title: "Situación", body: "MQLs sin hand-off claro." },
      { title: "Enfoque", body: "CRM + pipeline + secuencias." },
      { title: "Resultado", body: "Embudo legible." },
    ],
    metrics: [
      { label: "Capas", value: "CRM · Pipeline · Campañas" },
      { label: "Tipo", value: "Perfil tipificado" },
    ],
    image: img.platform,
  },
  {
    id: "despacho-captacion",
    slug: "despacho-captacion",
    name: "Captación consultiva para despacho",
    audience: "Abogados y firmas",
    short: "Web + SEO + CRM de consultas.",
    seoTitle: "Caso: despacho | NELVYON",
    seoDescription: "Captación y CRM para despachos.",
    story: [
      { title: "Situación", body: "Consultas por web sin seguimiento." },
      { title: "Enfoque", body: "Web + SEO + CRM + inbox." },
      { title: "Resultado", body: "Pipeline de asuntos ordenado." },
    ],
    metrics: [
      { label: "Capas", value: "Web · SEO · CRM" },
      { label: "Tipo", value: "Perfil tipificado" },
    ],
    image: img.enterprise,
  },
  {
    id: "academia-lms",
    slug: "academia-lms",
    name: "Matrícula y LMS para academia",
    audience: "Educación",
    short: "Funnels + LMS + email.",
    seoTitle: "Caso: academia LMS | NELVYON",
    seoDescription: "Captación y cursos para academias.",
    story: [
      { title: "Situación", body: "Matrículas manuales y contenidos dispersos." },
      { title: "Enfoque", body: "Funnels + LMS + campañas." },
      { title: "Resultado", body: "Embudo de matrícula medible." },
    ],
    metrics: [
      { label: "Capas", value: "LMS · Funnels · Email" },
      { label: "Tipo", value: "Perfil tipificado" },
    ],
    image: img.blog,
  },
  {
    id: "enterprise-gobierno",
    slug: "enterprise-gobierno",
    name: "Gobierno enterprise de marketing ops",
    audience: "Empresas multi-equipo",
    short: "RBAC, auditoría e integraciones.",
    seoTitle: "Caso: enterprise | NELVYON",
    seoDescription: "Seguridad y gobierno para marketing ops.",
    story: [
      { title: "Situación", body: "Herramientas sueltas y riesgo." },
      { title: "Enfoque", body: "Tenant + RBAC + DPA + integraciones." },
      { title: "Resultado", body: "Operación auditable." },
    ],
    metrics: [
      { label: "Capas", value: "Security · Workflows · Portal" },
      { label: "Tipo", value: "Perfil tipificado" },
    ],
    image: img.enterprise,
  },
];

export const integrationsCatalog: readonly IntegrationCatalogItem[] = [
  { id: "stripe", slug: "stripe", name: "Stripe", category: "Pagos", short: "Checkout y plan del tenant.", connectivity: "nativo", status: "en_producto", statusNote: "Nativo en billing", capabilities: ["Checkout", "Webhooks", "Sincronización de plan"], initial: "S" },
  { id: "aws-ses", slug: "aws-ses", name: "AWS SES", category: "Email", short: "Entrega de campañas.", connectivity: "nativo", status: "en_producto", statusNote: "Requiere credenciales SES", capabilities: ["Envío", "Bounces", "Tracking"], initial: "A" },
  { id: "google", slug: "google", name: "Google", category: "Ads y datos", short: "Ads y propiedades según proyecto.", connectivity: "oauth", status: "por_proyecto", statusNote: "OAuth / proyecto", capabilities: ["Google Ads", "Analytics", "Export ops"], initial: "G" },
  { id: "meta", slug: "meta", name: "Meta", category: "Ads y social", short: "Publicidad y canales Meta.", connectivity: "oauth", status: "por_proyecto", statusNote: "Activación por proyecto", capabilities: ["Meta Ads", "Pixel/CAPI", "Mensajería"], initial: "M" },
  { id: "whatsapp", slug: "whatsapp", name: "WhatsApp", category: "Mensajería", short: "WhatsApp Business vía Twilio.", connectivity: "api", status: "en_producto", statusNote: "Requiere Twilio", capabilities: ["Mensajes", "Plantillas", "Inbox"], initial: "W" },
  { id: "microsoft", slug: "microsoft", name: "Microsoft", category: "Productividad", short: "Ecosistema Microsoft.", connectivity: "oauth", status: "enterprise", statusNote: "Proyectos enterprise", capabilities: ["Outlook", "Calendario", "SSO si aplica"], initial: "Ms" },
  { id: "slack", slug: "slack", name: "Slack", category: "Colaboración", short: "Alertas operativas.", connectivity: "webhook", status: "por_proyecto", statusNote: "Webhooks", capabilities: ["Alertas workflow", "Leads"], initial: "Sl" },
  { id: "outlook", slug: "outlook", name: "Outlook", category: "Email", short: "Correo y calendario Microsoft.", connectivity: "oauth", status: "enterprise", statusNote: "Enterprise", capabilities: ["Correo", "Citas"], initial: "O" },
  { id: "twilio", slug: "twilio", name: "Twilio", category: "Comms", short: "SMS y voz.", connectivity: "api", status: "en_producto", statusNote: "SMS bulk off por defecto", capabilities: ["SMS", "WhatsApp", "Dialer"], initial: "T" },
  { id: "zoom", slug: "zoom", name: "Zoom", category: "Meetings", short: "Reuniones y enlaces de cita.", connectivity: "oauth", status: "por_proyecto", statusNote: "Por proyecto", capabilities: ["Meetings", "Enlaces", "Recordatorios"], initial: "Z" },
  { id: "openai", slug: "openai", name: "OpenAI", category: "IA", short: "Modelos para agentes con gobierno.", connectivity: "api", status: "enterprise", statusNote: "Kill-switch en prod", capabilities: ["Completions", "Agentes", "Gobierno spend"], initial: "AI" },
  { id: "calendarios", slug: "calendarios", name: "Calendarios", category: "Productividad", short: "Sincronización de agenda.", connectivity: "oauth", status: "por_proyecto", statusNote: "Google/Microsoft según setup", capabilities: ["Sync", "Disponibilidad", "Citas"], initial: "C" },
  { id: "correo", slug: "correo", name: "Correo", category: "Email", short: "Canales de correo operativos.", connectivity: "api", status: "en_producto", statusNote: "SES + inbox", capabilities: ["Transaccional", "Campañas", "Inbox"], initial: "E" },
  { id: "webhooks", slug: "webhooks", name: "Webhooks", category: "Automatización", short: "Eventos salientes del tenant.", connectivity: "webhook", status: "en_producto", statusNote: "Webhooks de tenant", capabilities: ["Eventos", "Automatizaciones externas"], initial: "Wh" },
  { id: "zapier", slug: "zapier", name: "Zapier / Make", category: "Automatización", short: "Extienda el stack vía webhooks.", connectivity: "webhook", status: "por_proyecto", statusNote: "Vía webhooks", capabilities: ["Zaps", "Escenarios", "Sync"], initial: "Za" },
  { id: "linkedin", slug: "linkedin", name: "LinkedIn", category: "Ads y social", short: "Captación B2B según proyecto.", connectivity: "oauth", status: "por_proyecto", statusNote: "Por proyecto", capabilities: ["Ads", "Lead gen", "Contenido"], initial: "In" },
];

export function getModule(slug: string) {
  return saasModules.find((m) => m.slug === slug || m.id === slug);
}
export function getSector(slug: string) {
  return sectorsCatalog.find((s) => s.slug === slug);
}
export function getUseCase(slug: string) {
  return useCasesCatalog.find((u) => u.slug === slug);
}
export function getIntegration(slug: string) {
  return integrationsCatalog.find((i) => i.slug === slug);
}
export function getAgencyService(slug: string) {
  return agencyServices.find((s) => s.slug === slug || s.id === slug);
}
export function getAgencyServiceByHref(href: string) {
  return agencyServices.find((s) => s.href === href);
}
