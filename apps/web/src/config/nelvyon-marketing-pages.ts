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
    path: "/ecommerce",
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
    "Una plataforma diseñada para conectar CRM, automatización, comunicación, captación y análisis dentro de un mismo entorno.",
  cta: "Solicitar acceso",
};

export const nelvyonSaasProblem = {
  title: "Demasiadas herramientas. Demasiada complejidad.",
  body: "Muchas empresas gestionan clientes, formularios, calendarios, campañas, automatizaciones y seguimiento comercial en plataformas separadas. Esto genera fricción, pérdida de información y procesos difíciles de mantener.",
};

export const nelvyonSaasVision = {
  body: "NELVYON SaaS está diseñado para reunir las piezas principales del crecimiento digital en una sola plataforma. El objetivo no es añadir más herramientas, sino reducir complejidad y crear una operación más clara.",
};

export const nelvyonSaasPage = {
  modulesTitle: "Qué puede gestionar",
  modulesIntro:
    "Módulos del workspace NELVYON. La disponibilidad concreta depende de tu plan, configuración e integraciones activas.",
  replacesTitle: "Qué sustituye",
  replacesIntro:
    "El objetivo es reducir la dependencia de múltiples herramientas cuando tenga sentido hacerlo.",
  replacesItems: [
    "CRM aislados",
    "Formularios independientes",
    "Calendarios separados",
    "Herramientas de seguimiento",
    "Automatizaciones dispersas",
    "Sistemas desconectados",
  ],
  audienceTitle: "Para quién es",
  audiences: [
    "Negocios locales",
    "Agencias",
    "Ecommerce",
    "Clínicas",
    "Consultores",
    "Empresas en crecimiento",
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
  title: "Servicios diseñados para conectar estrategia, ejecución y tecnología",
  intro:
    "No trabajamos servicios aislados. Cada área de NELVYON está pensada para mejorar una parte del sistema de crecimiento: visibilidad, conversión, automatización, marca, seguimiento y venta.",
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
    "Áreas de ejecución que cubren el ciclo completo de crecimiento digital: desde la visibilidad hasta la operación interna.",
  categories: [
    {
      id: "marketing",
      title: "Marketing",
      intro:
        "Canales de adquisición y posicionamiento con método, medición y continuidad entre campañas y seguimiento comercial.",
      items: [
        { title: "SEO", description: "Visibilidad orgánica con auditoría, arquitectura editorial y priorización por demanda real." },
        { title: "Publicidad", description: "Paid media estructurado con seguimiento de coste, volumen y calidad de lead." },
        { title: "Redes Sociales", description: "Presencia, contenido y coordinación de canales sociales alineados a objetivos comerciales." },
        { title: "Email Marketing", description: "Secuencias, newsletters y nurturing conectados al recorrido comercial." },
        { title: "Contenido", description: "Producción editorial y piezas para blog, redes y campañas con cadencia sostenible." },
      ],
    },
    {
      id: "desarrollo",
      title: "Desarrollo",
      intro:
        "Activos digitales orientados a conversión, rendimiento e integración con captación y operación comercial.",
      items: [
        { title: "Web Corporativa", description: "Sitios profesionales con mensaje claro, velocidad y eventos de conversión medibles." },
        { title: "Ecommerce", description: "Tiendas online con funnel de compra, tracking y coordinación con campañas y post-venta." },
        { title: "Landing Pages", description: "Páginas de campaña optimizadas para captación y conexión directa con CRM y automatizaciones." },
        { title: "Funnels", description: "Recorridos de conversión diseñados para mover al usuario entre etapas con seguimiento en cada paso." },
      ],
    },
    {
      id: "automatizacion",
      title: "Automatización",
      intro:
        "Procesos repetibles entre marketing, ventas y operación para reducir trabajo manual y mejorar el seguimiento.",
      items: [
        { title: "Automatización IA", description: "Flujos asistidos por IA para tareas repetitivas de clasificación, respuesta y priorización." },
        { title: "CRM", description: "Implementación y configuración de CRM para estructurar contactos, pipeline y actividades comerciales." },
        { title: "Seguimiento Comercial", description: "Reglas de alerta, tareas y recordatorios para que ninguna oportunidad quede sin respuesta." },
        { title: "Lead Management", description: "Captura, scoring, asignación y paso de leads entre marketing y ventas con criterio definido." },
        { title: "Flujos de trabajo", description: "Workflows documentados que conectan herramientas, equipos y acciones según eventos del negocio." },
      ],
    },
    {
      id: "datos",
      title: "Datos",
      intro:
        "Lectura operativa del negocio: qué funciona, dónde hay fricción y qué decisiones tomar con información consolidada.",
      items: [
        { title: "Dashboards", description: "Cuadros de mando con KPIs comerciales y de marketing en una vista accionable." },
        { title: "Analítica", description: "Seguimiento de tráfico, campañas y conversiones con criterio de atribución acordado." },
        { title: "Reportes", description: "Informes periódicos con hallazgos claros y siguientes pasos, no solo exportaciones de datos." },
      ],
    },
    {
      id: "operacion",
      title: "Operación Digital",
      intro:
        "Organización interna del crecimiento: procesos, roles y sistemas que sostienen la ejecución día a día.",
      items: [
        { title: "Organización comercial", description: "Estructura de equipos, etapas y responsables para que ventas y marketing operen con claridad." },
        { title: "Procesos internos", description: "Mapeo y diseño de flujos internos entre departamentos, herramientas y puntos de contacto." },
        { title: "Optimización operativa", description: "Identificación de cuellos de botella y mejoras concretas en tiempos, costes y calidad de servicio." },
        { title: "Sistemas digitales", description: "Arquitectura de herramientas conectadas para que datos, campañas y seguimiento no vivan aislados." },
      ],
    },
    {
      id: "ia",
      title: "IA",
      intro:
        "Inteligencia artificial aplicada a tareas concretas de marketing y operación, con criterio y supervisión humana.",
      items: [
        { title: "Asistentes IA", description: "Agentes configurados para apoyar tareas de respuesta, clasificación y preparación de contenido." },
        { title: "Automatización documental", description: "Generación y estructuración de documentos operativos a partir de datos y plantillas del negocio." },
        { title: "Generación de contenido", description: "Borradores, variantes y adaptaciones de copy alineados a voz de marca y objetivo de canal." },
        { title: "Optimización de procesos", description: "Análisis de flujos existentes para detectar pasos automatizables o eliminables con IA." },
      ],
    },
  ],
} as const;

export const nelvyonAboutFull = {
  fraseFuerte:
    "NELVYON no nace para vender acciones sueltas, sino para construir sistemas digitales completos.",
  loQueNoHacemos: {
    title: "Lo que no hacemos",
    items: [
      "No prometemos resultados garantizados.",
      "No vendemos soluciones genéricas.",
      "No aplicamos la misma estructura a todos los negocios.",
      "No añadimos tecnología sin sentido.",
      "No trabajamos acciones sueltas sin estrategia.",
    ],
    cierre:
      "NELVYON busca construir sistemas útiles, medibles y sostenibles, no promesas vacías.",
  },
  porQueExiste: {
    title: "Por qué existe NELVYON",
    body: "NELVYON nace para ayudar a negocios que necesitan crecer con más orden, más tecnología y menos dependencia de procesos manuales. Muchas empresas tienen herramientas, campañas y canales activos, pero no un sistema conectado. NELVYON busca unir estrategia, software, automatización e IA en una operación digital más simple y potente.",
  },
  historia:
    "NELVYON surge de la necesidad de unificar marketing, ventas y tecnología en empresas que crecían más rápido que su operación. Vimos equipos con buenas campañas pero CRM desordenado, automatizaciones a medias y reporting que llegaba tarde.",
  mision:
    "Construir sistemas digitales que ayuden a empresas a captar, vender, automatizar y operar con más claridad.",
  vision:
    "Convertir NELVYON en una plataforma de referencia para negocios que quieren unificar marketing, ventas, automatización e inteligencia artificial.",
  valores: [
    { title: "Claridad", body: "Alcances, responsables y entregables definidos desde el inicio." },
    { title: "Tecnología útil", body: "Software y automatización que resuelven fricción real." },
    { title: "Ejecución profesional", body: "Implementación con método, no solo consultoría." },
    { title: "Automatización con sentido", body: "Flujos que ahorran trabajo y mejoran seguimiento." },
    { title: "Crecimiento sostenible", body: "Sistemas que escalan sin multiplicar el caos." },
    { title: "Transparencia", body: "Sin promesas vacías ni métricas que no puedas revisar." },
  ],
  filosofia:
    "Creemos que el marketing moderno es operaciones: datos, procesos, personas y tecnología en la misma capa. Por eso NELVYON no separa agencia de software.",
  comoTrabajamos: [
    { step: "01", title: "Diagnóstico", body: "Canales, herramientas, procesos y prioridades." },
    { step: "02", title: "Plan", body: "Roadmap con servicios, SaaS e integraciones." },
    { step: "03", title: "Implementación", body: "Ejecución con hitos y panel compartido." },
    { step: "04", title: "Operación", body: "Revisión, optimización y escalado." },
  ],
  diferencia: [
    "Servicios y plataforma en el mismo partner, no proveedores desconectados.",
    "Foco en procesos y continuidad, no en entregables sueltos.",
    "IA y automatización como soporte operativo, no como claim vacío.",
    "Comunicación directa y reporting que ya puedes auditar.",
  ],
};

export const nelvyonContactChannels = {
  intro:
    "Cuéntanos qué necesita tu negocio y analizaremos si NELVYON puede ayudarte con SaaS, servicios de marketing, automatización o una combinación de ambos.",
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
