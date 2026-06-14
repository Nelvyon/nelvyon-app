export type ServicePageContent = {
  slug: string;
  path: string;
  title: string;
  eyebrow: string;
  summary: string;
  whatIs: string;
  forWho: string[];
  benefits: string[];
  includes: string[];
  process: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
};

export const nelvyonServicePages: Record<string, ServicePageContent> = {
  seo: {
    slug: "seo",
    path: "/seo",
    title: "SEO",
    eyebrow: "Servicio NELVYON",
    summary:
      "Visibilidad orgánica y captación a largo plazo: técnica, contenido y prioridades según demanda real de tu mercado.",
    whatIs:
      "NELVYON trabaja SEO como canal de adquisición sostenible: auditoría, arquitectura editorial, on-page y seguimiento. Sin promesas de posiciones; con criterio técnico y datos de tu web y competencia.",
    forWho: [
      "Marcas que dependen de captación orgánica y necesitan priorizar esfuerzos.",
      "Equipos con web activa que quieren orden técnico y editorial.",
      "Negocios que combinan SEO con CRM y automatización en NELVYON.",
    ],
    benefits: [
      "Visibilidad sobre qué páginas y clusters priorizar.",
      "Contenido alineado a intención de búsqueda y conversión.",
      "Menos fricción entre SEO, campañas y seguimiento comercial.",
    ],
    includes: [
      "Auditoría técnica y de contenido",
      "Mapa de keywords y clusters",
      "Plan editorial y optimizaciones on-page",
      "Seguimiento de tráfico y conversiones",
      "Coordinación con paid media y CRM cuando aplica",
    ],
    process: [
      { title: "Diagnóstico", body: "Revisamos web, competencia, indexación y objetivos comerciales." },
      { title: "Arquitectura", body: "Definimos estructura, prioridades y calendario de ejecución." },
      { title: "Implementación", body: "Ejecutamos mejoras técnicas, contenido y enlazado interno." },
      { title: "Operación", body: "Revisamos métricas y ajustamos según datos, no suposiciones." },
    ],
    faq: [
      {
        question: "¿Garantizáis la primera posición en Google?",
        answer: "No. Trabajamos con criterio técnico y de contenido; los resultados dependen del mercado y la ejecución continua.",
      },
      {
        question: "¿Podéis integrar SEO con la plataforma NELVYON?",
        answer: "Sí. Cuando usas SaaS, el seguimiento de leads y campañas puede vivir en el mismo entorno operativo.",
      },
    ],
  },
  ads: {
    slug: "ads",
    path: "/ads",
    title: "Publicidad",
    eyebrow: "Servicio NELVYON",
    summary:
      "Captación inmediata con campañas estructuradas, creatividades y optimización basada en datos de plataforma.",
    whatIs:
      "NELVYON diseña y opera paid media (Google, Meta y otros según alcance) con foco en volumen, coste y calidad de lead. Medimos y ajustamos; no prometemos ROAS fijo.",
    forWho: [
      "Empresas que necesitan volumen de leads o ventas con presupuesto controlado.",
      "Equipos que ya invierten en ads pero carecen de método y reporting unificado.",
      "Marcas que quieren conectar campañas con CRM y automatizaciones NELVYON.",
    ],
    benefits: [
      "Estructura de campañas clara y mantenible.",
      "Tests de mensajes y creatividades con criterio.",
      "Visibilidad de coste y calidad de lead en un solo flujo operativo.",
    ],
    includes: [
      "Estrategia de canal y presupuesto",
      "Configuración de campañas y audiencias",
      "Creatividades y copy (según alcance)",
      "Optimización y reporting periódico",
      "Enlace con landing y CRM cuando corresponde",
    ],
    process: [
      { title: "Objetivo", body: "Definimos KPIs, funnel y mensaje según tu oferta." },
      { title: "Lanzamiento", body: "Montamos campañas, píxeles y seguimiento de conversiones." },
      { title: "Optimización", body: "Pausamos lo que no rinde y escalamos variantes ganadoras." },
      { title: "Revisión", body: "Cadencia acordada con informe accionable." },
    ],
    faq: [
      {
        question: "¿Gestionáis el presupuesto de la cuenta de anuncios?",
        answer: "La inversión en plataforma la controlas tú; nosotros operamos campañas y optimización según el plan acordado.",
      },
      {
        question: "¿Qué canales cubrís?",
        answer: "Principalmente Google y Meta; otros canales se valoran según sector y objetivo.",
      },
    ],
  },
  branding: {
    slug: "branding",
    path: "/branding",
    title: "Branding",
    eyebrow: "Servicio NELVYON",
    summary:
      "Identidad, confianza y percepción premium: mensaje y sistema visual coherentes en cada punto de contacto.",
    whatIs:
      "NELVYON define posicionamiento, narrativa y guías visuales aplicables a web, campañas y ventas. Buscamos claridad y consistencia de marca, no solo un logo suelto.",
    forWho: [
      "Marcas en reposicionamiento o lanzamiento.",
      "Equipos con múltiples proveedores que generan mensajes dispares.",
      "Negocios que escalan y necesitan guías de marca operativas.",
    ],
    benefits: [
      "Mensaje diferenciado y aplicable en canales.",
      "Menos retrabajo entre diseño, copy y campañas.",
      "Base sólida para web y publicidad.",
    ],
    includes: [
      "Propuesta de valor y mensajes clave",
      "Guía de tono y aplicaciones",
      "Dirección visual (paleta, tipografía, uso)",
      "Aplicación en activos prioritarios acordados",
    ],
    process: [
      { title: "Discovery", body: "Audiencia, competencia y objetivos de negocio." },
      { title: "Sistema", body: "Definimos narrativa y piezas base de identidad." },
      { title: "Despliegue", body: "Aplicamos en web, campañas y materiales acordados." },
      { title: "Handoff", body: "Entregamos guías para que tu equipo mantenga coherencia." },
    ],
    faq: [
      {
        question: "¿Incluye diseño de logo desde cero?",
        answer: "Según alcance del proyecto; lo definimos en la propuesta inicial.",
      },
    ],
  },
  contenido: {
    slug: "contenido",
    path: "/contenido",
    title: "Contenido",
    eyebrow: "Servicio NELVYON",
    summary:
      "Autoridad, redes y comunicación: contenido alineado a marca, SEO y campañas activas.",
    whatIs:
      "NELVYON planifica y produce contenido con criterio comercial: pilares editoriales, copy y piezas para blog y redes. Coordinamos con SEO y paid cuando aplica.",
    forWho: [
      "Equipos sin capacidad interna de contenido constante.",
      "Marcas que alimentan SEO y redes desde un mismo plan.",
      "Negocios B2B que necesitan autoridad y nurturing.",
    ],
    benefits: [
      "Cadencia editorial sostenible.",
      "Mensaje coherente entre blog, email y redes.",
      "Menos tiempo entre idea y publicación.",
    ],
    includes: [
      "Pilares y calendario editorial",
      "Artículos y posts (según volumen acordado)",
      "Adaptación a formatos prioritarios",
      "Coordinación con SEO y paid media",
    ],
    process: [
      { title: "Brief", body: "Voz, audiencia y objetivos por canal." },
      { title: "Producción", body: "Borradores, revisión y aprobación contigo." },
      { title: "Publicación", body: "Entrega o soporte en tu CMS/redes." },
      { title: "Iteración", body: "Ajuste según rendimiento y feedback." },
    ],
    faq: [
      {
        question: "¿Publicáis directamente en nuestras redes?",
        answer: "Depende del acuerdo: podemos entregar listo para publicar o apoyar en la publicación.",
      },
    ],
  },
  "email-marketing": {
    slug: "email-marketing",
    path: "/email-marketing",
    title: "Email Marketing",
    eyebrow: "Servicio NELVYON",
    summary:
      "Relación, nutrición y conversión: email conectado al CRM y al recorrido comercial.",
    whatIs:
      "NELVYON diseña secuencias, newsletters y reglas de envío (bienvenida, nurturing, reactivación) integradas con tu base y etapas de venta. Medimos aperturas y clics en tu ESP o en NELVYON.",
    forWho: [
      "Negocios con base de leads que no nutren de forma sistemática.",
      "Equipos que quieren unir CRM y comunicación por email.",
      "SaaS y servicios con ciclos de venta largos.",
    ],
    benefits: [
      "Más valor desde contactos existentes.",
      "Mensajes alineados a etapa del pipeline.",
      "Automatización que reduce envíos manuales.",
    ],
    includes: [
      "Mapa de journeys y triggers",
      "Redacción de secuencias y newsletters",
      "Configuración en tu ESP o en NELVYON",
      "Revisión de métricas básicas (apertura, clic)",
    ],
    process: [
      { title: "Journey", body: "Definimos etapas desde lead a cliente." },
      { title: "Contenido", body: "Redactamos emails y reglas de envío." },
      { title: "Implementación", body: "Montamos flujos y pruebas." },
      { title: "Optimización", body: "Ajustamos asuntos y CTAs según datos." },
    ],
    faq: [
      {
        question: "¿Necesito traer mi herramienta de email?",
        answer: "Puedes usar la tuya o las capacidades de email/automatización disponibles en NELVYON según tu plan.",
      },
    ],
  },
  "desarrollo-web": {
    slug: "desarrollo-web",
    path: "/desarrollo-web",
    title: "Desarrollo Web",
    eyebrow: "Servicio NELVYON",
    summary:
      "Presencia digital profesional: webs y landings orientadas a conversión, rendimiento e integración con captación.",
    whatIs:
      "NELVYON diseña y desarrolla webs corporativas, landings de campaña y páginas de producto. Priorizamos mensaje claro, velocidad, formularios y eventos de conversión enlazados al CRM.",
    forWho: [
      "Empresas que lanzan oferta o campaña y necesitan landing operativa.",
      "Marcas con web desactualizada que frena conversión.",
      "Equipos que quieren unificar web, ads y seguimiento de leads.",
    ],
    benefits: [
      "Experiencia de usuario clara y medible.",
      "Integración con formularios y CRM NELVYON.",
      "Base técnica mantenible.",
    ],
    includes: [
      "Arquitectura de páginas prioritarias",
      "Diseño y desarrollo responsive",
      "Formularios y eventos de conversión",
      "Puesta en producción y handoff",
    ],
    process: [
      { title: "Alcance", body: "Páginas, mensajes y integraciones necesarias." },
      { title: "Diseño", body: "Wireframes y UI alineados a marca." },
      { title: "Build", body: "Desarrollo, pruebas y optimización básica." },
      { title: "Go-live", body: "Publicación y conexión con campañas/CRM." },
    ],
    faq: [
      {
        question: "¿Incluye mantenimiento continuo?",
        answer: "El mantenimiento se acuerda como servicio aparte o dentro de un plan de operación.",
      },
    ],
  },
  ecommerce: {
    slug: "ecommerce",
    path: "/servicios/ecommerce",
    title: "Ecommerce",
    eyebrow: "Servicio NELVYON",
    summary:
      "Venta online ordenada: funnel, checkout, tracking y coordinación con campañas y post-venta.",
    whatIs:
      "NELVYON implementa y optimiza tiendas online: catálogo, checkout, eventos de conversión y coordinación con ads, email y operación. Plataforma según proyecto acordado.",
    forWho: [
      "Marcas D2C que escalan tráfico y pedidos.",
      "Retailers que unifican campañas y operación.",
      "Negocios que migran de catálogo manual a tienda estructurada.",
    ],
    benefits: [
      "Funnel de compra más claro y medible.",
      "Coordinación entre ads, email y retención.",
      "Menos fricción operativa en picos de demanda.",
    ],
    includes: [
      "Auditoría de funnel y checkout",
      "Mejoras de conversión prioritarias",
      "Tracking de eventos e ingresos",
      "Automatizaciones post-compra (según alcance)",
    ],
    process: [
      { title: "Auditoría", body: "Revisamos tienda, datos y cuellos de botella." },
      { title: "Plan", body: "Priorizamos quick wins y proyectos estructurales." },
      { title: "Ejecución", body: "Implementamos mejoras acordadas." },
      { title: "Seguimiento", body: "Revisión de conversión y ticket medio." },
    ],
    faq: [
      {
        question: "¿Desarrolláis la tienda desde cero?",
        answer: "Sí, o mejoramos una tienda existente; lo definimos en el diagnóstico.",
      },
    ],
  },
  automatizacion: {
    slug: "automatizacion",
    path: "/automatizacion",
    title: "Automatización",
    eyebrow: "Servicio NELVYON",
    summary:
      "Ahorro de tiempo y seguimiento fiable: flujos entre marketing, ventas y operación con reglas claras.",
    whatIs:
      "NELVYON diseña automatizaciones (email, tareas, asignaciones, alertas) en NELVYON y herramientas conectadas. El foco es continuidad operativa y menos trabajo manual, no bots decorativos.",
    forWho: [
      "Equipos que pierden leads por falta de seguimiento automático.",
      "Negocios con procesos repetitivos entre herramientas.",
      "Operaciones que quieren escalar sin multiplicar headcount.",
    ],
    benefits: [
      "Menos trabajo manual en tareas críticas.",
      "Respuesta más rápida a leads y clientes.",
      "Procesos documentados y medibles.",
    ],
    includes: [
      "Mapeo de procesos actuales",
      "Diseño de workflows y triggers",
      "Implementación en NELVYON",
      "Documentación y handoff al equipo",
    ],
    process: [
      { title: "Mapeo", body: "Identificamos fugas y tareas repetitivas." },
      { title: "Diseño", body: "Definimos flujos, reglas y responsables." },
      { title: "Build", body: "Configuramos automatizaciones y pruebas." },
      { title: "Operación", body: "Monitoreo y ajustes según uso real." },
    ],
    faq: [
      {
        question: "¿Hace falta tener plan SaaS?",
        answer: "La mayoría de automatizaciones viven en la plataforma; el alcance depende de tu plan y integraciones.",
      },
    ],
  },
};

export const nelvyonSaasHero = {
  title: "NELVYON SaaS",
  subtitle:
    "Plataforma para conectar CRM, automatización, comunicación, captación y analítica en un mismo entorno operativo.",
  cta: "Solicitar acceso",
};

export const nelvyonSaasProblem = {
  title: "Demasiadas herramientas. Demasiada complejidad.",
  body: "Muchas empresas gestionan clientes, formularios, calendarios, campañas, automatizaciones y seguimiento comercial en plataformas separadas. Esto genera fricción, pérdida de información y procesos difíciles de mantener.",
};

export const nelvyonSaasVision = {
  body: "NELVYON SaaS está diseñado para reunir las piezas principales del crecimiento digital en una sola plataforma. El objetivo no es añadir más herramientas, sino reducir complejidad y crear una operación más clara.",
};

export const nelvyonSaasPanel = {
  title: "Todo tu sistema comercial en un solo panel",
  subtitle:
    "Cuatro capas operativas conectadas en el mismo workspace. Sin prometer funciones que no existen: cada bloque refleja módulos reales del dashboard NELVYON.",
  blocks: [
    {
      id: "crm-leads",
      title: "CRM y leads",
      description:
        "Contactos, oportunidades, pipeline y captación en un registro compartido. Cada lead entra con origen, etapa y contexto para el equipo comercial.",
      items: ["Contactos y empresas", "Pipeline por etapas", "Captación y scoring", "Actividades de seguimiento"],
    },
    {
      id: "automatizaciones",
      title: "Automatizaciones",
      description:
        "Workflows que ejecutan tareas repetitivas: asignaciones, alertas, actualizaciones de CRM y comunicaciones según reglas del negocio.",
      items: ["Flujos por evento", "Tareas automáticas", "Reglas comerciales", "Menos seguimiento manual"],
    },
    {
      id: "comunicacion",
      title: "Comunicación",
      description:
        "Canales conectados al contexto del cliente: campañas de email, mensajería e integraciones según tu configuración activa.",
      items: ["Email marketing", "Secuencias y nurturing", "WhatsApp (según integración)", "Historial por contacto"],
    },
    {
      id: "ia-analitica",
      title: "IA y analítica",
      description:
        "Paneles operativos para leer captación y conversión, con asistentes del ecosistema NELVYON según módulos contratados.",
      items: ["Dashboard operativo", "Señales de campañas", "Reporting según alcance", "Asistentes IA por módulo"],
    },
  ],
} as const;

export const nelvyonSaasPage = {
  modulesTitle: "Qué puede gestionar",
  modulesIntro:
    "Módulos del workspace NELVYON. La disponibilidad concreta depende de tu plan, configuración e integraciones activas.",
  replacesTitle: "Qué sustituye",
  replacesIntro:
    "Cuando encaja con tu operación, la plataforma puede concentrar funciones que hoy viven en herramientas separadas. No implica sustituir todo de golpe: priorizamos según tu stack y madurez.",
  replacesItems: [
    {
      title: "CRM aislados",
      description: "Contactos, pipeline y actividades en un registro compartido con el resto del workspace.",
    },
    {
      title: "Formularios independientes",
      description: "Captación conectada a leads y seguimiento comercial desde el primer envío.",
    },
    {
      title: "Calendarios separados",
      description: "Citas y recordatorios vinculados al contexto del cliente, según integraciones activas.",
    },
    {
      title: "Herramientas de seguimiento",
      description: "Tareas, alertas y actividades comerciales con reglas claras para el equipo.",
    },
    {
      title: "Automatizaciones dispersas",
      description: "Workflows centralizados con triggers, acciones e historial en un mismo entorno.",
    },
    {
      title: "Sistemas desconectados",
      description: "Menos saltos entre plataformas cuando captación, venta y operación comparten datos.",
    },
  ],
  audienceTitle: "Para quién encaja",
  audiences: [
    {
      label: "Negocios locales",
      description: "Captación y seguimiento con pocos recursos internos y necesidad de orden comercial.",
    },
    {
      label: "Agencias",
      description: "Operación multi-cliente con procesos repetibles y visibilidad por cuenta.",
    },
    {
      label: "Ecommerce",
      description: "Datos de campañas, leads y post-venta en capas que se pueden revisar juntas.",
    },
    {
      label: "Clínicas y servicios",
      description: "Citas, recordatorios y comunicación con continuidad entre equipos.",
    },
    {
      label: "Consultores",
      description: "Pipeline claro, propuestas y nurturing sin depender de hojas sueltas.",
    },
    {
      label: "Empresas en crecimiento",
      description: "Operaciones que escalan y necesitan unificar canales sin multiplicar herramientas.",
    },
  ],
  roadmapTitle: "Roadmap",
  finalCta: "Solicitar acceso a NELVYON SaaS",
};

export const nelvyonSaasRoadmap = {
  disponible: [
    "CRM, contactos y pipeline comercial",
    "Captación y gestión de leads",
    "Automatizaciones y workflows",
    "Campañas de email",
    "Constructor de landing pages",
    "Panel de analítica operativa",
    "Catálogo de integraciones",
  ],
  enDesarrollo: [
    "Calendarios y reservas integradas",
    "WhatsApp y mensajería conectada al CRM",
    "Formularios avanzados con lógica condicional",
    "Reporting ejecutivo ampliado",
  ],
  planificado: [
    "Inbox unificado multicanal",
    "Agentes IA nativos por módulo",
    "Marketplace de plantillas operativas",
    "White-label para agencias",
  ],
} as const;

export const nelvyonSaasFaq = [
  {
    question: "¿Qué es NELVYON SaaS?",
    answer:
      "Es la plataforma operativa de NELVYON: un entorno donde conectar CRM, captación, comunicación, automatizaciones y analítica. No es un conjunto de herramientas sueltas, sino una base para operar el crecimiento digital con más orden.",
  },
  {
    question: "¿Incluye CRM?",
    answer:
      "Sí. Incluye contactos, pipeline, actividades y seguimiento comercial. El CRM es una pieza central, no el único módulo de la plataforma.",
  },
  {
    question: "¿Incluye automatizaciones?",
    answer:
      "Sí. Puedes configurar workflows que asignen tareas, envíen comunicaciones y actualicen registros según reglas del negocio. El alcance depende de tu plan y módulos activos.",
  },
  {
    question: "¿Puede integrarse con otras herramientas?",
    answer:
      "Sí, mediante el catálogo de integraciones del dashboard (publicidad, mensajería, pagos y otras según disponibilidad). Revisamos compatibilidad en el diagnóstico inicial.",
  },
  {
    question: "¿Es para empresas pequeñas o grandes?",
    answer:
      "Para equipos en crecimiento que necesitan estructurar captación y operación comercial, y para operaciones consolidadas que buscan unificar procesos. El alcance se adapta al volumen y madurez de cada negocio.",
  },
  {
    question: "¿Se puede combinar con los servicios de NELVYON?",
    answer:
      "Sí. Es el modelo más habitual: la plataforma para operar y los servicios de NELVYON para estrategia, implementación y optimización continua.",
  },
] as const;

export const nelvyonServiciosIntro = {
  title: "Servicios para conectar estrategia, ejecución y tecnología",
  intro:
    "Cada área de NELVYON resuelve una parte concreta del crecimiento — visibilidad, conversión, automatización, marca y seguimiento — con entregables medibles y conexión al resto del sistema.",
  processTitle: "Cómo trabajamos los servicios",
  steps: [
    {
      title: "Diagnóstico",
      body: "Analizamos la situación actual del negocio, sus canales, puntos de fricción y oportunidades.",
    },
    {
      title: "Estrategia",
      body: "Definimos qué acciones tienen más sentido según el objetivo: captación, conversión, automatización o posicionamiento.",
    },
    {
      title: "Implementación",
      body: "Construimos los activos necesarios: web, campañas, automatizaciones, contenidos, CRM o flujos.",
    },
    {
      title: "Optimización",
      body: "Medimos, ajustamos y mejoramos para que el sistema sea más claro y eficiente.",
    },
  ],
} as const;

export const nelvyonSaasModules = [
  {
    id: "crm",
    title: "CRM",
    description:
      "Base comercial del workspace: empresas, oportunidades, actividades y contexto compartido entre equipos.",
  },
  {
    id: "leads",
    title: "Leads",
    description:
      "Entrada de oportunidades desde campañas y formularios, con origen, etapa y siguiente acción definida.",
  },
  {
    id: "pipeline",
    title: "Pipeline",
    description:
      "Etapas de venta configurables con visibilidad por fase para dirección y equipo comercial.",
  },
  {
    id: "contactos",
    title: "Contactos",
    description:
      "Ficha unificada por persona: datos, historial, etiquetas y comunicaciones en un solo registro.",
  },
  {
    id: "calendarios",
    title: "Calendarios",
    description:
      "Coordinación de citas y seguimientos vinculados al flujo comercial, según integraciones activas.",
  },
  {
    id: "formularios",
    title: "Formularios",
    description:
      "Captación estructurada conectada a leads y CRM como punto de entrada a funnels y campañas.",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description:
      "Mensajería y cobros vinculados al CRM donde la integración esté configurada en tu workspace.",
  },
  {
    id: "email-marketing",
    title: "Email Marketing",
    description:
      "Campañas, secuencias y warmup de dominio alineados con etapas del pipeline comercial.",
  },
  {
    id: "automatizaciones",
    title: "Automatizaciones",
    description:
      "Workflows que ejecutan tareas, envían comunicaciones y actualizan registros según reglas del negocio.",
  },
  {
    id: "landing-pages",
    title: "Landing Pages",
    description:
      "Constructor de páginas de conversión enlazadas a formularios, campañas y seguimiento comercial.",
  },
  {
    id: "analitica",
    title: "Analítica",
    description:
      "Paneles de campañas, uso y señales operativas para leer captación, conversión e inversión.",
  },
  {
    id: "ia",
    title: "IA",
    description:
      "Asistentes del ecosistema NELVYON para apoyar tareas de marketing y operación dentro de cada módulo.",
  },
  {
    id: "roles",
    title: "Roles y permisos",
    description:
      "Accesos por workspace para separar configuración, ventas y operación diaria en equipos multidisciplinares.",
  },
  {
    id: "integraciones",
    title: "Integraciones",
    description:
      "Conexión con publicidad, mensajería, pagos y herramientas del stack desde el catálogo del dashboard.",
  },
] as const;

export const nelvyonServiciosCapacidades = {
  title: "Capacidades NELVYON",
  intro:
    "Soluciones empresariales para construir sistemas completos de crecimiento. Cada capacidad responde a un problema operativo concreto.",
  categories: [
    {
      id: "marketing",
      title: "Marketing",
      intro:
        "Todo lo que atrae demanda: posicionamiento orgánico, campañas de pago, redes, email y contenido. Trabajamos cada canal con método y medición, no como acciones sueltas.",
      items: [
        { title: "SEO", problem: "Tu marca no aparece de forma constante cuando el cliente busca.", solution: "Auditoría técnica, arquitectura editorial y priorización por demanda real.", result: "Visibilidad orgánica estructurada con métricas que puedes revisar." },
        { title: "Publicidad", problem: "Inviertes en anuncios sin claridad sobre qué genera oportunidades.", solution: "Campañas estructuradas con seguimiento de coste, volumen y calidad de lead.", result: "Captación medible con criterio para optimizar inversión." },
        { title: "Redes Sociales", problem: "Presencia dispersa sin conexión con objetivos comerciales.", solution: "Calendario editorial y coordinación de canales alineados a captación y marca.", result: "Redes como canal operativo, no como publicación aislada." },
        { title: "Email Marketing", problem: "Base de contactos sin nutrición sistemática ni continuidad.", solution: "Secuencias, newsletters y reglas de envío conectadas al recorrido comercial.", result: "Más valor desde leads existentes con comunicación por etapas." },
        { title: "Contenido", problem: "Falta de cadencia editorial y mensaje inconsistente entre canales.", solution: "Pilares, calendario y producción alineados a SEO, campañas y ventas.", result: "Autoridad y contenido sostenible sin depender de esfuerzos puntuales." },
      ],
    },
    {
      id: "desarrollo",
      title: "Desarrollo",
      intro:
        "Activos digitales que convierten: webs, tiendas, landings y funnels. Cada pieza se diseña para captar, medir y conectar con el seguimiento comercial.",
      items: [
        { title: "Web Corporativa", problem: "Tu web no transmite confianza ni convierte visitas en oportunidades.", solution: "Sitios con mensaje claro, rendimiento y eventos de conversión medibles.", result: "Presencia digital profesional conectada a captación y CRM." },
        { title: "Ecommerce", problem: "Ventas online con datos y post-venta dispersos entre herramientas.", solution: "Funnel de compra, tracking e integración con campañas y operación.", result: "Tienda ordenada con visibilidad de conversión e ingresos." },
        { title: "Landing Pages", problem: "Campañas sin páginas de destino optimizadas para captar y medir.", solution: "Landings orientadas a conversión con formularios y seguimiento comercial.", result: "Cada campaña con punto de entrada medible al pipeline." },
        { title: "Funnels", problem: "Recorridos de conversión rotos entre etapas sin seguimiento.", solution: "Diseño de funnels con eventos, mensajes y pasos conectados al CRM.", result: "Usuario guiado entre etapas con contexto comercial en cada paso." },
      ],
    },
    {
      id: "automatizacion",
      title: "Automatización",
      intro:
        "Procesos que conectan marketing y ventas: CRM, leads, alertas y workflows. El objetivo es continuidad operativa, no bots decorativos.",
      items: [
        { title: "Automatización IA", problem: "Tareas repetitivas que consumen tiempo del equipo comercial.", solution: "Flujos asistidos por IA para clasificar, responder y priorizar con supervisión humana.", result: "Menos carga manual en operaciones de alto volumen." },
        { title: "CRM", problem: "Contactos y oportunidades repartidos sin pipeline claro.", solution: "Implementación de CRM con contactos, etapas, actividades y roles.", result: "Operación comercial estructurada en un registro compartido." },
        { title: "Seguimiento Comercial", problem: "Leads que se enfrían por falta de respuesta o continuidad.", solution: "Alertas, tareas y recordatorios según reglas del negocio.", result: "Seguimiento más fiable sin depender de memoria del equipo." },
        { title: "Lead Management", problem: "Captación sin criterio de asignación ni paso a ventas.", solution: "Scoring, asignación y traspaso entre marketing y comercial.", result: "Cada lead con origen, responsable y siguiente acción." },
        { title: "Flujos de trabajo", problem: "Procesos manuales entre herramientas y departamentos.", solution: "Workflows documentados con triggers, acciones e integraciones.", result: "Operación repetible y auditable entre equipos y sistemas." },
      ],
    },
    {
      id: "datos",
      title: "Datos",
      intro:
        "Información que sirve para decidir: dashboards, analítica y reportes con lectura clara de qué funciona y qué hay que ajustar.",
      items: [
        { title: "Dashboards", problem: "KPIs repartidos entre herramientas sin vista unificada.", solution: "Cuadros de mando con indicadores comerciales y de marketing accionables.", result: "Lectura operativa clara para decidir prioridades." },
        { title: "Analítica", problem: "Datos de tráfico y campañas difíciles de interpretar.", solution: "Seguimiento de conversiones con criterio de atribución acordado.", result: "Visibilidad sobre qué canales y acciones mueven el negocio." },
        { title: "Reportes", problem: "Informes que llegan tarde o sin conclusiones útiles.", solution: "Reporting periódico con hallazgos y siguientes pasos concretos.", result: "Revisiones productivas, no solo exportaciones de datos." },
      ],
    },
    {
      id: "operacion",
      title: "Operación Digital",
      intro:
        "La capa interna que sostiene el crecimiento: equipos, procesos, optimización y arquitectura de sistemas conectados.",
      items: [
        { title: "Organización comercial", problem: "Equipos comerciales sin etapas, roles ni responsables claros.", solution: "Estructura de pipeline, asignaciones y criterios de seguimiento.", result: "Marketing y ventas operan con el mismo mapa de proceso." },
        { title: "Procesos internos", problem: "Fricción entre departamentos y herramientas desconectadas.", solution: "Mapeo y diseño de flujos internos con puntos de contacto definidos.", result: "Menos retrabajo y handoffs más predecibles." },
        { title: "Optimización operativa", problem: "Cuellos de botella que frenan tiempos, costes o calidad.", solution: "Diagnóstico operativo con mejoras concretas priorizadas.", result: "Operación más eficiente sin multiplicar complejidad." },
        { title: "Sistemas digitales", problem: "Stack tecnológico fragmentado sin arquitectura común.", solution: "Diseño de sistemas conectados entre captación, venta y operación.", result: "Datos, campañas y seguimiento en capas integradas." },
      ],
    },
    {
      id: "ia",
      title: "IA",
      intro:
        "IA aplicada a tareas reales de marketing y operación: asistentes, documentación, contenido y optimización de procesos, siempre con supervisión humana.",
      items: [
        { title: "Asistentes IA", problem: "Equipos saturados en tareas de respuesta y clasificación.", solution: "Agentes configurados para apoyar operaciones repetitivas con supervisión.", result: "Capacidad operativa ampliada sin perder control humano." },
        { title: "Automatización documental", problem: "Documentos operativos que consumen tiempo en preparación manual.", solution: "Generación y estructuración a partir de datos y plantillas del negocio.", result: "Menos tiempo en papeleo y más en ejecución comercial." },
        { title: "Generación de contenido", problem: "Producción lenta de copy para campañas y canales.", solution: "Borradores y variantes alineados a voz de marca y objetivo.", result: "Cadencia de contenido más ágil con revisión humana." },
        { title: "Optimización de procesos", problem: "Flujos con pasos redundantes o difíciles de escalar.", solution: "Análisis de procesos para detectar automatización útil con IA.", result: "Operación más ligera sin añadir tecnología innecesaria." },
      ],
    },
  ],
} as const;

export const nelvyonAboutFull = {
  fraseFuerte:
    "NELVYON existe para construir sistemas digitales completos — no para vender acciones sueltas ni promesas vacías.",
  loQueNoHacemos: {
    title: "Lo que no hacemos",
    items: [
      "No prometemos resultados garantizados.",
      "No vendemos soluciones genéricas.",
      "No aplicamos la misma estructura a todos los negocios.",
      "No añadimos tecnología sin fricción real que resolver.",
      "No ejecutamos acciones sueltas sin arquitectura de sistema.",
    ],
    cierre:
      "Preferimos sistemas útiles, medibles y sostenibles a narrativas de marketing sin soporte operativo.",
  },
  porQueExiste: {
    title: "Por qué existe NELVYON",
    body: "Muchas empresas crecen más rápido que su operación: buenas campañas, CRM desordenado, automatizaciones a medias y datos que llegan tarde. NELVYON nace para unir estrategia, software, automatización e IA en una operación digital más clara y conectada.",
  },
  historia:
    "Empezamos viendo el mismo patrón en negocios en crecimiento: herramientas que no conversan entre sí, equipos comerciales sin continuidad y reporting que no ayuda a decidir. NELVYON se construyó para cerrar esa brecha con tecnología aplicada y ejecución real.",
  mision:
    "Ayudar a empresas a captar, vender, automatizar y operar con sistemas digitales conectados y criterio de largo plazo.",
  vision:
    "Ser la referencia en operación digital para negocios que quieren unificar marketing, ventas, automatización e inteligencia artificial en un mismo entorno.",
  valores: [
    { title: "Claridad", body: "Alcances, responsables y entregables definidos desde el inicio de cada fase." },
    { title: "Tecnología útil", body: "Software y automatización solo donde reducen fricción operativa real." },
    { title: "Ejecución profesional", body: "Implementación con método, hitos y panel compartido — no solo consultoría." },
    { title: "Automatización con sentido", body: "Flujos que ahorran trabajo y mejoran continuidad comercial." },
    { title: "Crecimiento sostenible", body: "Sistemas que escalan sin multiplicar caos ni dependencia de heroísmos manuales." },
    { title: "Transparencia", body: "Métricas y decisiones que el cliente puede revisar y cuestionar." },
  ],
  filosofia:
    "El marketing moderno es operaciones: datos, procesos, personas y tecnología en la misma capa. NELVYON no separa agencia de software porque el crecimiento exige ambos con el mismo criterio.",
  comoTrabajamos: [
    { step: "01", title: "Diagnóstico", body: "Canales, herramientas, procesos comerciales y cuellos de botella reales." },
    { step: "02", title: "Arquitectura", body: "Diseño del sistema: servicios, SaaS, integraciones y prioridades." },
    { step: "03", title: "Implementación", body: "Ejecución con hitos, responsables y panel operativo compartido." },
    { step: "04", title: "Operación", body: "Revisión continua, optimización y escalado según datos." },
  ],
  diferencia: [
    "Servicios y plataforma en el mismo partner — no proveedores desconectados.",
    "Foco en sistemas y continuidad, no en entregables sueltos.",
    "IA y automatización como capa operativa, no como claim decorativo.",
    "Comunicación directa y reporting auditable desde el primer día.",
  ],
};

export const nelvyonContactChannels = {
  intro:
    "Cuéntanos qué necesita tu negocio y revisaremos si NELVYON puede ayudarte con SaaS, servicios de marketing, automatización o una combinación de ambos.",
  antesDeContactar: {
    title: "Antes de contactarnos",
    intro:
      "NELVYON trabaja mejor con negocios que quieren mejorar su presencia digital, su captación y los sistemas de venta, automatización y seguimiento.",
    bullets: [
      "Quieres mejorar tu web o presencia digital.",
      "Quieres captar clientes con más método.",
      "Quieres automatizar procesos.",
      "Quieres entender si NELVYON SaaS encaja con tu negocio.",
      "Quieres combinar SaaS + servicios.",
    ],
  },
  email: "contacto@nelvyon.com",
  whatsappLabel: "WhatsApp",
  whatsappNote:
    "Escríbenos por email indicando tu número y objetivo; te respondemos por el canal acordado.",
  calendarLabel: "Agendar conversación",
  calendarNote:
    "Solicita una reunión desde el formulario y te proponemos horarios según disponibilidad del equipo.",
  formAction: "https://formspree.io/f/xpwzgvbq",
  budgetOptions: [
    "Menos de 500 €/mes",
    "500 – 1.500 €/mes",
    "1.500 – 5.000 €/mes",
    "Más de 5.000 €/mes",
    "Aún no lo sé",
  ],
  needOptions: [
    "Solo SaaS",
    "Solo servicios de marketing",
    "SaaS + servicios",
    "Automatización / IA",
    "No estoy seguro",
  ],
  faq: [
    {
      question: "¿Puedo contratar solo servicios?",
      answer: "Sí. Puedes empezar por servicios puntuales sin contratar la plataforma SaaS.",
    },
    {
      question: "¿Puedo usar solo el SaaS?",
      answer: "Sí. La plataforma está disponible por planes; el alcance depende del módulo y tu configuración.",
    },
    {
      question: "¿NELVYON trabaja con negocios pequeños?",
      answer: "Sí, con equipos en crecimiento. Ajustamos alcance al volumen y madurez de tu operación.",
    },
    {
      question: "¿Se puede combinar SaaS + marketing?",
      answer: "Sí. Es el modelo más habitual: plataforma para operar y servicios para estrategia e implementación.",
    },
  ],
};

export const nelvyonBlogCategories = [
  { id: "ia", label: "IA", description: "Agentes, asistencia y criterio operativo con IA." },
  { id: "automatizacion", label: "Automatización", description: "Workflows, triggers y eficiencia." },
  { id: "marketing", label: "Marketing", description: "Campañas, contenido y adquisición." },
  { id: "ventas", label: "Ventas", description: "Pipeline, seguimiento y conversión." },
  { id: "crm", label: "CRM", description: "Contactos, datos y operación comercial." },
  { id: "saas", label: "SaaS", description: "Plataforma, módulos y buenas prácticas." },
] as const;
