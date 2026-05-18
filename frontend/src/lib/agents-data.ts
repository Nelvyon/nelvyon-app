import {
  Shield,
  Brain,
  Crown,
  Target,
  Phone,
  Rocket,
  LayoutTemplate,
  Lock,
  BarChart3,
  Code2,
  HeartHandshake,
  Zap,
  Headphones,
  DoorOpen,
  Wallet,
  PenTool,
  Users,
  Scale,
  Truck,
  GraduationCap,
  Languages,
  Palette,
  type LucideIcon,
} from "lucide-react";

export interface AgentTask {
  id: string;
  description: string;
  status: "completed" | "in_progress" | "queued" | "failed";
  timestamp: string;
  duration?: string;
}

export interface AgentMetric {
  label: string;
  value: number;
  unit: string;
  change: number;
  trend: "up" | "down" | "stable";
}

export interface AgentLog {
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export interface Agent {
  id: string;
  name: string;
  codename: string;
  description: string;
  longDescription: string;
  color: string;
  gradient: string;
  icon: LucideIcon;
  status: "active" | "processing" | "idle" | "error";
  uptime: string;
  tasksCompleted: number;
  tasksToday: number;
  successRate: number;
  functionalityLevel: "full" | "partial" | "ui_only" | "planned";
  functionalityNote: string;
  metrics: AgentMetric[];
  capabilities: string[];
  recentTasks: AgentTask[];
  logs: AgentLog[];
}

function makeAgent(
  id: string,
  name: string,
  codename: string,
  description: string,
  longDescription: string,
  color: string,
  gradient: string,
  icon: LucideIcon,
  successRate: number,
  functionalityNote: string,
  metrics: AgentMetric[],
  capabilities: string[],
  recentTasks: AgentTask[],
  logs: AgentLog[]
): Agent {
  return {
    id,
    name,
    codename,
    description,
    longDescription,
    color,
    gradient,
    icon,
    status: "active",
    uptime: "99.9%",
    tasksCompleted: 0,
    tasksToday: 0,
    successRate,
    functionalityLevel: "full",
    functionalityNote,
    metrics,
    capabilities,
    recentTasks,
    logs,
  };
}

export const agents: Agent[] = [
  makeAgent(
    "atlas", "ATLAS", "Web Agent",
    "Agente de construccion web con chat IA, preview en vivo y gestion de secciones.",
    "ATLAS es el agente de construccion web de NELVYON. Chat IA real para consultas sobre diseno web, arquitectura, UX/UI y SEO tecnico. Preview en vivo con modos responsive y gestion de secciones web.",
    "#10B981", "from-emerald-500 to-green-600", Shield, 95,
    "Chat IA real, preview funcional, secciones editables. Conectado al backend de IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Modos Preview", value: 3, unit: "", change: 0, trend: "stable" },
      { label: "Secciones", value: 8, unit: "", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 40, trend: "up" },
    ],
    ["Chat IA profesional sobre diseno web", "Preview en vivo desktop/tablet/movil", "Gestion de secciones web", "Asesoria en arquitectura web y SEO"],
    [{ id: "t1", description: "Chat IA conectado al backend", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA conectado al backend" }]
  ),
  makeAgent(
    "omega", "OMEGA", "Motor de Generacion IA",
    "Genera contenido profesional usando IA: webs, e-commerce, social media, propuestas, auditorias y branding.",
    "OMEGA es el motor de generacion de contenido de NELVYON. Conecta con el backend real para generar outputs profesionales. Cada output pasa por el QA Engine para validacion de calidad.",
    "#FACC15", "from-yellow-400 to-amber-600", Zap, 97,
    "Conectado al backend real. Genera contenido con IA, guarda outputs en BD, pasa por QA Engine.",
    [
      { label: "Tipos Output", value: 10, unit: "", change: 0, trend: "stable" },
      { label: "Backend", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "QA Integrado", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 95, unit: "%", change: 0, trend: "stable" },
    ],
    ["Generacion web premium", "Estrategia e-commerce", "Plan social media", "Campanas ads", "Auditoria SWOT", "Propuestas comerciales", "Branding completo", "Email marketing", "QA automatico"],
    [{ id: "t1", description: "Generacion con IA backend", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Genera contenido con IA" }]
  ),
  makeAgent(
    "nexus", "NEXUS", "CRM y Gestion de Clientes",
    "Sistema CRM completo con CRUD real y chat IA para estrategias de gestion de clientes.",
    "NEXUS gestiona toda la base de datos de clientes. CRUD completo conectado al backend PostgreSQL. Chat IA para asesoria en estrategias CRM, segmentacion, retencion y lifecycle management.",
    "#F472B6", "from-pink-400 to-rose-600", HeartHandshake, 98,
    "CRUD completo + Chat IA para estrategias CRM. Datos persistentes en PostgreSQL.",
    [
      { label: "CRUD", value: 4, unit: "ops", change: 0, trend: "stable" },
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Campos", value: 20, unit: "+", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 98, unit: "%", change: 0, trend: "stable" },
    ],
    ["CRUD completo de clientes", "Chat IA para estrategias CRM", "Filtrado por estado", "Datos persistentes PostgreSQL", "Autenticacion integrada"],
    [{ id: "t1", description: "CRUD + Chat IA operativo", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] CRM + Chat IA conectados" }]
  ),
  makeAgent(
    "strategist", "STRATEGIST", "Estrategia Empresarial",
    "Agente de estrategia con IA: analisis de mercado, SWOT, planes estrategicos y forecasting.",
    "STRATEGIST analiza mercados, competencia y tendencias usando IA. Genera planes estrategicos, analisis SWOT/PESTEL, estrategias go-to-market y OKRs.",
    "#8B5CF6", "from-violet-500 to-purple-600", Brain, 94,
    "Chat IA real para analisis estrategico. Genera SWOT, planes, forecasting con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Frameworks", value: 6, unit: "", change: 0, trend: "stable" },
      { label: "Analisis Real", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 75, trend: "up" },
    ],
    ["Analisis de mercado con IA", "SWOT y PESTEL", "Planes estrategicos", "Go-to-market", "OKRs y KPIs", "Forecasting"],
    [{ id: "t1", description: "Chat IA estrategia conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para estrategia conectado" }]
  ),
  makeAgent(
    "commander", "COMMANDER", "Gestor Central",
    "Gestor central con IA: coordinacion de proyectos, priorizacion, monitoreo y reportes ejecutivos.",
    "COMMANDER coordina todas las operaciones usando IA. Gestiona proyectos, prioriza tareas, genera reportes ejecutivos y aplica metodologias Agile/Scrum/Kanban.",
    "#F59E0B", "from-amber-500 to-yellow-600", Crown, 96,
    "Chat IA para gestion de proyectos. Priorizacion, reportes y metodologias con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Agentes", value: 22, unit: "", change: 0, trend: "stable" },
      { label: "Metodologias", value: 4, unit: "", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 70, trend: "up" },
    ],
    ["Chat IA para gestion", "Priorizacion inteligente", "Reportes ejecutivos con IA", "Agile, Scrum, Kanban, OKRs", "Monitoreo de KPIs"],
    [{ id: "t1", description: "Chat IA gestion conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para gestion conectado" }]
  ),
  makeAgent(
    "hunter", "HUNTER", "Adquisicion de Clientes",
    "Agente de adquisicion con IA: lead generation, growth hacking, funnels y campanas multicanal.",
    "HUNTER disena estrategias de adquisicion de clientes usando IA. Lead generation, growth hacking, funnels de conversion y campanas multicanal.",
    "#EF4444", "from-red-500 to-rose-600", Target, 93,
    "Chat IA para estrategias de adquisicion. Lead gen, funnels y campanas con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Estrategias", value: 8, unit: "", change: 0, trend: "stable" },
      { label: "Canales", value: 6, unit: "", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para adquisicion", "Lead generation con IA", "Growth hacking", "Funnels de conversion", "Campanas multicanal", "ICP definition"],
    [{ id: "t1", description: "Chat IA adquisicion conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para adquisicion conectado" }]
  ),
  makeAgent(
    "closer", "CLOSER", "Ventas y Llamadas",
    "Agente de ventas con IA: scripts de venta, manejo de objeciones, coaching y tecnicas de cierre.",
    "CLOSER genera scripts de venta, estrategias de manejo de objeciones, coaching comercial y tecnicas de cierre usando IA.",
    "#EC4899", "from-pink-500 to-rose-600", Phone, 92,
    "Chat IA para ventas. Scripts, objeciones, coaching y cierre con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Tecnicas", value: 5, unit: "", change: 0, trend: "stable" },
      { label: "Scripts", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para ventas", "Scripts personalizados", "Manejo de objeciones", "SPIN, Challenger, Sandler", "Coaching de ventas", "Follow-up sequences"],
    [{ id: "t1", description: "Chat IA ventas conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para ventas conectado" }]
  ),
  makeAgent(
    "coder", "CODER", "Generador de Codigo",
    "Programador de elite con IA: genera codigo completo de produccion en cualquier lenguaje y framework.",
    "CODER genera codigo completo de produccion usando IA avanzada (Claude). Soporta React, Next.js, Vue, Node.js, Python, Go, Rust y mas.",
    "#22D3EE", "from-cyan-400 to-blue-600", Code2, 99,
    "Chat IA con Claude para generacion de codigo. Produce codigo completo de produccion.",
    [
      { label: "IA (Claude)", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Lenguajes", value: 15, unit: "+", change: 0, trend: "stable" },
      { label: "Frameworks", value: 20, unit: "+", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 98, unit: "%", change: 0, trend: "stable" },
    ],
    ["Generacion de codigo con Claude", "Frontend: React, Next.js, Vue", "Backend: Node.js, Python, Go", "APIs: REST, GraphQL, WebSocket", "DevOps: Docker, K8s, CI/CD", "Testing: Jest, Cypress"],
    [{ id: "t1", description: "Chat IA Claude conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA con Claude operativo" }]
  ),
  makeAgent(
    "guardian", "GUARDIAN", "Seguridad",
    "Agente de seguridad con IA: auditorias, hardening, compliance GDPR/SOC2 y proteccion de datos.",
    "GUARDIAN protege los sistemas usando IA. Auditorias de seguridad, hardening, compliance (GDPR, SOC2, PCI-DSS) y estrategias de proteccion.",
    "#14B8A6", "from-teal-500 to-emerald-600", Lock, 97,
    "Chat IA para seguridad. Auditorias, compliance y hardening con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Frameworks", value: 5, unit: "", change: 0, trend: "stable" },
      { label: "OWASP", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para seguridad", "Auditorias con IA", "Hardening servidores/APIs", "GDPR, SOC2, PCI-DSS", "OWASP Top 10", "Incident response"],
    [{ id: "t1", description: "Chat IA seguridad conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para seguridad conectado" }]
  ),
  makeAgent(
    "oracle", "ORACLE", "Analytics y Reportes",
    "Agente de analytics con IA: KPIs, dashboards, forecasting, reportes ejecutivos y data storytelling.",
    "ORACLE analiza datos y genera insights usando IA. Dashboards, KPIs, reportes ejecutivos, forecasting y data storytelling.",
    "#A855F7", "from-purple-500 to-violet-600", BarChart3, 95,
    "Chat IA para analytics. Datos reales + analisis con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Datos Reales", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Reportes", value: 6, unit: "", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 92, unit: "%", change: 52, trend: "up" },
    ],
    ["Chat IA para analytics", "Dashboards con KPIs", "Reportes ejecutivos con IA", "Forecasting", "Funnel analysis", "Data storytelling"],
    [{ id: "t1", description: "Chat IA analytics conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para analytics conectado" }]
  ),
  makeAgent(
    "architect", "ARCHITECT", "Templates Web",
    "Disenador de templates con IA: templates por sector, design systems, componentes y layouts responsive.",
    "ARCHITECT genera templates web profesionales usando IA. Templates por sector, design systems completos, componentes reutilizables y layouts responsive.",
    "#F97316", "from-orange-500 to-amber-600", LayoutTemplate, 94,
    "Chat IA para templates. Genera templates por sector y design systems con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Sectores", value: 7, unit: "+", change: 0, trend: "stable" },
      { label: "OMEGA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 92, unit: "%", change: 47, trend: "up" },
    ],
    ["Chat IA para templates", "Templates por sector", "Design systems", "Componentes reutilizables", "Layouts responsive"],
    [{ id: "t1", description: "Chat IA templates conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para templates conectado" }]
  ),
  makeAgent(
    "sentinel", "SENTINEL", "Ciberseguridad",
    "Agente de ciberseguridad avanzada con IA: threat intelligence, SOC, forensics, red/blue team.",
    "SENTINEL proporciona ciberseguridad avanzada usando IA. Threat intelligence, zero-trust, threat modeling, SOC operations y cloud security.",
    "#DC2626", "from-red-600 to-rose-700", Shield, 96,
    "Chat IA para ciberseguridad avanzada. Threat intel, SOC, forensics con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Frameworks", value: 4, unit: "", change: 0, trend: "stable" },
      { label: "Cloud Sec", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 85, trend: "up" },
    ],
    ["Chat IA ciberseguridad", "Threat intelligence", "SOC operations", "Digital forensics", "Red/Blue team", "Zero-trust", "Cloud security"],
    [{ id: "t1", description: "Chat IA ciberseguridad conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA ciberseguridad conectado" }]
  ),
  makeAgent(
    "support", "SUPPORT", "Chat de Soporte",
    "Agente de soporte con IA: troubleshooting, knowledge base, chatbot design y CSAT optimization.",
    "SUPPORT gestiona soporte al cliente usando IA. Troubleshooting, knowledge bases, chatbot design, CSAT/NPS optimization y templates de respuesta.",
    "#3B82F6", "from-blue-500 to-indigo-600", Headphones, 96,
    "Chat IA para soporte. Troubleshooting, KB y chatbot design con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Backend", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Templates", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 92, unit: "%", change: 37, trend: "up" },
    ],
    ["Chat IA para soporte", "Troubleshooting con IA", "Knowledge base generation", "Chatbot flow design", "CSAT/NPS optimization"],
    [{ id: "t1", description: "Chat IA soporte conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para soporte conectado" }]
  ),
  makeAgent(
    "finance", "FINANCE", "Pagos con Stripe",
    "Sistema de pagos Stripe integrado + IA para estrategias de pricing, MRR y financial modeling.",
    "FINANCE gestiona pagos con Stripe real y ofrece asesoria financiera con IA. Checkout, suscripciones, pricing, MRR/ARR y financial modeling.",
    "#059669", "from-emerald-600 to-green-700", Wallet, 99,
    "Stripe real + Chat IA para finanzas. Checkout, suscripciones y analisis financiero.",
    [
      { label: "Stripe", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Planes", value: 3, unit: "", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 95, unit: "%", change: 0, trend: "stable" },
    ],
    ["Checkout Stripe real", "3 planes de suscripcion", "Chat IA para finanzas", "Pricing strategy con IA", "MRR/ARR analysis", "Financial modeling"],
    [{ id: "t1", description: "Stripe + Chat IA operativo", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Stripe + Chat IA conectados" }]
  ),
  makeAgent(
    "visionary", "VISIONARY", "Ideas de Negocio",
    "Generador de ideas con IA: ideacion, validacion, lean startup, MVP design y pitch decks.",
    "VISIONARY genera ideas de negocio innovadoras usando IA. Ideacion, validacion de viabilidad, lean startup, MVP design y pitch decks.",
    "#06B6D4", "from-cyan-500 to-teal-600", Rocket, 93,
    "Chat IA para ideacion. Genera ideas, valida viabilidad y disena MVPs con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Frameworks", value: 5, unit: "", change: 0, trend: "stable" },
      { label: "Validacion", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para ideacion", "Generacion de ideas con IA", "Validacion de viabilidad", "Lean startup", "MVP design", "Business Model Canvas", "Pitch decks"],
    [{ id: "t1", description: "Chat IA ideacion conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para ideacion conectado" }]
  ),
  makeAgent(
    "concierge", "CONCIERGE", "Recepcion y Onboarding",
    "Agente de onboarding con IA: flujos de incorporacion, welcome sequences, product tours y activation.",
    "CONCIERGE disena experiencias de bienvenida y activacion usando IA. Onboarding flows, welcome sequences, product tours y gamificacion.",
    "#D946EF", "from-fuchsia-500 to-purple-600", DoorOpen, 92,
    "Chat IA para onboarding. Flujos, welcome sequences y activation con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Flujos", value: 5, unit: "", change: 0, trend: "stable" },
      { label: "Activation", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para onboarding", "Onboarding flows con IA", "Welcome sequences", "Product tours", "Activation strategies", "Gamificacion"],
    [{ id: "t1", description: "Chat IA onboarding conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para onboarding conectado" }]
  ),
  makeAgent(
    "content", "CONTENT", "Generador de Contenido",
    "Generador de contenido con IA: social media, blog/SEO, email marketing, copywriting y video scripts.",
    "CONTENT crea contenido profesional para todas las plataformas usando IA. Social media, blog/SEO, email marketing, copywriting y video scripts.",
    "#F43F5E", "from-rose-500 to-red-600", PenTool, 95,
    "Chat IA para contenido. Genera posts, articulos, emails y scripts con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Backend", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Plataformas", value: 6, unit: "", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 92, unit: "%", change: 37, trend: "up" },
    ],
    ["Chat IA para contenido", "Social media posts con IA", "Blog/SEO articles", "Email marketing", "Copywriting", "Video scripts", "Calendario editorial"],
    [{ id: "t1", description: "Chat IA contenido conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para contenido conectado" }]
  ),
  makeAgent(
    "talent", "TALENT", "RRHH",
    "Agente de RRHH con IA: reclutamiento, job descriptions, entrevistas, cultura y performance management.",
    "TALENT gestiona todo el ciclo de talento usando IA. Reclutamiento, job descriptions, entrevistas estructuradas, employer branding y performance management.",
    "#7C3AED", "from-violet-600 to-purple-700", Users, 93,
    "Chat IA para RRHH. Reclutamiento, entrevistas y cultura con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Procesos", value: 6, unit: "", change: 0, trend: "stable" },
      { label: "Templates", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para RRHH", "Reclutamiento con IA", "Job descriptions", "Entrevistas estructuradas", "Employer branding", "Performance management", "Retencion de talento"],
    [{ id: "t1", description: "Chat IA RRHH conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para RRHH conectado" }]
  ),
  makeAgent(
    "legal", "LEGAL", "Contratos y Legal",
    "Generador de contratos con IA: contratos comerciales, ToS, privacidad GDPR, NDA y compliance.",
    "LEGAL genera documentos legales usando IA. Contratos comerciales, terminos de servicio, politicas de privacidad, NDA y compliance. Templates orientativos.",
    "#64748B", "from-slate-500 to-gray-700", Scale, 94,
    "Chat IA para documentos legales. Contratos, ToS, privacidad y NDA con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Templates", value: 8, unit: "", change: 0, trend: "stable" },
      { label: "Compliance", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 55, trend: "up" },
    ],
    ["Chat IA para documentos legales", "Contratos comerciales", "Terminos de servicio", "Politica de privacidad GDPR", "NDA", "SLA", "Compliance"],
    [{ id: "t1", description: "Chat IA legal conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para legal conectado" }]
  ),
  makeAgent(
    "logistics", "LOGISTICS", "Operaciones",
    "Agente de operaciones con IA: optimizacion de procesos, supply chain, lean y automatizacion.",
    "LOGISTICS optimiza procesos y operaciones usando IA. Supply chain, lean methodology, inventario, logistica y automatizacion.",
    "#EA580C", "from-orange-600 to-red-700", Truck, 93,
    "Chat IA para operaciones. Procesos, supply chain y lean con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Metodologias", value: 4, unit: "", change: 0, trend: "stable" },
      { label: "Procesos", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para operaciones", "Optimizacion de procesos", "Supply chain management", "Lean methodology", "Gestion de inventario", "Automatizacion"],
    [{ id: "t1", description: "Chat IA operaciones conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para operaciones conectado" }]
  ),
  makeAgent(
    "trainer", "TRAINER", "Formacion",
    "Agente de formacion con IA: cursos, e-learning, documentacion, workshops y gamificacion.",
    "TRAINER disena programas de capacitacion usando IA. Cursos, e-learning, documentacion, workshops, evaluaciones y gamificacion.",
    "#0891B2", "from-cyan-600 to-teal-700", GraduationCap, 93,
    "Chat IA para formacion. Cursos, e-learning y documentacion con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Formatos", value: 6, unit: "", change: 0, trend: "stable" },
      { label: "Gamificacion", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 80, trend: "up" },
    ],
    ["Chat IA para formacion", "Cursos completos con IA", "E-learning interactivo", "Documentacion y manuales", "Workshops", "Evaluaciones", "Gamificacion"],
    [{ id: "t1", description: "Chat IA formacion conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para formacion conectado" }]
  ),
  makeAgent(
    "translator", "TRANSLATOR", "Traduccion",
    "Agente de traduccion con IA: traduccion profesional, localizacion cultural y transcreacion en 50+ idiomas.",
    "TRANSLATOR traduce y localiza contenido usando IA. Traduccion profesional en 50+ idiomas, localizacion cultural, transcreacion y SEO internacional.",
    "#2563EB", "from-blue-600 to-indigo-700", Languages, 95,
    "Chat IA para traduccion. 50+ idiomas, localizacion y transcreacion con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Idiomas", value: 50, unit: "+", change: 0, trend: "stable" },
      { label: "Localizacion", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 92, unit: "%", change: 82, trend: "up" },
    ],
    ["Chat IA para traduccion", "50+ idiomas", "Localizacion cultural", "Transcreacion", "Traduccion tecnica", "SEO internacional"],
    [{ id: "t1", description: "Chat IA traduccion conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para traduccion conectado" }]
  ),
  makeAgent(
    "designer", "DESIGNER", "Diseno UI/UX",
    "Agente de diseno con IA: UI design, UX research, design systems, branding visual y accesibilidad.",
    "DESIGNER disena interfaces y experiencias usando IA. UI design, UX research, design systems, branding visual, wireframes y accesibilidad.",
    "#C026D3", "from-fuchsia-600 to-pink-700", Palette, 94,
    "Chat IA para diseno. UI/UX, design systems y branding con IA.",
    [
      { label: "Chat IA", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Branding", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Accesibilidad", value: 1, unit: "OK", change: 0, trend: "stable" },
      { label: "Funcionalidad", value: 90, unit: "%", change: 60, trend: "up" },
    ],
    ["Chat IA para diseno", "UI design con IA", "UX research", "Design systems", "Branding visual", "Wireframes", "Accesibilidad WCAG"],
    [{ id: "t1", description: "Chat IA diseno conectado", status: "completed", timestamp: "Funcional", duration: "—" }],
    [{ timestamp: "—", level: "success", message: "[REAL] Chat IA para diseno conectado" }]
  ),
];

// Global metrics calculated from real agent status
const fullAgents = agents.filter(a => a.functionalityLevel === "full").length;
const partialAgents = agents.filter(a => a.functionalityLevel === "partial").length;
const uiOnlyAgents = agents.filter(a => a.functionalityLevel === "ui_only").length;

export const globalMetrics = {
  totalAgents: agents.length,
  activeAgents: agents.filter(a => a.status === "active").length,
  fullFunctionality: fullAgents,
  partialFunctionality: partialAgents,
  uiOnly: uiOnlyAgents,
  totalTasksToday: 0,
  totalTasksCompleted: 0,
  globalSuccessRate: Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length),
  clientsAcquiredToday: 0,
  revenueToday: 0,
  systemHealth: Math.round(((fullAgents * 100 + partialAgents * 50 + uiOnlyAgents * 15) / agents.length)),
};