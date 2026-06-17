/** NELVYON SaaS — user-facing copy (Spanish, marketing digital tone). */

export const SAAS_BRAND = {
  name: "NELVYON",
  tagline: "Marketing digital que ejecuta, no solo planifica",
  productDescription:
    "Packs y servicios de marketing digital listos para lanzar: SEO, ads, redes, email y funnels. Tú das el brief; NELVYON entrega planes, copies y activos.",
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
    "Elige un pack según tu negocio. Cada pack recoge los datos mínimos, ejecuta el trabajo por detrás y te entrega resultados listos para usar o revisar con tu equipo.",
  emptyFilter: "No hay packs en esta categoría todavía.",
  ctaLaunch: "Lanzar pack",
  ctaViewResults: "Ver resultados",
  ctaComingSoon: "Próximamente",
  badgeAvailable: "Disponible",
  badgeBeta: "Beta",
  badgeSoon: "Próximamente",
} as const;

export const SAAS_PACK_DETAIL = {
  problemTitle: "Qué resuelve",
  audienceTitle: "Para quién",
  inputsTitle: "Qué necesitamos de ti",
  outputsTitle: "Qué recibes",
  behindTitle: "Qué hace NELVYON por detrás",
  behindHint: "No tienes que configurar agentes ni plantillas: el sistema interno ya está conectado a este pack.",
  launchCta: "Empezar ahora",
  backToCatalog: "← Volver a packs",
} as const;

export const SAAS_DASHBOARD = {
  welcomeFirstVisit:
    "Bienvenido a NELVYON. Empieza eligiendo un pack de marketing digital acorde a tu negocio; en minutos tendrás entregables y un informe ejecutivo.",
  noPacksYet: "Aún no has lanzado ningún pack",
  noPacksYetHint: "Explora el catálogo y lanza tu primer pack con una plantilla demo en un clic.",
  packRunning: "Tu pack se está ejecutando",
  packRunningHint: "Puedes cerrar esta pantalla: te avisaremos cuando el informe esté listo.",
  packFailed: "No pudimos completar el pack",
  packFailedHint: "Revisa el brief e inténtalo de nuevo. Si persiste, contacta con soporte.",
  viewReport: "Ver informe",
  launchAnother: "Lanzar otro pack",
} as const;

export const SAAS_AUTH = {
  loginTitle: "Accede a tu panel",
  loginSubtitle: "Gestiona packs, campañas y resultados de marketing digital.",
  registerTitle: "Crea tu cuenta",
  registerSubtitle: "Empieza gratis con un pack demo y escala cuando lo necesites.",
  verifyEmailPending: "Revisa tu bandeja de entrada para verificar tu email.",
  verifyEmailSuccess: "Email verificado. Ya puedes acceder a todos los packs.",
  verifyEmailExpired: "El enlace ha caducado. Solicita uno nuevo desde tu perfil.",
  forgotPasswordHint: "Te enviaremos un enlace para restablecer tu contraseña.",
  errorGeneric: "Algo salió mal. Inténtalo de nuevo en unos minutos.",
  errorCredentials: "Email o contraseña incorrectos.",
  errorEmailTaken: "Este email ya está registrado. ¿Quieres iniciar sesión?",
} as const;

export const SAAS_EMPTY_STATES = {
  noCampaigns: {
    title: "Sin campañas todavía",
    description: "Lanza un pack para crear tu primera campaña automáticamente.",
    cta: "Ver packs",
  },
  noDeliverables: {
    title: "Sin entregables publicados",
    description: "Cuando completes un pack, aquí verás landing, informes, emails y más.",
    cta: "Lanzar un pack",
  },
  noMetrics: {
    title: "Métricas en camino",
    description: "Conecta analytics o completa un pack para ver KPIs en vivo.",
    cta: "Conectar datos",
  },
  noClients: {
    title: "Sin clientes en CRM",
    description: "Al lanzar un pack, creamos el cliente y la campaña por ti.",
    cta: "Lanzar pack",
  },
} as const;

export const SAAS_TOOLTIPS = {
  qaScore: "Puntuación de calidad automática (0–100) del entregable generado.",
  portalLink: "Enlace para que tu cliente revise entregables sin acceder al panel interno.",
  demoLaunch: "Usa datos de ejemplo para ver el flujo completo sin rellenar el brief.",
  sectorPreset: "Ajusta plantillas y copies al sector de tu negocio.",
  ceoMetrics: "Indicadores ejecutivos: entregables, emails y estado de campaña.",
} as const;

export const SAAS_SUCCESS = {
  packLaunched: "Pack lanzado correctamente",
  packCompleted: "Pack completado. Tu informe ya está disponible.",
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
