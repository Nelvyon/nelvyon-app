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
      "Posicionamiento orgánico, contenido y técnica alineados a la demanda de tu mercado, con reporting conectado a la operación.",
    whatIs:
      "El servicio SEO de NELVYON cubre auditoría, arquitectura de contenido, optimización on-page y seguimiento de rendimiento. Trabajamos con datos reales de tu web y competencia, sin promesas de posiciones garantizadas.",
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
      "Campañas en buscadores y redes sociales con estructura, creatividades y optimización orientadas a adquisición medible.",
    whatIs:
      "Diseñamos y operamos campañas de paid media (Google, Meta y otros canales según alcance) con foco en estructura, mensajes y revisión de rendimiento. Sin prometer ROAS fijo: optimizamos con datos de plataforma.",
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
      "Identidad, mensaje y coherencia visual para que marketing y ventas hablen el mismo idioma.",
    whatIs:
      "Trabajamos posicionamiento, narrativa y sistema visual aplicable a web, campañas y piezas comerciales. El objetivo es claridad y consistencia, no solo un logo aislado.",
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
      "Calendarios editoriales, copy y piezas para blog y redes, alineados a SEO y campañas.",
    whatIs:
      "Producción y planificación de contenido con criterio de marca y objetivo comercial. Combinamos redacción, repurposing y coordinación con canales de distribución.",
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
      "Secuencias, newsletters y automatizaciones de email conectadas al CRM y al journey comercial.",
    whatIs:
      "Diseñamos flujos de email (bienvenida, nurturing, reactivación) integrados con tu base de contactos y etapas de venta. Medimos aperturas y clics con las herramientas que uses o con NELVYON.",
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
      "Sitios y landings rápidos, orientados a conversión y conectados a captación y CRM.",
    whatIs:
      "Diseño y desarrollo de webs corporativas, landings de campaña y páginas de producto. Priorizamos rendimiento, claridad del mensaje e integración con formularios y analítica.",
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
      "Tiendas y funnels de venta con operación conectada a inventario, campañas y post-venta.",
    whatIs:
      "Implementación y optimización de ecommerce: catálogo, checkout, tracking y coordinación con publicidad y automatizaciones. Trabajamos con plataformas acordadas en proyecto.",
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
      "Flujos entre marketing, ventas y operación para eliminar tareas repetitivas y errores manuales.",
    whatIs:
      "Diseñamos automatizaciones (email, tareas, asignaciones, alertas) sobre la plataforma NELVYON y herramientas conectadas. El foco es continuidad operativa, no bots decorativos.",
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
  title: "NELVYON SaaS: una plataforma para gestionar crecimiento, clientes y automatización",
  subtitle:
    "Centraliza CRM, leads, pipeline, calendarios, formularios, automatizaciones, WhatsApp, email marketing, landing pages, analítica e IA en un solo entorno.",
};

export const nelvyonSaasPage = {
  replacesTitle: "NELVYON SaaS reduce la dependencia de múltiples herramientas desconectadas",
  replacesIntro:
    "En lugar de saltar entre CRM, formularios, mensajería y reporting en silos, NELVYON concentra las capas operativas que tu negocio usa a diario.",
  replacesItems: [
    "CRM",
    "Formularios",
    "Calendarios",
    "WhatsApp",
    "Email marketing",
    "Automatizaciones",
    "Landing pages",
    "Analítica",
  ],
  audienceTitle: "Para quién es NELVYON SaaS",
  audiences: [
    "Negocios locales que necesitan ordenar clientes y seguimiento",
    "Agencias que gestionan varias marcas o cuentas",
    "Clínicas y servicios con citas, leads y comunicación recurrente",
    "Ecommerce que conectan campañas, pedidos y post-venta",
    "Profesionales que centralizan captación y venta",
    "Empresas que quieren unificar marketing y operación comercial",
  ],
  differenceTitle: "Diseñado para operar, no solo para almacenar datos",
  differenceBody:
    "NELVYON SaaS no busca ser solo un CRM. Su objetivo es conectar captación, seguimiento, automatización y análisis para que cada lead tenga un proceso claro desde el primer contacto.",
};

export const nelvyonSaasFaq = [
  {
    question: "¿NELVYON SaaS sustituye a un CRM?",
    answer:
      "Incluye CRM y pipeline, pero el enfoque es operativo: conectar captación, seguimiento y automatización en un mismo entorno, no solo guardar contactos.",
  },
  {
    question: "¿Incluye automatizaciones?",
    answer:
      "Sí. Los workflows y reglas dependen de tu plan y de los módulos activos en tu workspace.",
  },
  {
    question: "¿Puede conectarse con herramientas externas?",
    answer:
      "Sí, según el catálogo de integraciones disponible (ads, mensajería, pagos, etc.). Lo revisamos en el diagnóstico inicial.",
  },
  {
    question: "¿Es para empresas pequeñas o grandes?",
    answer:
      "Para equipos en crecimiento y operaciones consolidadas. Los planes Starter, Growth y Elite escalan alcance y soporte.",
  },
  {
    question: "¿Se puede usar junto a los servicios de NELVYON?",
    answer:
      "Sí. Muchos clientes combinan plataforma SaaS con servicios de marketing, automatización o implementación.",
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
      "Registro único de contactos, empresas y actividades. Listas, historial y seguimiento comercial enlazado a campañas y automatizaciones del mismo workspace. Evita duplicados y pérdida de contexto entre equipos.",
  },
  {
    id: "leads",
    title: "Leads",
    description:
      "Captura desde formularios y campañas, scoring y paso a CRM para que ninguna oportunidad quede fuera del pipeline comercial. Cada lead entra con origen, etapa y siguiente acción definida.",
  },
  {
    id: "pipeline",
    title: "Pipeline",
    description:
      "Etapas de venta configurables, totales por fase y movimiento de oportunidades con visibilidad para dirección y equipo comercial. El pipeline refleja el proceso real, no solo una lista de deals.",
  },
  {
    id: "calendarios",
    title: "Calendarios",
    description:
      "Coordinación de citas y seguimientos dentro del flujo operativo, según integraciones activas en tu workspace.",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description:
      "Mensajería y cobros vinculados al CRM donde la integración esté configurada (Text2Pay, conectores aprobados).",
  },
  {
    id: "email-marketing",
    title: "Email Marketing",
    description:
      "Campañas, secuencias y warmup de dominio para nurturing y outbound alineados con etapas del pipeline.",
  },
  {
    id: "automatizaciones",
    title: "Automatizaciones",
    description:
      "Workflows que asignan tareas, envían comunicaciones y actualizan el CRM según reglas y eventos del negocio. Reduce seguimiento manual y errores entre marketing y ventas.",
  },
  {
    id: "ia",
    title: "IA",
    description:
      "Agentes y asistentes del OS NELVYON para apoyar tareas de marketing y operación dentro de cada módulo contratado.",
  },
  {
    id: "formularios",
    title: "Formularios",
    description:
      "Captación estructurada conectada a leads y CRM; base para landings, campañas y funnels de adquisición.",
  },
  {
    id: "landing-pages",
    title: "Landing Pages",
    description:
      "Constructor web (web-builder) para páginas de conversión enlazadas a campañas, formularios y seguimiento.",
  },
  {
    id: "analitica",
    title: "Analítica",
    description:
      "Paneles de campañas, uso y señales operativas en el dashboard; reporting ejecutivo según plan y alcance acordado. Conecta inversión, captación y conversión en una misma lectura.",
  },
  {
    id: "integraciones",
    title: "Integraciones",
    description:
      "Conexión con publicidad, mensajería, pagos y herramientas del stack desde el catálogo del dashboard de integraciones.",
  },
  {
    id: "roles",
    title: "Roles de usuario",
    description:
      "Permisos por workspace para separar configuración, ventas y operación diaria en equipos multidisciplinares.",
  },
] as const;

export const nelvyonAboutFull = {
  porQueExiste: {
    title: "Por qué existe NELVYON",
    body: "NELVYON nace para ayudar a negocios que necesitan crecer con más orden, más tecnología y menos dependencia de procesos manuales. Muchas empresas tienen herramientas, campañas y canales activos, pero no un sistema conectado. NELVYON busca unir estrategia, software, automatización e IA en una operación digital más simple y potente.",
  },
  historia:
    "NELVYON surge de la necesidad de unificar marketing, ventas y tecnología en empresas que crecían más rápido que su operación. Vimos equipos con buenas campañas pero CRM desordenado, automatizaciones a medias y reporting que llegaba tarde.",
  mision:
    "Construir sistemas digitales que ayuden a empresas a captar, vender, automatizar y operar con más claridad.",
  vision:
    "Convertir NELVYON en una plataforma de referencia para negocios que quieren centralizar marketing, ventas, automatización e inteligencia artificial.",
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
