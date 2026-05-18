import {
  LayoutDashboard, Users, Target, Mail, Megaphone, Layers, Share2,
  HeadphonesIcon, MessageSquare, Phone, Workflow, Bot, Calendar,
  FileText, Database, Globe, Palette, BookOpen, ShoppingCart,
  CreditCard, BarChart3, PieChart, Handshake, Settings, Trophy,
  Swords, type LucideIcon,
} from "lucide-react";

export interface SectionAgent {
  id: string;
  name: string;
  role: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  avatar: string;
  pathMatch: string[];
  greeting: Record<string, string>;
  capabilities: string[];
  quickActions: { label: string; prompt: string }[];
  knowledgeBase: { q: string; a: string }[];
}

/* ─── Language detection from browser ─── */
export function detectLanguage(): string {
  const lang = navigator.language?.toLowerCase() || "es";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("it")) return "it";
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ar")) return "ar";
  if (lang.startsWith("hi")) return "hi";
  if (lang.startsWith("ru")) return "ru";
  if (lang.startsWith("tr")) return "tr";
  if (lang.startsWith("nl")) return "nl";
  if (lang.startsWith("pl")) return "pl";
  if (lang.startsWith("sv")) return "sv";
  if (lang.startsWith("da")) return "da";
  if (lang.startsWith("no")) return "no";
  if (lang.startsWith("fi")) return "fi";
  if (lang.startsWith("cs")) return "cs";
  if (lang.startsWith("ro")) return "ro";
  if (lang.startsWith("hu")) return "hu";
  if (lang.startsWith("el")) return "el";
  if (lang.startsWith("th")) return "th";
  if (lang.startsWith("vi")) return "vi";
  if (lang.startsWith("id")) return "id";
  if (lang.startsWith("ms")) return "ms";
  if (lang.startsWith("uk")) return "uk";
  if (lang.startsWith("he")) return "he";
  if (lang.startsWith("fa")) return "fa";
  return "es";
}

export function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    es: "Español", en: "English", pt: "Português", fr: "Français", de: "Deutsch",
    it: "Italiano", zh: "中文", ja: "日本語", ko: "한국어", ar: "العربية",
    hi: "हिन्दी", ru: "Русский", tr: "Türkçe", nl: "Nederlands", pl: "Polski",
    sv: "Svenska", da: "Dansk", no: "Norsk", fi: "Suomi", cs: "Čeština",
    ro: "Română", hu: "Magyar", el: "Ελληνικά", th: "ไทย", vi: "Tiếng Việt",
    id: "Bahasa Indonesia", ms: "Bahasa Melayu", uk: "Українська", he: "עברית", fa: "فارسی",
  };
  return map[code] || "Español";
}

/* ─── Multi-language greetings helper ─── */
function greetings(name: string, section: string): Record<string, string> {
  return {
    es: `¡Hola! Soy ${name}, tu asistente experto en ${section}. ¿En qué puedo ayudarte hoy?`,
    en: `Hi! I'm ${name}, your expert assistant for ${section}. How can I help you today?`,
    pt: `Olá! Sou ${name}, seu assistente especialista em ${section}. Como posso ajudá-lo hoje?`,
    fr: `Bonjour ! Je suis ${name}, votre assistant expert en ${section}. Comment puis-je vous aider ?`,
    de: `Hallo! Ich bin ${name}, Ihr Experte für ${section}. Wie kann ich Ihnen helfen?`,
    it: `Ciao! Sono ${name}, il tuo assistente esperto di ${section}. Come posso aiutarti?`,
    zh: `你好！我是${name}，您的${section}专家助手。今天我能帮您什么？`,
    ja: `こんにちは！${name}です。${section}の専門アシスタントです。何かお手伝いできますか？`,
    ko: `안녕하세요! ${name}입니다. ${section} 전문 어시스턴트입니다. 무엇을 도와드릴까요?`,
    ar: `مرحباً! أنا ${name}، مساعدك الخبير في ${section}. كيف يمكنني مساعدتك؟`,
    hi: `नमस्ते! मैं ${name} हूँ, ${section} में आपका विशेषज्ञ सहायक। आज मैं आपकी कैसे मदद कर सकता हूँ?`,
    ru: `Привет! Я ${name}, ваш эксперт по ${section}. Чем могу помочь?`,
    tr: `Merhaba! Ben ${name}, ${section} uzman asistanınız. Size nasıl yardımcı olabilirim?`,
    nl: `Hallo! Ik ben ${name}, uw expert voor ${section}. Hoe kan ik u helpen?`,
    pl: `Cześć! Jestem ${name}, Twój ekspert od ${section}. Jak mogę Ci pomóc?`,
    sv: `Hej! Jag är ${name}, din expert på ${section}. Hur kan jag hjälpa dig?`,
    da: `Hej! Jeg er ${name}, din ekspert i ${section}. Hvordan kan jeg hjælpe dig?`,
    no: `Hei! Jeg er ${name}, din ekspert på ${section}. Hvordan kan jeg hjelpe deg?`,
    fi: `Hei! Olen ${name}, ${section}-asiantuntijasi. Miten voin auttaa?`,
    cs: `Ahoj! Jsem ${name}, váš expert na ${section}. Jak vám mohu pomoci?`,
    ro: `Bună! Sunt ${name}, asistentul tău expert în ${section}. Cum te pot ajuta?`,
    hu: `Szia! ${name} vagyok, a ${section} szakértő asszisztensed. Miben segíthetek?`,
    el: `Γεια! Είμαι ο/η ${name}, ο ειδικός σας για ${section}. Πώς μπορώ να βοηθήσω;`,
    th: `สวัสดี! ผม/ดิฉัน ${name} ผู้เชี่ยวชาญด้าน ${section} ช่วยอะไรได้บ้างครับ/ค่ะ?`,
    vi: `Xin chào! Tôi là ${name}, trợ lý chuyên gia về ${section}. Tôi có thể giúp gì cho bạn?`,
    id: `Halo! Saya ${name}, asisten ahli ${section} Anda. Apa yang bisa saya bantu?`,
    ms: `Hai! Saya ${name}, pembantu pakar ${section} anda. Bagaimana saya boleh membantu?`,
    uk: `Привіт! Я ${name}, ваш експерт з ${section}. Чим можу допомогти?`,
    he: `!שלום אני ${name}, העוזר המומחה שלך ב-${section}. איך אוכל לעזור?`,
    fa: `!سلام من ${name} هستم، دستیار متخصص شما در ${section}. چطور می‌توانم کمکتان کنم؟`,
  };
}

/* ─── All Section Agents ─── */
export const sectionAgents: SectionAgent[] = [
  {
    id: "agent-autopilot",
    name: "Pilot",
    role: "Director de Piloto Automático",
    icon: LayoutDashboard,
    color: "#10B981",
    gradient: "from-emerald-500 to-green-600",
    avatar: "P",
    pathMatch: ["/saas/autopilot"],
    greeting: greetings("Pilot", "Piloto Automático"),
    capabilities: [
      "Controlar todos los agentes autónomos",
      "Ajustar intensidad de cada agente",
      "Ver actividad en tiempo real",
      "Configurar automatizaciones globales",
      "Reportes de rendimiento de agentes",
    ],
    quickActions: [
      { label: "¿Cómo funciona el piloto?", prompt: "Explícame cómo funciona el Piloto Automático y qué hacen los agentes por mí." },
      { label: "¿Puedo configurar cada agente?", prompt: "¿Cómo puedo ajustar la intensidad y configuración de cada agente autónomo?" },
      { label: "Ver rendimiento", prompt: "¿Cómo veo el rendimiento y las métricas de todos los agentes?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es el Piloto Automático?", a: "El Piloto Automático es el centro de control donde todos los agentes Nelvyon trabajan de forma autónoma por ti: crean campañas, generan contratos, atienden clientes, crean contenido, hacen llamadas de venta y más — todo sin que tengas que hacer nada." },
      { q: "¿Puedo desactivar agentes?", a: "Sí, puedes activar o desactivar cada agente individualmente, y ajustar su nivel de intensidad (Bajo, Medio, Máximo) según tus necesidades." },
    ],
  },
  {
    id: "agent-dashboard",
    name: "Nova",
    role: "Asistente de Dashboard",
    icon: LayoutDashboard,
    color: "#3B82F6",
    gradient: "from-blue-500 to-indigo-600",
    avatar: "N",
    pathMatch: ["/saas/dashboard"],
    greeting: greetings("Nova", "Dashboard"),
    capabilities: [
      "Explicar cada métrica y KPI del dashboard",
      "Interpretar tendencias y gráficos en tiempo real",
      "Sugerir acciones basadas en los datos",
      "Configurar alertas personalizadas",
      "Exportar reportes ejecutivos",
    ],
    quickActions: [
      { label: "¿Qué significan estos KPIs?", prompt: "Explícame qué significa cada KPI que veo en el dashboard y cómo interpretarlos para tomar mejores decisiones." },
      { label: "¿Cómo mejorar mis métricas?", prompt: "Basándote en las métricas típicas de un dashboard, ¿qué acciones concretas puedo tomar para mejorar mis resultados?" },
      { label: "Configurar alertas", prompt: "¿Cómo puedo configurar alertas automáticas cuando una métrica baje o suba de cierto umbral?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es el dashboard?", a: "El Dashboard es tu centro de control principal. Muestra en tiempo real todas las métricas clave de tu negocio: leads, ventas, conversiones, ingresos, actividad del equipo y rendimiento de campañas. Todo en un solo vistazo para que tomes decisiones informadas al instante." },
      { q: "¿Cómo personalizo el dashboard?", a: "Puedes arrastrar y soltar widgets, cambiar el rango de fechas, filtrar por equipo o campaña, y crear vistas personalizadas. Cada usuario puede tener su propia configuración de dashboard adaptada a su rol." },
      { q: "¿Se actualiza en tiempo real?", a: "Sí, el dashboard se actualiza automáticamente cada 30 segundos con datos en vivo de todas tus integraciones: CRM, email, campañas, pagos y más." },
    ],
  },
  {
    id: "agent-crm",
    name: "Atlas",
    role: "Experto en CRM & Contactos",
    icon: Users,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-purple-600",
    avatar: "A",
    pathMatch: ["/saas/crm"],
    greeting: greetings("Atlas", "CRM & Contactos"),
    capabilities: [
      "Gestionar contactos y empresas",
      "Segmentar audiencias automáticamente",
      "Configurar campos personalizados",
      "Importar/exportar contactos masivamente",
      "Automatizar seguimiento de leads",
      "Crear vistas y filtros avanzados",
    ],
    quickActions: [
      { label: "¿Cómo importo contactos?", prompt: "Necesito importar mis contactos desde un CSV o desde otra plataforma. ¿Cuál es el proceso paso a paso?" },
      { label: "¿Cómo segmento mi base?", prompt: "¿Cómo puedo segmentar mi base de contactos por comportamiento, demografía o actividad para campañas más efectivas?" },
      { label: "Automatizar seguimiento", prompt: "¿Cómo configuro un seguimiento automático para que ningún lead se quede sin respuesta?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es el CRM?", a: "El CRM (Customer Relationship Management) es el corazón de tu negocio. Centraliza todos tus contactos, empresas, interacciones, notas y actividades en un solo lugar. Permite hacer seguimiento de cada lead desde el primer contacto hasta la venta y más allá." },
      { q: "¿Puedo crear campos personalizados?", a: "Sí, puedes crear campos ilimitados de cualquier tipo: texto, número, fecha, selector, checkbox, archivo, etc. Cada campo se puede usar para segmentar, filtrar y automatizar." },
      { q: "¿Cómo funciona la puntuación de leads?", a: "El lead scoring asigna puntos automáticamente basándose en acciones del contacto: abrir emails (+5), visitar web (+10), solicitar demo (+25), etc. Los leads con mayor puntuación se priorizan automáticamente." },
    ],
  },
  {
    id: "agent-pipelines",
    name: "Vega",
    role: "Especialista en Pipelines & Deals",
    icon: Target,
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    avatar: "V",
    pathMatch: ["/saas/pipelines"],
    greeting: greetings("Vega", "Pipelines & Deals"),
    capabilities: [
      "Crear y gestionar pipelines de ventas",
      "Mover deals entre etapas",
      "Configurar automatizaciones por etapa",
      "Calcular forecast de ventas",
      "Analizar tasas de conversión por etapa",
    ],
    quickActions: [
      { label: "¿Cómo creo un pipeline?", prompt: "¿Cómo creo un pipeline de ventas personalizado con las etapas correctas para mi negocio?" },
      { label: "Automatizar movimiento", prompt: "¿Cómo automatizo el movimiento de deals entre etapas basándome en acciones del cliente?" },
      { label: "Forecast de ventas", prompt: "¿Cómo puedo ver una previsión de ventas basada en mi pipeline actual?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es un pipeline?", a: "Un pipeline es una representación visual de tu proceso de ventas. Cada columna es una etapa (ej: Nuevo Lead → Contactado → Propuesta → Negociación → Cerrado). Los deals se mueven de izquierda a derecha conforme avanzan." },
      { q: "¿Puedo tener múltiples pipelines?", a: "Sí, puedes crear pipelines ilimitados para diferentes productos, servicios, equipos o procesos. Cada uno con sus propias etapas, automatizaciones y métricas." },
      { q: "¿Cómo calculo el forecast?", a: "El forecast se calcula multiplicando el valor de cada deal por la probabilidad de cierre de su etapa. Si tienes €100K en 'Propuesta' (60% probabilidad), el forecast es €60K." },
    ],
  },
  {
    id: "agent-email",
    name: "Iris",
    role: "Experta en Email Marketing",
    icon: Mail,
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-600",
    avatar: "I",
    pathMatch: ["/saas/email-marketing"],
    greeting: greetings("Iris", "Email Marketing"),
    capabilities: [
      "Crear campañas de email profesionales",
      "Diseñar templates con drag & drop",
      "Configurar secuencias automatizadas",
      "A/B testing de asuntos y contenido",
      "Analizar métricas de entregabilidad",
      "Segmentar listas dinámicamente",
    ],
    quickActions: [
      { label: "Crear mi primera campaña", prompt: "Guíame paso a paso para crear mi primera campaña de email marketing efectiva." },
      { label: "Mejorar open rate", prompt: "¿Qué estrategias puedo usar para mejorar mi tasa de apertura de emails?" },
      { label: "Secuencia de bienvenida", prompt: "¿Cómo creo una secuencia de bienvenida automática para nuevos suscriptores?" },
    ],
    knowledgeBase: [
      { q: "¿Cómo funciona el email marketing?", a: "El módulo de Email Marketing te permite enviar campañas masivas personalizadas, crear secuencias automatizadas (drip campaigns), hacer A/B testing, y analizar resultados en tiempo real. Todo con un editor visual drag & drop." },
      { q: "¿Qué es una secuencia automatizada?", a: "Una secuencia es una serie de emails que se envían automáticamente con intervalos definidos. Por ejemplo: Día 1 → Bienvenida, Día 3 → Caso de éxito, Día 7 → Oferta especial." },
      { q: "¿Cómo evito el spam?", a: "Usa autenticación SPF/DKIM/DMARC, mantén tu lista limpia, personaliza los emails, incluye link de baja, y mantén una buena reputación de envío. El sistema gestiona todo esto automáticamente." },
    ],
  },
  {
    id: "agent-campaigns",
    name: "Blaze",
    role: "Estratega de Campañas",
    icon: Megaphone,
    color: "#EF4444",
    gradient: "from-red-500 to-rose-600",
    avatar: "B",
    pathMatch: ["/saas/campaigns"],
    greeting: greetings("Blaze", "Campañas"),
    capabilities: [
      "Planificar campañas multicanal",
      "Configurar campañas en Meta, Google, TikTok",
      "Optimizar presupuestos y ROAS",
      "Analizar rendimiento en tiempo real",
      "Crear audiencias lookalike",
    ],
    quickActions: [
      { label: "¿Cómo lanzo una campaña?", prompt: "¿Cuáles son los pasos para lanzar una campaña publicitaria efectiva desde la plataforma?" },
      { label: "Optimizar ROAS", prompt: "¿Cómo puedo optimizar el retorno de inversión publicitaria (ROAS) de mis campañas?" },
      { label: "Audiencias lookalike", prompt: "¿Cómo creo audiencias similares basadas en mis mejores clientes?" },
    ],
    knowledgeBase: [
      { q: "¿Qué son las campañas?", a: "El módulo de Campañas centraliza toda tu publicidad digital: Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads y más. Crea, gestiona y optimiza todas tus campañas desde un solo lugar con analytics unificados." },
      { q: "¿Puedo gestionar el presupuesto?", a: "Sí, puedes asignar presupuestos por campaña, canal o período. El sistema sugiere redistribuciones automáticas basadas en rendimiento para maximizar tu ROAS." },
    ],
  },
  {
    id: "agent-funnels",
    name: "Flux",
    role: "Arquitecto de Funnels",
    icon: Layers,
    color: "#06B6D4",
    gradient: "from-cyan-500 to-teal-600",
    avatar: "F",
    pathMatch: ["/saas/funnels"],
    greeting: greetings("Flux", "Funnels & Landing Pages"),
    capabilities: [
      "Crear funnels de conversión completos",
      "Diseñar landing pages de alto impacto",
      "Configurar A/B testing de páginas",
      "Integrar formularios y pagos",
      "Analizar tasas de conversión por paso",
    ],
    quickActions: [
      { label: "Crear un funnel de ventas", prompt: "¿Cómo creo un funnel de ventas completo desde la captura del lead hasta el cierre?" },
      { label: "Landing page efectiva", prompt: "¿Cuáles son los elementos clave para crear una landing page que convierta?" },
      { label: "A/B testing", prompt: "¿Cómo configuro A/B testing para optimizar mis páginas de aterrizaje?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es un funnel?", a: "Un funnel (embudo) es una secuencia de páginas diseñadas para guiar al visitante hacia una acción: captura de lead → página de ventas → checkout → upsell → thank you. Cada paso está optimizado para maximizar conversiones." },
      { q: "¿Necesito saber programar?", a: "No, el builder es 100% visual con drag & drop. Tienes cientos de templates profesionales, bloques prediseñados y elementos personalizables sin escribir una línea de código." },
    ],
  },
  {
    id: "agent-social",
    name: "Pixel",
    role: "Community Manager Nelvyon",
    icon: Share2,
    color: "#10B981",
    gradient: "from-emerald-500 to-green-600",
    avatar: "P",
    pathMatch: ["/saas/social"],
    greeting: greetings("Pixel", "Social Media"),
    capabilities: [
      "Programar publicaciones en todas las redes",
      "Generar contenido con Nelvyon",
      "Analizar engagement y alcance",
      "Gestionar comentarios y mensajes",
      "Crear calendarios editoriales",
    ],
    quickActions: [
      { label: "Programar publicaciones", prompt: "¿Cómo programo publicaciones en múltiples redes sociales a la vez?" },
      { label: "Generar contenido con Nelvyon", prompt: "¿Cómo uso Nelvyon para generar ideas y contenido para mis redes sociales?" },
      { label: "Calendario editorial", prompt: "¿Cómo creo un calendario editorial mensual para mis redes?" },
    ],
    knowledgeBase: [
      { q: "¿Qué redes soporta?", a: "Soporta Instagram, Facebook, Twitter/X, LinkedIn, TikTok, YouTube, Pinterest y Google Business. Publica en todas desde un solo lugar." },
      { q: "¿Nelvyon genera contenido?", a: "Sí, Nelvyon genera textos, hashtags, ideas de contenido, carruseles y hasta sugiere los mejores horarios de publicación basándose en tu audiencia." },
    ],
  },
  {
    id: "agent-helpdesk",
    name: "Sage",
    role: "Experto en Helpdesk",
    icon: HeadphonesIcon,
    color: "#F97316",
    gradient: "from-orange-500 to-amber-600",
    avatar: "S",
    pathMatch: ["/saas/helpdesk"],
    greeting: greetings("Sage", "Helpdesk & Soporte"),
    capabilities: [
      "Gestionar tickets de soporte",
      "Configurar SLAs y prioridades",
      "Crear base de conocimiento",
      "Automatizar respuestas frecuentes",
      "Medir satisfacción del cliente (CSAT)",
    ],
    quickActions: [
      { label: "Configurar mi helpdesk", prompt: "¿Cómo configuro el helpdesk desde cero con categorías, prioridades y SLAs?" },
      { label: "Base de conocimiento", prompt: "¿Cómo creo una base de conocimiento para que los clientes encuentren respuestas solos?" },
      { label: "Medir satisfacción", prompt: "¿Cómo mido la satisfacción de mis clientes con encuestas CSAT automáticas?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es el helpdesk?", a: "El Helpdesk centraliza todas las solicitudes de soporte de tus clientes en un sistema de tickets organizado. Asigna prioridades, SLAs, agentes responsables y mide tiempos de resolución." },
    ],
  },
  {
    id: "agent-conversations",
    name: "Echo",
    role: "Especialista en Conversaciones",
    icon: MessageSquare,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-indigo-600",
    avatar: "E",
    pathMatch: ["/saas/conversations"],
    greeting: greetings("Echo", "Conversaciones"),
    capabilities: [
      "Gestionar chats de múltiples canales",
      "Configurar chatbots inteligentes",
      "Respuestas automáticas con Nelvyon",
      "Transferir conversaciones entre agentes",
      "Analizar sentimiento del cliente",
    ],
    quickActions: [
      { label: "Conectar canales", prompt: "¿Cómo conecto WhatsApp, Messenger, Instagram DM y el chat web en un solo inbox?" },
      { label: "Chatbot con Nelvyon", prompt: "¿Cómo configuro un chatbot inteligente que responda preguntas frecuentes automáticamente?" },
      { label: "Respuestas rápidas", prompt: "¿Cómo creo plantillas de respuestas rápidas para mi equipo?" },
    ],
    knowledgeBase: [
      { q: "¿Qué canales soporta?", a: "Soporta WhatsApp Business, Facebook Messenger, Instagram DM, Telegram, SMS, email y chat web. Todos en un inbox unificado." },
    ],
  },
  {
    id: "agent-calls",
    name: "Sonic",
    role: "Experto en Llamadas & VoIP",
    icon: Phone,
    color: "#3B82F6",
    gradient: "from-blue-500 to-cyan-600",
    avatar: "S",
    pathMatch: ["/saas/calls"],
    greeting: greetings("Sonic", "Llamadas & VoIP"),
    capabilities: [
      "Configurar sistema de llamadas VoIP",
      "Grabar y transcribir llamadas",
      "IVR y menús de voz automáticos",
      "Click-to-call desde el CRM",
      "Analizar métricas de llamadas",
    ],
    quickActions: [
      { label: "Configurar VoIP", prompt: "¿Cómo configuro el sistema de llamadas VoIP para mi equipo?" },
      { label: "Grabar llamadas", prompt: "¿Cómo activo la grabación automática de llamadas y la transcripción con Nelvyon?" },
      { label: "IVR automático", prompt: "¿Cómo creo un menú de voz automático (IVR) para dirigir las llamadas?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es VoIP?", a: "VoIP (Voice over IP) permite hacer y recibir llamadas telefónicas a través de internet. Más barato que la telefonía tradicional, con funciones avanzadas como grabación, transcripción Nelvyon, IVR y analytics." },
    ],
  },
  {
    id: "agent-workflows",
    name: "Nexus",
    role: "Arquitecto de Automatizaciones",
    icon: Workflow,
    color: "#10B981",
    gradient: "from-emerald-500 to-teal-600",
    avatar: "N",
    pathMatch: ["/saas/workflows"],
    greeting: greetings("Nexus", "Workflows & Automatizaciones"),
    capabilities: [
      "Crear flujos de automatización visual",
      "Configurar triggers y condiciones",
      "Conectar acciones entre módulos",
      "Programar tareas recurrentes",
      "Monitorear ejecuciones en tiempo real",
    ],
    quickActions: [
      { label: "Mi primer workflow", prompt: "¿Cómo creo mi primer workflow de automatización paso a paso?" },
      { label: "Automatizar onboarding", prompt: "¿Cómo automatizo el proceso de onboarding de nuevos clientes?" },
      { label: "Triggers avanzados", prompt: "¿Qué tipos de triggers puedo usar para iniciar automatizaciones?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es un workflow?", a: "Un workflow es una secuencia automatizada de acciones que se ejecutan cuando se cumple un trigger (disparador). Ejemplo: Nuevo lead → Enviar email de bienvenida → Esperar 2 días → Si abre email → Asignar a ventas → Si no → Enviar recordatorio." },
    ],
  },
  {
    id: "agent-bots",
    name: "Orion",
    role: "Maestro de Bots & Chatbots",
    icon: Bot,
    color: "#F59E0B",
    gradient: "from-amber-500 to-yellow-600",
    avatar: "O",
    pathMatch: ["/saas/bots", "/saas/agents-marketplace"],
    greeting: greetings("Orion", "Bots & Chatbots"),
    capabilities: [
      "Crear chatbots sin código",
      "Entrenar bots con tu base de conocimiento",
      "Configurar flujos conversacionales",
      "Integrar bots en web, WhatsApp y redes",
      "Analizar conversaciones del bot",
    ],
    quickActions: [
      { label: "Crear un chatbot", prompt: "¿Cómo creo un chatbot inteligente para mi web sin necesidad de programar?" },
      { label: "Entrenar con mis datos", prompt: "¿Cómo entreno al bot con la información de mi negocio para que responda correctamente?" },
      { label: "Bot en WhatsApp", prompt: "¿Cómo integro un chatbot en WhatsApp Business?" },
    ],
    knowledgeBase: [
      { q: "¿Qué tipos de bots puedo crear?", a: "Puedes crear bots de atención al cliente, bots de ventas, bots de reservas, bots de FAQ, bots de cualificación de leads y bots personalizados con Nelvyon generativa." },
    ],
  },
  {
    id: "agent-calendar",
    name: "Tempo",
    role: "Gestor de Calendario & Citas",
    icon: Calendar,
    color: "#06B6D4",
    gradient: "from-cyan-500 to-blue-600",
    avatar: "T",
    pathMatch: ["/saas/calendar"],
    greeting: greetings("Tempo", "Calendario & Citas"),
    capabilities: [
      "Gestionar citas y reservas online",
      "Sincronizar con Google/Outlook Calendar",
      "Configurar disponibilidad del equipo",
      "Enviar recordatorios automáticos",
      "Pagos anticipados en reservas",
    ],
    quickActions: [
      { label: "Configurar reservas", prompt: "¿Cómo configuro un sistema de reservas online para que mis clientes agenden citas?" },
      { label: "Sincronizar calendarios", prompt: "¿Cómo sincronizo con Google Calendar y Outlook para evitar conflictos?" },
      { label: "Recordatorios automáticos", prompt: "¿Cómo configuro recordatorios automáticos por email y SMS antes de cada cita?" },
    ],
    knowledgeBase: [
      { q: "¿Cómo funciona el calendario?", a: "El Calendario permite a tus clientes reservar citas online según tu disponibilidad. Se sincroniza con Google/Outlook, envía recordatorios automáticos, acepta pagos anticipados y evita dobles reservas." },
    ],
  },
  {
    id: "agent-contracts",
    name: "Lex",
    role: "Asesor Legal de Contratos",
    icon: FileText,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-purple-600",
    avatar: "L",
    pathMatch: ["/saas/contracts"],
    greeting: greetings("Lex", "Contratos Profesionales"),
    capabilities: [
      "Generar contratos legales profesionales",
      "Adaptar a cualquier jurisdicción mundial",
      "Traducir a 100+ idiomas",
      "Firma digital cualificada eIDAS",
      "Cumplimiento GDPR/CCPA/LGPD simultáneo",
    ],
    quickActions: [
      { label: "¿Qué plantilla necesito?", prompt: "Ayúdame a elegir la plantilla de contrato correcta para mi situación." },
      { label: "Diferencia Partner vs White-Label", prompt: "¿Cuál es la diferencia entre el contrato de Partner y el White-Label?" },
      { label: "Validez legal", prompt: "¿Los contratos generados tienen validez legal real? ¿En qué países?" },
    ],
    knowledgeBase: [
      { q: "¿Los contratos son legales?", a: "Sí, los contratos están redactados con estándares legales profesionales, adaptados a la legislación de cada jurisdicción. Incluyen firma digital cualificada (eIDAS/ESIGN/UETA) con validez legal plena en 195+ países." },
      { q: "¿Partner es lo mismo que White-Label?", a: "No exactamente. El contrato Partner es el acuerdo comercial/legal entre tú y NELVYON (precios, márgenes, SLA). White-Label es la funcionalidad técnica incluida en ese contrato que permite poner tu marca en todo. Partner = acuerdo, White-Label = feature incluida." },
    ],
  },
  {
    id: "agent-pdf",
    name: "Docu",
    role: "Especialista en Documentos PDF",
    icon: FileText,
    color: "#EF4444",
    gradient: "from-red-500 to-rose-600",
    avatar: "D",
    pathMatch: ["/saas/pdf-generator"],
    greeting: greetings("Docu", "Generador PDF"),
    capabilities: [
      "Generar PDFs profesionales",
      "Crear facturas y presupuestos",
      "Diseñar propuestas comerciales",
      "Templates personalizables",
      "Firma digital integrada",
    ],
    quickActions: [
      { label: "Crear una factura", prompt: "¿Cómo genero una factura profesional en PDF?" },
      { label: "Propuesta comercial", prompt: "¿Cómo creo una propuesta comercial en PDF con mi branding?" },
      { label: "Templates PDF", prompt: "¿Qué templates de PDF tengo disponibles y cómo los personalizo?" },
    ],
    knowledgeBase: [
      { q: "¿Qué documentos puedo generar?", a: "Puedes generar facturas, presupuestos, propuestas comerciales, contratos, informes, certificados, tickets y cualquier documento personalizado con tu branding." },
    ],
  },
  {
    id: "agent-presentations",
    name: "Slide",
    role: "Diseñador de Presentaciones",
    icon: Layers,
    color: "#F97316",
    gradient: "from-orange-500 to-amber-600",
    avatar: "S",
    pathMatch: ["/saas/presentations"],
    greeting: greetings("Slide", "Presentaciones"),
    capabilities: [
      "Crear presentaciones profesionales",
      "Templates de alto impacto",
      "Exportar a PDF y PowerPoint",
      "Colaboración en tiempo real",
      "Generación de contenido con Nelvyon",
    ],
    quickActions: [
      { label: "Crear presentación", prompt: "¿Cómo creo una presentación profesional rápidamente?" },
      { label: "Templates disponibles", prompt: "¿Qué templates de presentación tengo disponibles?" },
      { label: "Exportar a PowerPoint", prompt: "¿Cómo exporto mi presentación a PowerPoint o PDF?" },
    ],
    knowledgeBase: [
      { q: "¿Cómo funciona?", a: "El módulo de Presentaciones te permite crear slides profesionales con un editor visual, templates prediseñados, generación de contenido con Nelvyon y exportación a múltiples formatos." },
    ],
  },
  {
    id: "agent-segmentation",
    name: "Prism",
    role: "Analista de Segmentación",
    icon: Database,
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-600",
    avatar: "P",
    pathMatch: ["/saas/segmentation"],
    greeting: greetings("Prism", "Segmentación"),
    capabilities: [
      "Crear segmentos dinámicos",
      "Filtrar por comportamiento y demografía",
      "Segmentación predictiva con Nelvyon",
      "Audiencias para campañas",
      "Análisis de cohortes",
    ],
    quickActions: [
      { label: "Crear un segmento", prompt: "¿Cómo creo un segmento de contactos basado en su comportamiento?" },
      { label: "Segmentación con Nelvyon", prompt: "¿Cómo usa Nelvyon para predecir qué contactos tienen más probabilidad de comprar?" },
      { label: "Audiencias para ads", prompt: "¿Cómo creo audiencias segmentadas para usar en mis campañas publicitarias?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es la segmentación?", a: "La Segmentación divide tu base de contactos en grupos específicos basados en criterios como comportamiento, demografía, actividad, compras, engagement, etc. Permite enviar mensajes personalizados a cada grupo." },
    ],
  },
  {
    id: "agent-websites",
    name: "Web",
    role: "Arquitecto Web & Builder",
    icon: Globe,
    color: "#3B82F6",
    gradient: "from-blue-500 to-indigo-600",
    avatar: "W",
    pathMatch: ["/saas/websites"],
    greeting: greetings("Web", "Websites & Builder"),
    capabilities: [
      "Crear sitios web profesionales",
      "Editor visual drag & drop",
      "Templates responsive",
      "SEO optimizado automáticamente",
      "Dominio personalizado",
      "SSL gratuito",
    ],
    quickActions: [
      { label: "Crear mi web", prompt: "¿Cómo creo un sitio web profesional desde cero con el builder?" },
      { label: "Conectar dominio", prompt: "¿Cómo conecto mi dominio personalizado a mi sitio web?" },
      { label: "Optimizar SEO", prompt: "¿Cómo optimizo el SEO de mi sitio web para aparecer en Google?" },
    ],
    knowledgeBase: [
      { q: "¿Necesito saber programar?", a: "No, el Website Builder es 100% visual con drag & drop. Elige un template, personalízalo con tu marca, añade contenido y publica. Sin código." },
    ],
  },
  {
    id: "agent-templates",
    name: "Muse",
    role: "Curador de Templates",
    icon: Palette,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-purple-600",
    avatar: "M",
    pathMatch: ["/saas/templates"],
    greeting: greetings("Muse", "Templates"),
    capabilities: [
      "Explorar biblioteca de templates",
      "Personalizar templates con tu marca",
      "Templates para email, web, landing, social",
      "Crear templates propios",
      "Compartir templates con tu equipo",
    ],
    quickActions: [
      { label: "Ver templates", prompt: "¿Qué templates tengo disponibles para mi sector?" },
      { label: "Personalizar template", prompt: "¿Cómo personalizo un template con los colores y logo de mi marca?" },
      { label: "Crear template propio", prompt: "¿Cómo creo un template desde cero para reutilizarlo?" },
    ],
    knowledgeBase: [
      { q: "¿Cuántos templates hay?", a: "La biblioteca tiene miles de templates profesionales para emails, landing pages, sitios web, social media, presentaciones, contratos y más. Todos personalizables y responsive." },
    ],
  },
  {
    id: "agent-forms",
    name: "Form",
    role: "Especialista en Formularios",
    icon: FileText,
    color: "#10B981",
    gradient: "from-emerald-500 to-green-600",
    avatar: "F",
    pathMatch: ["/saas/forms"],
    greeting: greetings("Form", "Forms & Surveys"),
    capabilities: [
      "Crear formularios y encuestas",
      "Lógica condicional avanzada",
      "Integración con CRM automática",
      "Formularios de pago",
      "Analizar respuestas",
    ],
    quickActions: [
      { label: "Crear formulario", prompt: "¿Cómo creo un formulario de contacto profesional para mi web?" },
      { label: "Encuesta de satisfacción", prompt: "¿Cómo creo una encuesta de satisfacción para mis clientes?" },
      { label: "Formulario con pagos", prompt: "¿Cómo creo un formulario que acepte pagos integrados?" },
    ],
    knowledgeBase: [
      { q: "¿Qué tipos de formularios puedo crear?", a: "Formularios de contacto, encuestas, cuestionarios, formularios de registro, formularios de pago, formularios multi-paso, formularios con lógica condicional y más." },
    ],
  },
  {
    id: "agent-blog",
    name: "Quill",
    role: "Editor de Blog & CMS",
    icon: BookOpen,
    color: "#06B6D4",
    gradient: "from-cyan-500 to-teal-600",
    avatar: "Q",
    pathMatch: ["/saas/blog"],
    greeting: greetings("Quill", "Blog & CMS"),
    capabilities: [
      "Crear y gestionar artículos",
      "Editor WYSIWYG profesional",
      "SEO automático por artículo",
      "Categorías y etiquetas",
      "Programar publicaciones",
      "Generación de contenido con Nelvyon",
    ],
    quickActions: [
      { label: "Escribir artículo", prompt: "¿Cómo escribo y publico un artículo en el blog?" },
      { label: "SEO del blog", prompt: "¿Cómo optimizo mis artículos para SEO y posicionamiento en Google?" },
      { label: "Generar contenido con Nelvyon", prompt: "¿Cómo uso Nelvyon para generar ideas y borradores de artículos?" },
    ],
    knowledgeBase: [
      { q: "¿Cómo funciona el blog?", a: "El Blog & CMS te permite crear, editar y publicar artículos con un editor profesional. Incluye SEO automático, categorías, etiquetas, programación de publicaciones y generación de contenido con Nelvyon." },
    ],
  },
  {
    id: "agent-sales",
    name: "Deal",
    role: "Asesor de Ventas & Pricing",
    icon: ShoppingCart,
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    avatar: "D",
    pathMatch: ["/saas/sales"],
    greeting: greetings("Deal", "Ventas & Pricing"),
    capabilities: [
      "Configurar productos y precios",
      "Crear ofertas y descuentos",
      "Gestionar pedidos y suscripciones",
      "Analizar métricas de ventas",
      "Upselling y cross-selling automático",
    ],
    quickActions: [
      { label: "Configurar precios", prompt: "¿Cómo configuro mis productos, planes y precios?" },
      { label: "Crear oferta", prompt: "¿Cómo creo una oferta especial o descuento para mis clientes?" },
      { label: "Métricas de ventas", prompt: "¿Qué métricas de ventas debo monitorear y cómo las interpreto?" },
    ],
    knowledgeBase: [
      { q: "¿Cómo gestiono las ventas?", a: "El módulo de Ventas centraliza productos, precios, pedidos, suscripciones y métricas. Configura planes, crea ofertas, gestiona el ciclo de vida del cliente y analiza tu rendimiento comercial." },
    ],
  },
  {
    id: "agent-payments",
    name: "Vault",
    role: "Gestor de Pagos & Facturación",
    icon: CreditCard,
    color: "#EF4444",
    gradient: "from-red-500 to-rose-600",
    avatar: "V",
    pathMatch: ["/saas/payments"],
    greeting: greetings("Vault", "Pagos & Facturación"),
    capabilities: [
      "Configurar pasarelas de pago",
      "Generar facturas automáticas",
      "Gestionar suscripciones recurrentes",
      "Cobros automáticos y recordatorios",
      "Reportes financieros",
    ],
    quickActions: [
      { label: "Configurar pagos", prompt: "¿Cómo configuro Stripe/PayPal para aceptar pagos en mi plataforma?" },
      { label: "Facturación automática", prompt: "¿Cómo configuro la facturación automática para mis clientes?" },
      { label: "Cobros recurrentes", prompt: "¿Cómo gestiono suscripciones y cobros recurrentes?" },
    ],
    knowledgeBase: [
      { q: "¿Qué pasarelas soporta?", a: "Soporta Stripe, PayPal, transferencia bancaria, domiciliación SEPA y más. Configura múltiples métodos de pago para tus clientes." },
    ],
  },
  {
    id: "agent-analytics",
    name: "Insight",
    role: "Analista de Datos Pro",
    icon: BarChart3,
    color: "#8B5CF6",
    gradient: "from-violet-500 to-indigo-600",
    avatar: "I",
    pathMatch: ["/saas/analytics"],
    greeting: greetings("Insight", "Analytics Pro"),
    capabilities: [
      "Analizar métricas de negocio",
      "Crear dashboards personalizados",
      "Tracking de conversiones",
      "Atribución multicanal",
      "Predicciones con Nelvyon",
    ],
    quickActions: [
      { label: "Entender mis datos", prompt: "¿Cómo interpreto las métricas principales de mi analytics?" },
      { label: "Tracking de conversiones", prompt: "¿Cómo configuro el tracking de conversiones en mi web y campañas?" },
      { label: "Atribución", prompt: "¿Cómo sé qué canal de marketing genera más ventas?" },
    ],
    knowledgeBase: [
      { q: "¿Qué métricas puedo ver?", a: "Visitas, conversiones, ingresos, CAC, LTV, churn, ROAS, engagement, funnel analytics, cohortes, atribución multicanal y más. Todo en tiempo real con gráficos interactivos." },
    ],
  },
  {
    id: "agent-reports",
    name: "Report",
    role: "Generador de Reportes",
    icon: PieChart,
    color: "#EC4899",
    gradient: "from-pink-500 to-rose-600",
    avatar: "R",
    pathMatch: ["/saas/reports"],
    greeting: greetings("Report", "Reportes"),
    capabilities: [
      "Generar reportes ejecutivos",
      "Reportes automáticos programados",
      "Exportar a PDF, Excel, CSV",
      "Reportes white-label con tu marca",
      "Dashboards de reporting",
    ],
    quickActions: [
      { label: "Crear reporte", prompt: "¿Cómo creo un reporte ejecutivo profesional para mi cliente?" },
      { label: "Reportes automáticos", prompt: "¿Cómo programo reportes automáticos semanales o mensuales?" },
      { label: "White-label reports", prompt: "¿Cómo genero reportes con mi marca para enviar a clientes?" },
    ],
    knowledgeBase: [
      { q: "¿Qué reportes puedo generar?", a: "Reportes de ventas, marketing, campañas, CRM, helpdesk, financieros, de equipo y personalizados. Todos exportables a PDF, Excel y CSV con tu branding." },
    ],
  },
  {
    id: "agent-partners",
    name: "Alliance",
    role: "Asesor del Programa Partners",
    icon: Handshake,
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    avatar: "A",
    pathMatch: ["/saas/partners"],
    greeting: greetings("Alliance", "Programa Partners"),
    capabilities: [
      "Explicar el programa de partners",
      "Calcular márgenes y beneficios",
      "Guiar en el proceso de alta",
      "Configurar white-label",
      "Soporte para partners",
    ],
    quickActions: [
      { label: "¿Cómo ser partner?", prompt: "¿Cuáles son los pasos para convertirme en partner y empezar a revender?" },
      { label: "Calcular márgenes", prompt: "¿Cuánto puedo ganar como partner? Ayúdame a calcular mis márgenes." },
      { label: "Configurar white-label", prompt: "¿Cómo configuro mi plataforma white-label con mi marca, dominio y colores?" },
    ],
    knowledgeBase: [
      { q: "¿Qué es el programa partners?", a: "El Programa Partners te permite revender toda la plataforma SaaS con tu propia marca (white-label). Tú pones el precio, tú facturas al cliente, y te quedas con el margen. NELVYON es invisible para tu cliente." },
      { q: "¿Cuánto cuesta?", a: "Los planes partner empiezan desde €297/mes (Silver) hasta €1,497/mes (Diamond). Cada plan incluye diferentes niveles de white-label, soporte y funcionalidades." },
    ],
  },
  {
    id: "agent-integrations",
    name: "Link",
    role: "Especialista en Integraciones",
    icon: Database,
    color: "#06B6D4",
    gradient: "from-cyan-500 to-teal-600",
    avatar: "L",
    pathMatch: ["/saas/integrations"],
    greeting: greetings("Link", "Integraciones"),
    capabilities: [
      "Conectar herramientas externas",
      "Configurar APIs y webhooks",
      "Zapier, Make, n8n integrations",
      "Sincronización bidireccional",
      "Troubleshooting de conexiones",
    ],
    quickActions: [
      { label: "Ver integraciones", prompt: "¿Qué integraciones están disponibles y cómo las conecto?" },
      { label: "Conectar Zapier", prompt: "¿Cómo conecto la plataforma con Zapier para automatizar entre apps?" },
      { label: "API & Webhooks", prompt: "¿Cómo uso la API y los webhooks para integraciones personalizadas?" },
    ],
    knowledgeBase: [
      { q: "¿Qué integraciones hay?", a: "Más de 200 integraciones nativas: Google, Meta, Stripe, PayPal, Zapier, Make, Slack, WhatsApp, Mailchimp, HubSpot, Salesforce, WordPress y muchas más." },
    ],
  },
  {
    id: "agent-settings",
    name: "Config",
    role: "Asistente de Configuración",
    icon: Settings,
    color: "#64748B",
    gradient: "from-slate-500 to-gray-600",
    avatar: "C",
    pathMatch: ["/saas/settings"],
    greeting: greetings("Config", "Configuración"),
    capabilities: [
      "Configurar cuenta y perfil",
      "Gestionar equipo y permisos",
      "Configurar dominio y branding",
      "Seguridad y 2FA",
      "Exportar/importar datos",
    ],
    quickActions: [
      { label: "Configurar mi cuenta", prompt: "¿Cómo configuro mi cuenta, perfil y preferencias?" },
      { label: "Gestionar equipo", prompt: "¿Cómo añado miembros a mi equipo y configuro permisos?" },
      { label: "Seguridad 2FA", prompt: "¿Cómo activo la autenticación de dos factores para mayor seguridad?" },
    ],
    knowledgeBase: [
      { q: "¿Qué puedo configurar?", a: "Perfil, empresa, equipo, permisos, dominio, branding, notificaciones, integraciones, seguridad (2FA), facturación, idioma, zona horaria y más." },
    ],
  },
  {
    id: "agent-benchmark",
    name: "Rank",
    role: "Analista de Benchmark",
    icon: Trophy,
    color: "#F59E0B",
    gradient: "from-amber-500 to-yellow-600",
    avatar: "R",
    pathMatch: ["/saas/benchmark", "/saas/comparison", "/saas/vs-ghl"],
    greeting: greetings("Rank", "Benchmark & Comparativas"),
    capabilities: [
      "Comparar con competidores",
      "Analizar fortalezas y debilidades",
      "Benchmark de precios del mercado",
      "Posicionamiento competitivo",
      "Recomendaciones estratégicas",
    ],
    quickActions: [
      { label: "Comparar plataformas", prompt: "¿Cómo se compara esta plataforma con GoHighLevel, HubSpot y otras?" },
      { label: "Ventajas competitivas", prompt: "¿Cuáles son las principales ventajas competitivas de esta plataforma?" },
      { label: "Benchmark de precios", prompt: "¿Cómo se comparan los precios con la competencia?" },
    ],
    knowledgeBase: [
      { q: "¿Por qué elegir esta plataforma?", a: "Ofrece más funcionalidades que GoHighLevel, HubSpot o Salesforce a una fracción del precio. White-label completo, 24+ módulos integrados, tecnología avanzada, soporte en español y programa de partners con márgenes del 300-500%." },
    ],
  },
];

/* ─── Find agent by current path ─── */
export function findAgentByPath(pathname: string): SectionAgent | null {
  return sectionAgents.find(a => a.pathMatch.some(p => pathname.startsWith(p))) || null;
}

/* ─── Fallback agent for unknown sections ─── */
export const fallbackAgent: SectionAgent = {
  id: "agent-general",
  name: "Aria",
  role: "Asistente General SaaS",
  icon: Bot,
  color: "#3B82F6",
  gradient: "from-blue-500 to-indigo-600",
  avatar: "A",
  pathMatch: ["/saas"],
  greeting: greetings("Aria", "la plataforma SaaS"),
  capabilities: [
    "Navegar por todos los módulos",
    "Explicar cualquier funcionalidad",
    "Guiar en la configuración inicial",
    "Resolver dudas generales",
    "Recomendar módulos según tu negocio",
  ],
  quickActions: [
    { label: "¿Qué puede hacer la plataforma?", prompt: "Dame un resumen de todos los módulos y funcionalidades disponibles en la plataforma." },
    { label: "¿Por dónde empiezo?", prompt: "Soy nuevo en la plataforma, ¿por dónde debería empezar?" },
    { label: "Recomiéndame módulos", prompt: "Según mi tipo de negocio, ¿qué módulos me recomiendas usar primero?" },
  ],
  knowledgeBase: [
    { q: "¿Qué es esta plataforma?", a: "Es una plataforma SaaS todo-en-uno con 24+ módulos: CRM, Email Marketing, Campañas, Funnels, Websites, Helpdesk, Workflows, Chatbots, Calendario, Contratos, Analytics y mucho más. Todo integrado, todo white-label." },
  ],
};