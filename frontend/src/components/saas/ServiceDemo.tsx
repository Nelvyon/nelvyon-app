import { useState } from "react";
import {
  Play, Eye, Sparkles, Crown, Building2, ShoppingCart, Stethoscope,
  GraduationCap, Utensils, Briefcase, Hammer, Plane, Car, Dumbbell,
  Music, Camera, Palette, Scale, Landmark, Heart, Leaf, Dog,
  Shirt, Gem, Cpu, Wifi, Home, Baby, Scissors, BookOpen,
  ChevronRight, CheckCircle2, Users, TrendingUp, Zap, Star,
  MessageSquare, Phone, Calendar, Globe, FileText, CreditCard,
  BarChart3, Megaphone, Share2, Layers, Settings, Mail,
  Target, Activity, Clock, Shield, Bot, Send, Workflow,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Sector definitions (covers EVERY type of business) ─── */
interface Sector {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  examples: string[];
}

const sectors: Sector[] = [
  { id: "tech", name: "Tecnología", icon: Cpu, color: "text-cyan-400", examples: ["SaaS", "Apps", "Startups", "Software", "IA", "Cloud"] },
  { id: "ecommerce", name: "E-commerce", icon: ShoppingCart, color: "text-emerald-400", examples: ["Tiendas online", "Marketplaces", "Dropshipping", "D2C"] },
  { id: "health", name: "Salud", icon: Stethoscope, color: "text-red-400", examples: ["Clínicas", "Dentistas", "Psicólogos", "Fisioterapia", "Farmacias"] },
  { id: "education", name: "Educación", icon: GraduationCap, color: "text-blue-400", examples: ["Academias", "Universidades", "Cursos online", "Tutorías"] },
  { id: "restaurant", name: "Hostelería", icon: Utensils, color: "text-orange-400", examples: ["Restaurantes", "Bares", "Cafeterías", "Catering", "Food trucks"] },
  { id: "consulting", name: "Consultoría", icon: Briefcase, color: "text-violet-400", examples: ["Consultoras", "Coaches", "Mentores", "Asesores"] },
  { id: "construction", name: "Construcción", icon: Hammer, color: "text-amber-400", examples: ["Constructoras", "Reformas", "Arquitectos", "Ingeniería"] },
  { id: "travel", name: "Turismo", icon: Plane, color: "text-sky-400", examples: ["Agencias viaje", "Hoteles", "Alojamientos", "Tours"] },
  { id: "automotive", name: "Automoción", icon: Car, color: "text-slate-400", examples: ["Concesionarios", "Talleres", "Rent-a-car", "Autopartes"] },
  { id: "fitness", name: "Fitness", icon: Dumbbell, color: "text-lime-400", examples: ["Gimnasios", "Entrenadores", "Yoga", "CrossFit", "Nutrición"] },
  { id: "music", name: "Entretenimiento", icon: Music, color: "text-pink-400", examples: ["Músicos", "Eventos", "DJs", "Productoras", "Festivales"] },
  { id: "photo", name: "Fotografía", icon: Camera, color: "text-rose-400", examples: ["Fotógrafos", "Videógrafos", "Bodas", "Estudio foto"] },
  { id: "design", name: "Diseño", icon: Palette, color: "text-fuchsia-400", examples: ["Agencias diseño", "Freelancers", "Branding", "UX/UI"] },
  { id: "legal", name: "Legal", icon: Scale, color: "text-gray-400", examples: ["Abogados", "Notarías", "Gestorías", "Asesorías fiscales"] },
  { id: "finance", name: "Finanzas", icon: Landmark, color: "text-emerald-400", examples: ["Bancos", "Seguros", "Inversiones", "Fintech", "Cripto"] },
  { id: "nonprofit", name: "ONG / Social", icon: Heart, color: "text-red-400", examples: ["ONGs", "Fundaciones", "Asociaciones", "Cooperativas"] },
  { id: "eco", name: "Sostenibilidad", icon: Leaf, color: "text-green-400", examples: ["Eco-empresas", "Energía solar", "Reciclaje", "Bio"] },
  { id: "pets", name: "Mascotas", icon: Dog, color: "text-amber-400", examples: ["Veterinarias", "Tiendas mascotas", "Peluquería canina", "Adiestramiento"] },
  { id: "fashion", name: "Moda", icon: Shirt, color: "text-pink-400", examples: ["Boutiques", "Diseñadores", "Marcas ropa", "Joyerías"] },
  { id: "beauty", name: "Belleza", icon: Gem, color: "text-fuchsia-400", examples: ["Peluquerías", "Spas", "Estética", "Maquillaje", "Uñas"] },
  { id: "realestate", name: "Inmobiliaria", icon: Home, color: "text-teal-400", examples: ["Inmobiliarias", "Promotoras", "Administración fincas"] },
  { id: "childcare", name: "Infantil", icon: Baby, color: "text-yellow-400", examples: ["Guarderías", "Ludotecas", "Tiendas bebé", "Actividades niños"] },
  { id: "services", name: "Servicios", icon: Scissors, color: "text-indigo-400", examples: ["Limpieza", "Fontanería", "Electricistas", "Cerrajeros", "Mudanzas"] },
  { id: "media", name: "Medios", icon: BookOpen, color: "text-orange-400", examples: ["Periódicos", "Revistas", "Podcasts", "Blogs", "Influencers"] },
];

/* ─── Demo scenarios per service ─── */
interface DemoScenario {
  title: string;
  description: string;
  steps: { label: string; detail: string; icon: LucideIcon }[];
  metrics: { label: string; value: string; color: string }[];
  livePreview: { type: string; data: Record<string, string | number | string[]> };
}

function getDemoScenarios(serviceKey: string, sector: Sector): DemoScenario[] {
  const sectorName = sector.name;
  const example = sector.examples[0] || sectorName;

  const scenarioMap: Record<string, DemoScenario[]> = {
    conversations: [
      {
        title: `Inbox Unificado para ${sectorName}`,
        description: `Gestiona todas las conversaciones de tu negocio de ${example} desde un solo lugar. WhatsApp, Instagram, Email, Chat web — todo unificado.`,
        steps: [
          { label: "Cliente contacta", detail: `Un cliente de ${example} escribe por WhatsApp preguntando por servicios`, icon: MessageSquare },
          { label: "Nelvyon responde", detail: "Nelvyon responde automáticamente con información personalizada del negocio", icon: Bot },
          { label: "Escalamiento", detail: "Si es complejo, transfiere a un humano con todo el contexto", icon: Users },
          { label: "Seguimiento", detail: "Follow-up automático 24h después para asegurar satisfacción", icon: Send },
        ],
        metrics: [
          { label: "Tiempo respuesta", value: "< 30s", color: "text-emerald-400" },
          { label: "Satisfacción", value: "98.9%", color: "text-amber-400" },
          { label: "Canales", value: "12+", color: "text-blue-400" },
          { label: "Idiomas", value: "100+", color: "text-violet-400" },
        ],
        livePreview: { type: "chat", data: { from: "Cliente", message: `Hola, me interesa contratar servicios de ${example}. ¿Tienen disponibilidad?`, response: `¡Hola! 👋 Gracias por contactarnos. Sí, tenemos disponibilidad para ${example}. ¿Le gustaría agendar una consulta gratuita? Puedo mostrarle nuestros planes y precios.`, channel: "WhatsApp" } },
      },
    ],
    calls: [
      {
        title: `Sistema VoIP para ${sectorName}`,
        description: `Llamadas profesionales para tu negocio de ${example}. Power dialer, transcripción Nelvyon, coaching en vivo.`,
        steps: [
          { label: "Llamada entrante", detail: `Cliente de ${example} llama pidiendo información`, icon: Phone },
          { label: "IVR inteligente", detail: "Menú de voz con Nelvyon que entiende lenguaje natural", icon: Bot },
          { label: "Transcripción", detail: "Transcripción en tiempo real con análisis de sentimiento", icon: FileText },
          { label: "Follow-up", detail: "Resumen automático + siguiente acción programada", icon: CheckCircle2 },
        ],
        metrics: [
          { label: "Llamadas/día", value: "234", color: "text-emerald-400" },
          { label: "Tasa conexión", value: "78%", color: "text-blue-400" },
          { label: "Calidad", value: "96/100", color: "text-amber-400" },
          { label: "Países", value: "100+", color: "text-violet-400" },
        ],
        livePreview: { type: "call", data: { caller: `Cliente ${example}`, duration: "4:32", status: "En llamada", sentiment: "Positivo 😊", transcript: "Me gustaría saber más sobre sus servicios premium..." } },
      },
    ],
    calendar: [
      {
        title: `Citas Online para ${sectorName}`,
        description: `Sistema de reservas inteligente para ${example}. Booking online 24/7 con optimización de horarios.`,
        steps: [
          { label: "Cliente reserva", detail: `Reserva online desde la web de ${example}`, icon: Calendar },
          { label: "Confirmación", detail: "Email + SMS + WhatsApp de confirmación automática", icon: Send },
          { label: "Recordatorio", detail: "Recordatorio 24h y 1h antes por múltiples canales", icon: Clock },
          { label: "Post-cita", detail: "Encuesta de satisfacción + siguiente cita sugerida", icon: Star },
        ],
        metrics: [
          { label: "Asistencia", value: "97%", color: "text-emerald-400" },
          { label: "No-shows", value: "1.2%", color: "text-red-400" },
          { label: "Revenue", value: "+35%", color: "text-amber-400" },
          { label: "Canales", value: "4", color: "text-blue-400" },
        ],
        livePreview: { type: "calendar", data: { service: `Consulta ${example}`, date: "Mañana 10:00", client: "María García", status: "Confirmada ✓", reminders: "Email ✓ SMS ✓ WhatsApp ✓" } },
      },
    ],
    websites: [
      {
        title: `Web Premium para ${sectorName}`,
        description: `Sitio web profesional para ${example}. SEO profesional, elementos 3D, Lighthouse optimizado.`,
        steps: [
          { label: "Describe tu web", detail: `"Quiero una web profesional para mi negocio de ${example}"`, icon: Bot },
          { label: "Nelvyon genera", detail: "Nelvyon crea la web completa con diseño premium", icon: Sparkles },
          { label: "SEO automático", detail: "Schema.org, meta tags, Rich Snippets — todo automático", icon: Globe },
          { label: "Publicar", detail: "Deploy instantáneo con SSL, CDN global y dominio propio", icon: Zap },
        ],
        metrics: [
          { label: "Lighthouse", value: "100/100", color: "text-emerald-400" },
          { label: "SEO Score", value: "98/100", color: "text-blue-400" },
          { label: "Conversión", value: "6.8%", color: "text-amber-400" },
          { label: "Templates", value: "2000+", color: "text-violet-400" },
        ],
        livePreview: { type: "website", data: { title: `${example} — Sitio Web Premium`, sections: ["Hero 3D", "Servicios", "Testimonios", "Contacto", "Blog SEO"], seo: "A+", speed: "0.8s" } },
      },
    ],
    forms: [
      {
        title: `Formularios para ${sectorName}`,
        description: `Formularios inteligentes para ${example}. Adaptativos con Nelvyon, 3x más completados.`,
        steps: [
          { label: "Crear form", detail: `Formulario de contacto/reserva para ${example}`, icon: FileText },
          { label: "Nelvyon adapta", detail: "Preguntas se adaptan según respuestas anteriores", icon: Bot },
          { label: "Lead scoring", detail: "Puntuación automática de cada lead recibido", icon: Target },
          { label: "Notificación", detail: "Alerta instantánea por email, SMS y WhatsApp", icon: Send },
        ],
        metrics: [
          { label: "Completado", value: "84%", color: "text-emerald-400" },
          { label: "Leads/mes", value: "4,340", color: "text-blue-400" },
          { label: "vs mercado", value: "3x", color: "text-amber-400" },
          { label: "Forms activos", value: "45", color: "text-violet-400" },
        ],
        livePreview: { type: "form", data: { title: `Contacto ${example}`, fields: ["Nombre", "Email", "Teléfono", "Servicio deseado", "Presupuesto"], completion: "84%", scoring: "Hot Lead 🔥" } },
      },
    ],
    blog: [
      {
        title: `Blog SEO para ${sectorName}`,
        description: `Contenido premium para ${example}. Artículos SEO generados por Nelvyon con distribución multicanal.`,
        steps: [
          { label: "Nelvyon escribe", detail: `Artículo SEO de 3000+ palabras sobre ${example}`, icon: Bot },
          { label: "SEO élite", detail: "Keywords, meta tags, Schema.org — todo automático", icon: Globe },
          { label: "Publicar", detail: "Publicación programada con preview y revisión", icon: Send },
          { label: "Distribuir", detail: "Comparte automáticamente en todas las redes sociales", icon: Share2 },
        ],
        metrics: [
          { label: "SEO Score", value: "97/100", color: "text-emerald-400" },
          { label: "Visitas/mes", value: "85K", color: "text-blue-400" },
          { label: "Suscriptores", value: "5,400", color: "text-amber-400" },
          { label: "Idiomas", value: "100+", color: "text-violet-400" },
        ],
        livePreview: { type: "blog", data: { title: `10 Tendencias de ${sectorName} para 2026`, words: "3,200", seo: "98/100", readTime: "12 min" } },
      },
    ],
    payments: [
      {
        title: `Pagos para ${sectorName}`,
        description: `Sistema de cobros completo para ${example}. Multi-gateway, facturación automática, suscripciones.`,
        steps: [
          { label: "Factura auto", detail: `Factura generada automáticamente para cliente de ${example}`, icon: CreditCard },
          { label: "Multi-pago", detail: "Stripe, PayPal, Apple Pay, Google Pay — el cliente elige", icon: Zap },
          { label: "Suscripción", detail: "Cobros recurrentes con dunning inteligente", icon: TrendingUp },
          { label: "Reporte", detail: "Dashboard financiero en tiempo real", icon: BarChart3 },
        ],
        metrics: [
          { label: "Tasa cobro", value: "99.4%", color: "text-emerald-400" },
          { label: "Monedas", value: "50+", color: "text-blue-400" },
          { label: "Recovery", value: "+40%", color: "text-amber-400" },
          { label: "Compliance", value: "PCI DSS", color: "text-violet-400" },
        ],
        livePreview: { type: "payment", data: { invoice: `#INV-2026-0042`, amount: "€1,200.00", client: `Cliente ${example}`, status: "Pagado ✓", method: "Stripe" } },
      },
    ],
    reports: [
      {
        title: `Analytics para ${sectorName}`,
        description: `Business Intelligence para ${example}. Dashboards predictivos con insights automáticos.`,
        steps: [
          { label: "Datos en vivo", detail: `Métricas de tu negocio de ${example} en tiempo real`, icon: Activity },
          { label: "Nelvyon analiza", detail: "Detecta tendencias, anomalías y oportunidades", icon: Bot },
          { label: "Predicción", detail: "Forecasting de revenue con 92% de precisión", icon: TrendingUp },
          { label: "Exportar", detail: "PDF, Excel, PowerPoint — cualquier formato", icon: FileText },
        ],
        metrics: [
          { label: "Precisión", value: "92%", color: "text-emerald-400" },
          { label: "Datos", value: "4.8M", color: "text-blue-400" },
          { label: "Insights", value: "234", color: "text-amber-400" },
          { label: "Real-time", value: "< 1s", color: "text-violet-400" },
        ],
        livePreview: { type: "report", data: { title: `Dashboard ${example}`, kpis: ["Revenue +23%", "Clientes +15%", "Conversión 6.8%", "NPS 92"], prediction: "Revenue Q2: €2.4M" } },
      },
    ],
    campaigns: [
      {
        title: `Campañas para ${sectorName}`,
        description: `Marketing multicanal para ${example}. 14+ plataformas de ads con Nelvyon orquestadora.`,
        steps: [
          { label: "Crear campaña", detail: `Campaña multicanal para promocionar ${example}`, icon: Megaphone },
          { label: "Nelvyon optimiza", detail: "Presupuesto y creativos optimizados en tiempo real", icon: Bot },
          { label: "Multi-canal", detail: "Meta, Google, LinkedIn, TikTok, YouTube — simultáneo", icon: Share2 },
          { label: "ROI tracking", detail: "Attribution multi-touch con ROAS en tiempo real", icon: Target },
        ],
        metrics: [
          { label: "Plataformas", value: "14+", color: "text-emerald-400" },
          { label: "ROAS", value: "540%", color: "text-blue-400" },
          { label: "Conversión", value: "5.8%", color: "text-amber-400" },
          { label: "Alcance", value: "250K", color: "text-violet-400" },
        ],
        livePreview: { type: "campaign", data: { name: `Campaña ${example} Q2`, channels: ["Meta Ads", "Google Ads", "TikTok", "LinkedIn"], budget: "€5,000/mes", roas: "540%" } },
      },
    ],
    social: [
      {
        title: `Social Media para ${sectorName}`,
        description: `Gestión de redes sociales para ${example}. 10+ plataformas con contenido generado por Nelvyon.`,
        steps: [
          { label: "Nelvyon genera", detail: `Posts optimizados para ${example} en cada red social`, icon: Bot },
          { label: "Programar", detail: "Calendario visual con mejor hora por plataforma", icon: Calendar },
          { label: "Publicar", detail: "Auto-publish en 10+ redes simultáneamente", icon: Send },
          { label: "Analizar", detail: "Engagement, alcance y tendencias en tiempo real", icon: BarChart3 },
        ],
        metrics: [
          { label: "Redes", value: "10+", color: "text-emerald-400" },
          { label: "Engagement", value: "7.2%", color: "text-blue-400" },
          { label: "Seguidores", value: "85K", color: "text-amber-400" },
          { label: "Posts/sem", value: "120", color: "text-violet-400" },
        ],
        livePreview: { type: "social", data: { post: `🚀 Descubre los mejores servicios de ${example}. ¡Calidad premium garantizada! #${sectorName} #Premium`, platforms: ["Instagram", "Facebook", "LinkedIn", "TikTok", "X"], engagement: "7.2%" } },
      },
    ],
    funnels: [
      {
        title: `Funnels para ${sectorName}`,
        description: `Embudos de venta para ${example}. Conversión 3x superior con SEO élite integrado.`,
        steps: [
          { label: "Landing page", detail: `Landing optimizada para captar leads de ${example}`, icon: Globe },
          { label: "Lead magnet", detail: "Oferta irresistible que captura emails y datos", icon: Target },
          { label: "Nurturing", detail: "Secuencia de emails que educa y convierte", icon: Mail },
          { label: "Cierre", detail: "Checkout optimizado con upsells inteligentes", icon: CreditCard },
        ],
        metrics: [
          { label: "Conversión", value: "12.4%", color: "text-emerald-400" },
          { label: "vs mercado", value: "3x", color: "text-blue-400" },
          { label: "Revenue", value: "€145K", color: "text-amber-400" },
          { label: "Funnels", value: "18", color: "text-violet-400" },
        ],
        livePreview: { type: "funnel", data: { name: `Funnel ${example}`, stages: ["Landing → Lead → Nurture → Venta → Upsell"], conversion: "12.4%", revenue: "€145K" } },
      },
    ],
    integrations: [
      {
        title: `Integraciones para ${sectorName}`,
        description: `Conecta todas las herramientas de tu negocio de ${example}. 500+ integraciones nativas.`,
        steps: [
          { label: "Conectar", detail: `Integra las herramientas que usa ${example}`, icon: Wifi },
          { label: "Nelvyon configura", detail: "Nelvyon configura la integración automáticamente", icon: Bot },
          { label: "Sincronizar", detail: "Datos sincronizados en tiempo real bidireccional", icon: Zap },
          { label: "Automatizar", detail: "Workflows automáticos entre herramientas", icon: Workflow },
        ],
        metrics: [
          { label: "Integraciones", value: "500+", color: "text-emerald-400" },
          { label: "API calls/día", value: "125K", color: "text-blue-400" },
          { label: "Uptime", value: "99.99%", color: "text-amber-400" },
          { label: "SDKs", value: "6", color: "text-violet-400" },
        ],
        livePreview: { type: "integration", data: { connected: ["Stripe", "Google", "Slack", "Zapier", "HubSpot"], status: "Todas conectadas ✓", sync: "Real-time" } },
      },
    ],
    settings: [
      {
        title: `Configuración para ${sectorName}`,
        description: `Personalización enterprise para ${example}. White-label, seguridad militar, compliance global.`,
        steps: [
          { label: "White-label", detail: `Tu marca, tu dominio — 100% personalizado para ${example}`, icon: Palette },
          { label: "Seguridad", detail: "2FA, SSO, encriptación AES-256, SOC2", icon: Shield },
          { label: "Roles", detail: "Permisos granulares a nivel de campo y acción", icon: Users },
          { label: "Compliance", detail: "GDPR, CCPA, HIPAA, SOC2, ISO 27001", icon: CheckCircle2 },
        ],
        metrics: [
          { label: "Seguridad", value: "A++", color: "text-emerald-400" },
          { label: "Compliance", value: "5/5", color: "text-blue-400" },
          { label: "Uptime", value: "99.99%", color: "text-amber-400" },
          { label: "Roles", value: "Ilimitados", color: "text-violet-400" },
        ],
        livePreview: { type: "settings", data: { brand: example, domain: `${example.toLowerCase().replace(/\s/g, "")}.com`, security: "Military-grade", compliance: "GDPR ✓ SOC2 ✓ ISO ✓" } },
      },
    ],
  };

  return scenarioMap[serviceKey] || scenarioMap.conversations || [];
}

/* ─── Live Preview Components ─── */
function ChatPreview({ data }: { data: Record<string, string | number | string[]> }) {
  return (
    <div className="rounded-xl bg-[#0A0B10] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12131A] border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500/80" />
          <div className="h-2 w-2 rounded-full bg-amber-500/80" />
          <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-[10px] text-slate-500 ml-2">{String(data.channel)} — Demo en vivo</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-end">
          <div className="bg-blue-600/20 border border-blue-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
            <p className="text-[11px] text-blue-200">{String(data.message)}</p>
            <p className="text-[8px] text-blue-400/50 mt-1 text-right">12:34</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white/[0.06] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%]">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="w-3 h-3 text-violet-400" />
              <span className="text-[9px] text-violet-400 font-medium">Nelvyon</span>
            </div>
            <p className="text-[11px] text-slate-300">{String(data.response)}</p>
            <p className="text-[8px] text-slate-600 mt-1">12:34 · Respuesta automática</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericPreview({ data, type }: { data: Record<string, string | number | string[]>; type: string }) {
  const entries = Object.entries(data);
  const typeIcons: Record<string, LucideIcon> = {
    call: Phone, calendar: Calendar, website: Globe, form: FileText,
    blog: BookOpen, payment: CreditCard, report: BarChart3, campaign: Megaphone,
    social: Share2, funnel: Layers, integration: Wifi, settings: Settings,
  };
  const Icon = typeIcons[type] || Activity;

  return (
    <div className="rounded-xl bg-[#0A0B10] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12131A] border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500/80" />
          <div className="h-2 w-2 rounded-full bg-amber-500/80" />
          <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
        </div>
        <Icon className="w-3 h-3 text-violet-400 ml-2" />
        <span className="text-[10px] text-slate-500">Demo interactiva</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] text-emerald-400">LIVE</span>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-3">
            <span className="text-[10px] text-slate-600 uppercase w-20 shrink-0 pt-0.5">{key.replace(/_/g, " ")}</span>
            <div className="flex-1">
              {Array.isArray(value) ? (
                <div className="flex flex-wrap gap-1">
                  {value.map((v) => (
                    <span key={v} className="px-2 py-0.5 rounded bg-violet-500/10 text-[10px] text-violet-300 border border-violet-500/20">
                      {v}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-white">{String(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ServiceDemo Component ─── */
interface ServiceDemoProps {
  serviceKey: string;
}

export function ServiceDemo({ serviceKey }: ServiceDemoProps) {
  const [selectedSector, setSelectedSector] = useState<Sector>(sectors[0]);
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const scenarios = getDemoScenarios(serviceKey, selectedSector);
  const scenario = scenarios[0];

  if (!scenario) return null;

  const handlePlay = () => {
    setIsPlaying(true);
    setActiveStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= scenario.steps.length) {
        clearInterval(interval);
        setIsPlaying(false);
      } else {
        setActiveStep(step);
      }
    }, 1500);
  };

  const visibleSectors = showAllSectors ? sectors : sectors.slice(0, 12);

  return (
    <div className="mb-8">
      {/* Demo Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Demo Interactiva — Para TODO Tipo de Negocio</h3>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-400" />
          <span className="text-[9px] text-amber-400 font-bold">UNIVERSAL</span>
        </div>
      </div>

      {/* Sector Selector */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 mb-2">Selecciona tu sector para ver la demo personalizada:</p>
        <div className="flex flex-wrap gap-1.5">
          {visibleSectors.map((sector) => (
            <button
              key={sector.id}
              onClick={() => { setSelectedSector(sector); setActiveStep(0); }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border",
                selectedSector.id === sector.id
                  ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                  : "bg-white/[0.03] text-slate-500 border-white/[0.06] hover:bg-white/[0.06] hover:text-slate-300"
              )}
            >
              <sector.icon className={cn("w-3 h-3", selectedSector.id === sector.id ? sector.color : "text-slate-600")} />
              {sector.name}
            </button>
          ))}
          {!showAllSectors && (
            <button
              onClick={() => setShowAllSectors(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:bg-white/[0.06]"
            >
              +{sectors.length - 12} más <ChevronRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedSector.examples.map((ex) => (
            <span key={ex} className="px-2 py-0.5 rounded bg-white/[0.04] text-[9px] text-slate-500">{ex}</span>
          ))}
        </div>
      </div>

      {/* Demo Content */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/[0.04] via-[#0D0E14] to-emerald-500/[0.04] border border-violet-500/10 overflow-hidden">
        {/* Demo Title Bar */}
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0D0E14]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">{scenario.title}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{scenario.description}</p>
            </div>
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                isPlaying
                  ? "bg-emerald-500/20 text-emerald-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-500 text-white"
              )}
            >
              {isPlaying ? (
                <>
                  <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Ver Demo
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left: Steps */}
          <div className="p-6 border-r border-white/[0.04]">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-3">Flujo de trabajo</p>
            <div className="space-y-3">
              {scenario.steps.map((step, i) => {
                const StepIcon = step.icon;
                const isActive = i === activeStep;
                const isCompleted = i < activeStep;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left",
                      isActive ? "bg-violet-500/10 border border-violet-500/20" :
                      isCompleted ? "bg-emerald-500/[0.05] border border-emerald-500/10" :
                      "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                      isActive ? "bg-violet-500/20" :
                      isCompleted ? "bg-emerald-500/20" :
                      "bg-white/[0.06]"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <StepIcon className={cn("w-4 h-4", isActive ? "text-violet-400" : "text-slate-600")} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold",
                          isActive ? "text-violet-400" : isCompleted ? "text-emerald-400" : "text-slate-600"
                        )}>
                          PASO {i + 1}
                        </span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
                      </div>
                      <p className={cn("text-xs font-medium mt-0.5", isActive || isCompleted ? "text-white" : "text-slate-500")}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{step.detail}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {scenario.metrics.map((m) => (
                <div key={m.label} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <p className={cn("text-sm font-bold", m.color)}>{m.value}</p>
                  <p className="text-[9px] text-slate-600">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="p-6">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-3">Vista previa en vivo</p>
            {scenario.livePreview.type === "chat" ? (
              <ChatPreview data={scenario.livePreview.data} />
            ) : (
              <GenericPreview data={scenario.livePreview.data} type={scenario.livePreview.type} />
            )}

            {/* Universal Badge */}
            <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-500/[0.06] to-violet-500/[0.06] border border-amber-500/10 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-white">Funciona para TODOS los sectores</span>
              </div>
              <p className="text-[9px] text-slate-500">
                Esta funcionalidad se adapta automáticamente a {selectedSector.name}, {sectors.find(s => s.id !== selectedSector.id)?.name}, y cualquier otro tipo de negocio, autónomo o empresa del mundo. Sin límites de sector, nicho o tamaño.
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {["Autónomos", "Pymes", "Enterprise", "Startups", "Agencias", "Freelancers", "Corporaciones"].map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] text-emerald-400 border border-emerald-500/20">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}