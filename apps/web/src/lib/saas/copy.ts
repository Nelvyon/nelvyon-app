/** NELVYON SaaS — user-facing copy (Spanish, marketing digital tone). */

export const SAAS_BRAND = {
  name: "NELVYON",
  tagline: "Marketing digital que ejecuta, no solo planifica",
  productDescription:
    "Packs listos para negocios locales, ecommerce y SaaS B2B. Tú das el brief; NELVYON ejecuta con su OS interno de agentes y te entrega landing, SEO, ads, email y más.",
} as const;

export const SAAS_NAV = {
  home: "Inicio",
  packs: "Packs",
  myResults: "Mis resultados",
  help: "Ayuda",
} as const;

export const SAAS_PACKS_HUB = {
  title: "Packs de marketing digital",
  subtitle:
    "Servicios listos para lanzar: elige según tu tipo de negocio, pulsa demo en 1 clic y recibe entregables en minutos. Sin configurar herramientas ni contratar una agencia completa.",
  emptyFilter: "No hay packs en esta categoría. Prueba «Todos» o «Crecimiento integral».",
  ctaLaunch: "Ver detalle",
  ctaViewResults: "Ver resultados",
  ctaComingSoon: "Próximamente",
  badgeAvailable: "Listo para lanzar",
  badgeBeta: "Demo lista",
  badgeSoon: "Próximamente",
  benefitLabel: "Qué ganas",
} as const;

export const SAAS_PACK_DETAIL = {
  problemTitle: "El problema que resuelve",
  audienceTitle: "Ideal para",
  inputsTitle: "Solo necesitamos",
  outputsTitle: "Recibes en tu panel",
  benefitsTitle: "Beneficios clave",
  behindTitle: "Qué hace NELVYON por detrás (invisible para tu cliente)",
  behindHint:
    "Agentes de IA, plantillas de proceso y conectores trabajan en el OS interno. Tú y tu cliente solo ven el pack y los resultados.",
  launchCta: "Lanzar demo en 1 clic",
  backToCatalog: "← Volver al catálogo",
} as const;

export const SAAS_DASHBOARD = {
  welcomeFirstVisit:
    "Bienvenido a NELVYON. Elige un pack en el catálogo, lanza la demo en 1 clic y revisa tu informe ejecutivo cuando termine.",
  noPacksYet: "Aún no has lanzado ningún pack",
  noPacksYetHint:
    "Ve a Packs, elige uno acorde a tu negocio y usa «Lanzar con plantilla demo» — en unos minutos tendrás entregables reales.",
  packRunning: "NELVYON está ejecutando tu pack",
  packRunningHint:
    "Puedes cerrar esta pantalla. Cuando termine, el informe aparecerá en tu dashboard y los entregables en el portal.",
  packFailed: "No pudimos completar el pack",
  packFailedHint:
    "Revisa que el brief tenga nombre, ciudad y CTA. Si el error continúa, vuelve a lanzar con la plantilla demo.",
  viewReport: "Ver informe ejecutivo",
  launchAnother: "Lanzar otro pack",
} as const;

export const SAAS_KICKOFF = {
  demoButton: "Lanzar con plantilla demo (1 clic)",
  demoRunning: "Ejecutando pack…",
  eliteTemplates: "Plantillas élite incluidas",
  eliteHint: "Copies y diseños premium por sector — con preview antes de lanzar.",
  quickLaunch: "Lanzamiento rápido",
  sectorPick: "O elige sector (2 clics)",
  formSubmit: "Lanzar pack con brief personalizado",
  formRunning: "Ejecutando pack autónomo…",
  progressLoading: "Cargando progreso del pack…",
  progressTitle: "Ejecución en curso",
  successSummary: "Pack completado. Revisa el informe y comparte el portal con tu cliente.",
  invitePortal: "Invitar cliente al portal",
  viewFullReport: "Ver informe completo",
  activateCampaign: "Revisar campaña creada",
} as const;

export const SAAS_REPORT = {
  ceoTitle: "KPIs para dirección",
  deliverablesTitle: "Entregables en portal del cliente",
  deliverablesHint: "Tu cliente revisa landing, informes y emails con un enlace seguro — sin acceder al panel interno.",
  nextStepsTitle: "Próximos pasos recomendados",
  skusTitle: "Servicios autónomos ejecutados",
  postActionsTitle: "Cerrar la entrega",
  publishedBadge: "Publicado",
  portalPreview: "Vista previa portal",
} as const;

export const SAAS_AUTH = {
  loginTitle: "Accede a tu panel",
  loginSubtitle: "Packs, campañas y resultados de marketing digital en un solo lugar.",
  registerTitle: "Crea tu cuenta",
  registerSubtitle: "Empieza con un pack demo gratis y escala cuando lo necesites.",
  verifyEmailPending: "Revisa tu bandeja de entrada para verificar tu email.",
  verifyEmailSuccess: "Email verificado. Ya puedes lanzar cualquier pack.",
  verifyEmailExpired: "El enlace ha caducado. Solicita uno nuevo desde tu perfil.",
  forgotPasswordHint: "Te enviaremos un enlace para restablecer tu contraseña.",
  errorGeneric: "Algo salió mal. Inténtalo de nuevo en unos minutos.",
  errorCredentials: "Email o contraseña incorrectos.",
  errorEmailTaken: "Este email ya está registrado. ¿Quieres iniciar sesión?",
} as const;

export const SAAS_EMPTY_STATES = {
  noCampaigns: {
    title: "Sin campañas todavía",
    description: "Lanza un pack y creamos tu primera campaña automáticamente.",
    cta: "Ver packs",
  },
  noDeliverables: {
    title: "Sin entregables todavía",
    description: "Cuando completes un pack verás aquí landing, SEO, emails y más.",
    cta: "Lanzar un pack",
  },
  noMetrics: {
    title: "Métricas en camino",
    description: "Completa un pack o conecta analytics para ver KPIs en vivo.",
    cta: "Ver packs",
  },
  noClients: {
    title: "Sin clientes en CRM",
    description: "Al lanzar un pack, creamos el cliente y la campaña por ti.",
    cta: "Lanzar pack",
  },
} as const;

export const SAAS_TOOLTIPS = {
  qaScore: "Calidad automática del entregable (0–100).",
  portalLink: "Enlace para que tu cliente revise entregables sin ver el OS.",
  demoLaunch: "Datos de ejemplo para ver el flujo completo sin rellenar el brief.",
  sectorPreset: "Ajusta plantillas al sector de tu negocio.",
  ceoMetrics: "Indicadores ejecutivos: entregables, emails y estado de campaña.",
} as const;

export const SAAS_SUCCESS = {
  packLaunched: "Pack lanzado — NELVYON está trabajando",
  packCompleted: "Listo. Tu informe ejecutivo ya está disponible.",
  emailSent: "Te hemos enviado un email con los siguientes pasos.",
  saved: "Cambios guardados",
} as const;

export const SAAS_ERRORS = {
  packLaunch: "No pudimos lanzar el pack. Comprueba tu conexión e inténtalo de nuevo.",
  packLoad: "No pudimos cargar el estado del pack.",
  reportLoad: "No pudimos cargar el informe. Actualiza la página.",
  unauthorized: "Inicia sesión para acceder a esta sección.",
  packUnavailable: "Este pack estará disponible muy pronto.",
} as const;
