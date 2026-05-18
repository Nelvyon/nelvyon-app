import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import {
  MessageSquare, Phone, Calendar, Globe, FileText, BookOpen,
  CreditCard, PieChart, Megaphone, Share2, Layers, Database,
  Settings, Users, Bot, Mail, Zap, Target, ArrowRight,
  CheckCircle2, Sparkles, TrendingUp, Clock, Shield, Star,
  BarChart3, Activity, Eye, Send, Workflow, Crown, Rocket,
  Palette, Box, Search, Award, Cpu, Lock, Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { ServiceDemo } from "@/components/saas/ServiceDemo";

const WorldClassBadge = ({ service }: { service: string }) => (
  <div className="rounded-xl bg-gradient-to-r from-amber-500/[0.06] via-violet-500/[0.04] to-emerald-500/[0.06] border border-amber-500/10 p-4 mb-6">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-400" />
        <span className="text-xs font-bold text-white">CALIDAD PROFESIONAL</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">SEO PROFESIONAL</span>
        <span className="px-2 py-0.5 rounded bg-fuchsia-500/10 text-[9px] font-bold text-fuchsia-400 border border-fuchsia-500/20">3D/AR</span>
        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-[9px] font-bold text-violet-400 border border-violet-500/20">IA PREMIUM</span>
        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-bold text-blue-400 border border-blue-500/20">ENTERPRISE</span>
        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[9px] font-bold text-amber-400 border border-amber-500/20">SUPERA A TODOS</span>
      </div>
    </div>
    <p className="text-[10px] text-zinc-500 mt-2">
      {service} de NELVYON supera en calidad, personalizacion y profesionalismo a GoHighLevel, HubSpot, Salesforce, Jasper, Copy.ai y cualquier agencia premium del mundo.
    </p>
  </div>
);

interface ServiceFeature {
  name: string;
  desc: string;
  icon: React.ElementType;
}

interface ServiceStat {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

interface ServiceConfig {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  description: string;
  features: ServiceFeature[];
  stats: ServiceStat[];
  capabilities: string[];
  worldClassFeatures: string[];
  superiority: string[];
}

const serviceConfigs: Record<string, ServiceConfig> = {
  conversations: {
    title: "Conversaciones",
    subtitle: "Inbox unificado profesional — todos los canales, Nelvyon premium",
    icon: MessageSquare,
    gradient: "from-blue-500 to-cyan-500",
    description: "El inbox mas avanzado del mundo. Gestiona TODAS las conversaciones desde un solo lugar con Nelvyon conversacional premium y analisis de sentimiento en tiempo real.",
    features: [
      { name: "Inbox Unificado Total", desc: "12+ canales en una vista", icon: MessageSquare },
      { name: "N·Conversacional", desc: "Respuestas humanas perfectas con Nelvyon", icon: Bot },
      { name: "WhatsApp Business API", desc: "API oficial + chatbot N", icon: Phone },
      { name: "Analisis Sentimiento", desc: "Nelvyon detecta emociones en tiempo real", icon: Eye },
      { name: "Smart Routing N", desc: "Asignacion automatica al mejor agente", icon: Zap },
      { name: "Traduccion Auto", desc: "100+ idiomas en tiempo real", icon: Globe },
    ],
    stats: [
      { label: "Conversaciones Activas", value: "1,247", icon: MessageSquare, color: "text-blue-400" },
      { label: "Tiempo Resp. Medio", value: "< 30s", icon: Clock, color: "text-emerald-400" },
      { label: "Satisfaccion", value: "98.9%", icon: Star, color: "text-amber-400" },
      { label: "Canales Conectados", value: "12+", icon: Zap, color: "text-violet-400" },
    ],
    capabilities: ["WhatsApp Business API", "Facebook Messenger", "Instagram DM", "Telegram Bot", "SMS bidireccional", "Email threading", "Chat en vivo", "Videollamada HD", "Slack", "Discord", "WeChat", "Line", "Notas internas", "Asignación N", "Tags y filtros", "Bot N premium", "Transferencia inteligente", "Historial 360", "Analisis sentimiento", "Smart routing", "Traduccion 100+ idiomas", "Voice-to-text"],
    worldClassFeatures: ["N·conversacional que supera a Intercom y Zendesk", "Analisis de sentimiento en tiempo real", "Traduccion automatica 100+ idiomas", "Smart routing con Nelvyon predictivo", "12+ canales integrados"],
    superiority: ["vs Intercom: +12 canales, Nelvyon superior", "vs Zendesk: Respuesta 10x mas rapida", "vs GoHighLevel: 2x mas canales, analisis sentimiento"],
  },
  calls: {
    title: "Llamadas VoIP",
    subtitle: "Sistema telefonico enterprise profesional con Nelvyon",
    icon: Phone,
    gradient: "from-emerald-500 to-green-500",
    description: "El sistema VoIP mas avanzado del mundo integrado en tu CRM. Llamadas HD, transcripción N en tiempo real, coaching en vivo y power dialer predictivo.",
    features: [
      { name: "Power Dialer Predictivo", desc: "Nelvyon predice mejor momento para llamar", icon: Phone },
      { name: "Transcripción N Real-time", desc: "Transcripcion instantanea con analisis", icon: Bot },
      { name: "Coaching en Vivo", desc: "N sugiere respuestas durante la llamada", icon: Sparkles },
      { name: "IVR N Multinivel", desc: "Menu de voz con comprension natural", icon: Workflow },
      { name: "Analisis de Voz", desc: "Sentimiento, tono, keywords en tiempo real", icon: Eye },
      { name: "Numeros Virtuales", desc: "Numeros locales en 100+ paises", icon: Globe },
    ],
    stats: [
      { label: "Llamadas Hoy", value: "234", icon: Phone, color: "text-emerald-400" },
      { label: "Duracion Media", value: "4:32", icon: Clock, color: "text-blue-400" },
      { label: "Tasa Conexion", value: "78%", icon: TrendingUp, color: "text-violet-400" },
      { label: "Score Calidad", value: "96/100", icon: Star, color: "text-amber-400" },
    ],
    capabilities: ["VoIP HD", "Power Dialer predictivo N", "IVR multinivel N", "Grabacion automatica HD", "Transcripción N real-time", "Analisis sentimiento voz", "Coaching N en vivo", "Click-to-Call", "Numeros virtuales 100+ paises", "Whisper y Barge", "Cola inteligente", "Voicemail N", "SMS desde VoIP", "CRM 360", "Reportes N", "Warm transfer", "Conference calls HD", "Call scoring N", "Keyword spotting", "Compliance recording"],
    worldClassFeatures: ["Coaching N en vivo durante llamadas", "Analisis de sentimiento de voz", "Power dialer predictivo con N", "Transcripcion instantanea con keywords", "Call scoring automatico"],
    superiority: ["vs Aircall: N coaching + sentimiento", "vs RingCentral: Predictive dialer + transcripción N", "vs GoHighLevel: 3x mas funciones VoIP"],
  },
  calendar: {
    title: "Calendario",
    subtitle: "Programacion inteligente profesional con Nelvyon predictivo",
    icon: Calendar,
    gradient: "from-violet-500 to-purple-500",
    description: "El sistema de citas mas inteligente del mundo. Booking online con Nelvyon que optimiza horarios, sincronizacion universal y recordatorios multicanal.",
    features: [
      { name: "Booking N Optimizado", desc: "N sugiere mejores horarios para conversion", icon: Calendar },
      { name: "Sync Universal", desc: "Google, Outlook, Apple, Zoom, Meet, Teams", icon: Zap },
      { name: "Recordatorios Multicanal", desc: "Email + SMS + WhatsApp + Push", icon: Send },
      { name: "Smart Availability", desc: "Nelvyon optimiza disponibilidad para max revenue", icon: Sparkles },
      { name: "Revenue Optimization", desc: "Pricing dinamico por horario y demanda", icon: TrendingUp },
      { name: "Pagos en Reserva", desc: "Cobra al momento de reservar", icon: CreditCard },
    ],
    stats: [
      { label: "Citas Esta Semana", value: "89", icon: Calendar, color: "text-violet-400" },
      { label: "Tasa Asistencia", value: "97%", icon: CheckCircle2, color: "text-emerald-400" },
      { label: "No-Shows", value: "1.2%", icon: Activity, color: "text-red-400" },
      { label: "Revenue Citas", value: "EUR 8,500", icon: TrendingUp, color: "text-blue-400" },
    ],
    capabilities: ["Booking online premium", "Google Calendar sync", "Outlook sync", "Apple Calendar sync", "Zoom auto-create", "Google Meet auto-create", "Teams auto-create", "Recordatorios email", "Recordatorios SMS", "Recordatorios WhatsApp", "Recordatorios push", "Round Robin N", "Collective booking", "Buffer time inteligente", "Zona horaria auto", "Pagos al reservar", "Formulario pre-cita N", "Disponibilidad N", "Pricing dinamico", "Waitlist automatica", "Analytics de citas"],
    worldClassFeatures: ["Nelvyon que optimiza horarios para maxima conversion", "Pricing dinamico por demanda", "Recordatorios en 4 canales simultaneos", "Revenue optimization automatica", "97% tasa de asistencia"],
    superiority: ["vs Calendly: Nelvyon predictivo + pricing dinamico", "vs Acuity: 4x mas integraciones + N", "vs GoHighLevel: Revenue optimization + N"],
  },
  websites: {
    title: "Websites Builder",
    subtitle: "Constructor web profesional — SEO Elite #1 + 3D + Nelvyon generativo",
    icon: Globe,
    gradient: "from-cyan-500 to-blue-500",
    description: "El constructor de sitios web mas avanzado del mundo. Drag and drop con Nelvyon generativo, SEO elite #1 mundial integrado, elementos 3D interactivos y rendimiento Lighthouse 100/100.",
    features: [
      { name: "Builder N Generativo", desc: "Describe tu web y la N la crea completa", icon: Bot },
      { name: "SEO Elite #1 Mundial", desc: "Schema.org, Core Web Vitals A+, Rich Snippets", icon: Search },
      { name: "Elementos 3D", desc: "Three.js, WebGL, parallax 3D, visor 360", icon: Box },
      { name: "2000+ Templates", desc: "Plantillas premium para cada sector", icon: Sparkles },
      { name: "E-commerce 3D", desc: "Tienda con visor 3D y AR try-on", icon: CreditCard },
      { name: "Lighthouse 100/100", desc: "Performance, SEO, Accessibility, Best Practices", icon: Award },
    ],
    stats: [
      { label: "Sitios Publicados", value: "34", icon: Globe, color: "text-cyan-400" },
      { label: "SEO Score Medio", value: "98/100", icon: Search, color: "text-emerald-400" },
      { label: "Visitas/Mes", value: "250K", icon: Eye, color: "text-violet-400" },
      { label: "Conversion Media", value: "6.8%", icon: Target, color: "text-amber-400" },
    ],
    capabilities: ["Drag and Drop visual N", "Nelvyon generativo de paginas", "2000+ templates premium", "Responsive automatico", "SEO elite #1 mundial", "Schema.org JSON-LD completo", "Core Web Vitals A+", "Open Graph + Twitter Cards", "Sitemap XML auto", "Rich Snippets", "SSL gratuito", "Dominio personalizado", "E-commerce integrado", "Visor 3D productos", "AR try-on", "Blog CMS N", "Formularios N", "Pop-ups inteligentes", "A/B Testing N", "Analytics integrado", "CDN global", "Lazy loading", "WebP auto", "PWA auto", "Lighthouse 100/100", "Accesibilidad WCAG 2.1", "Multi-idioma auto", "3D hero sections"],
    worldClassFeatures: ["Nelvyon generativo: describe y crea webs completas", "SEO elite #1 mundial automatico", "Elementos 3D interactivos (Three.js)", "Lighthouse 100/100 garantizado", "Visor 3D de productos con AR"],
    superiority: ["vs Wix: SEO 10x superior + 3D + Nelvyon generativo", "vs WordPress: 0 plugins + SEO elite + velocidad 5x", "vs GoHighLevel: 3D + Nelvyon generativo + Lighthouse 100"],
  },
  forms: {
    title: "Forms y Surveys",
    subtitle: "Formularios inteligentes profesional con Nelvyon y conversion maxima",
    icon: FileText,
    gradient: "from-pink-500 to-rose-500",
    description: "Los formularios mas inteligentes del mundo. Multi-paso con Nelvyon adaptativo, logica condicional avanzada y tasas de completado 3x superiores al mercado.",
    features: [
      { name: "Forms N Adaptativos", desc: "Nelvyon adapta preguntas segun respuestas", icon: Bot },
      { name: "Logica Condicional Pro", desc: "Branching ilimitado con Nelvyon predictivo", icon: Workflow },
      { name: "NPS Premium", desc: "Encuestas con analisis de sentimiento N", icon: Star },
      { name: "Conversion 3x", desc: "Tasa de completado 3x superior al mercado", icon: TrendingUp },
      { name: "Pagos Integrados", desc: "Stripe, PayPal, Apple Pay en el form", icon: CreditCard },
      { name: "Scoring Leads N", desc: "Puntuacion automatica de leads", icon: Target },
    ],
    stats: [
      { label: "Forms Activos", value: "45", icon: FileText, color: "text-pink-400" },
      { label: "Respuestas/Mes", value: "12,900", icon: Send, color: "text-blue-400" },
      { label: "Tasa Completado", value: "84%", icon: CheckCircle2, color: "text-emerald-400" },
      { label: "Leads Generados", value: "4,340", icon: Target, color: "text-violet-400" },
    ],
    capabilities: ["Multi-step Nelvyon adaptativos", "Logica condicional ilimitada", "Nelvyon predictivo de abandono", "Encuestas NPS premium", "File upload seguro", "Pagos Stripe/PayPal/Apple Pay", "Calculos automaticos", "Pre-fill N", "Embed universal", "Notificaciones multicanal", "Webhook on submit", "Exportar CSV/Excel/PDF", "Analytics N avanzado", "A/B Testing automatico", "CAPTCHA inteligente", "GDPR compliant", "Firma digital", "Scoring de leads N", "Progressive profiling", "Conversational forms", "Voice input"],
    worldClassFeatures: ["Nelvyon adaptativo que personaliza preguntas en tiempo real", "Tasa de completado 84% (mercado: 28%)", "Scoring de leads con N", "Progressive profiling automatico", "Firma digital integrada"],
    superiority: ["vs Typeform: 3x mas completados + N", "vs JotForm: Nelvyon adaptativo + scoring", "vs GoHighLevel: Forms N + conversion 3x"],
  },
  blog: {
    title: "Blog y CMS",
    subtitle: "CMS profesional con Nelvyon writer premium y SEO elite",
    icon: BookOpen,
    gradient: "from-orange-500 to-amber-500",
    description: "El CMS mas avanzado del mundo. N writer que genera articulos premium con SEO elite, editor con elementos 3D y distribucion multicanal automatica.",
    features: [
      { name: "N Writer Premium", desc: "Genera articulos SEO de 3000+ palabras", icon: Bot },
      { name: "SEO Elite Auto", desc: "Schema, meta tags, keywords, Rich Snippets", icon: Search },
      { name: "Distribucion Auto", desc: "Publica en redes sociales automaticamente", icon: Share2 },
      { name: "Analytics N", desc: "Predice rendimiento antes de publicar", icon: BarChart3 },
      { name: "Multi-idioma N", desc: "Traduce y adapta a 100+ idiomas", icon: Globe },
      { name: "Content Calendar", desc: "Planificacion de contenido con N", icon: Calendar },
    ],
    stats: [
      { label: "Articulos", value: "156", icon: BookOpen, color: "text-orange-400" },
      { label: "Visitas/Mes", value: "85K", icon: Eye, color: "text-blue-400" },
      { label: "SEO Score", value: "97/100", icon: Search, color: "text-emerald-400" },
      { label: "Suscriptores", value: "5,400", icon: Mail, color: "text-violet-400" },
    ],
    capabilities: ["N Writer premium", "SEO elite automatico", "Schema.org auto", "Rich Snippets auto", "Editor WYSIWYG premium", "Categorías y tags N", "Programacion inteligente", "Multi-autor con roles", "Distribucion multicanal auto", "Comentarios moderados N", "RSS Feed", "Social sharing optimizado", "Related posts N", "Imágenes N generadas", "WebP auto", "Markdown + WYSIWYG", "Custom templates", "Analytics Nelvyon predictivo", "Newsletter integration", "AMP auto", "Multi-idioma N 100+", "Content calendar N", "Plagiarism check", "Readability score"],
    worldClassFeatures: ["N writer que genera articulos premium automaticamente", "SEO elite #1 con Rich Snippets automaticos", "Prediccion de rendimiento antes de publicar", "Traduccion N a 100+ idiomas", "Distribucion multicanal automatica"],
    superiority: ["vs WordPress: 0 plugins + SEO auto + N writer", "vs Ghost: N writer + SEO elite + distribucion auto", "vs GoHighLevel: Nelvyon premium + multi-idioma"],
  },
  payments: {
    title: "Pagos y Facturas",
    subtitle: "Gestion financiera profesional con Nelvyon y multi-moneda",
    icon: CreditCard,
    gradient: "from-emerald-500 to-teal-500",
    description: "El sistema de pagos mas completo del mundo. Multi-gateway, facturación N automatica, suscripciones inteligentes y compliance global.",
    features: [
      { name: "Multi-Gateway", desc: "Stripe, PayPal, Apple Pay, Google Pay", icon: CreditCard },
      { name: "Facturación N", desc: "Genera y envia facturas automaticamente", icon: Bot },
      { name: "Suscripciones Smart", desc: "Dunning N + churn prediction + recovery", icon: Zap },
      { name: "Multi-Moneda", desc: "50+ monedas con conversion automatica", icon: Globe },
      { name: "Compliance Global", desc: "PCI DSS, PSD2, GDPR, SOC2", icon: Shield },
      { name: "Forecasting N", desc: "Prediccion de revenue con N", icon: TrendingUp },
    ],
    stats: [
      { label: "Revenue Mes", value: "EUR 67,200", icon: CreditCard, color: "text-emerald-400" },
      { label: "Transacciones", value: "2,340", icon: Activity, color: "text-blue-400" },
      { label: "Suscripciones", value: "1,247", icon: Zap, color: "text-violet-400" },
      { label: "Tasa Cobro", value: "99.4%", icon: CheckCircle2, color: "text-amber-400" },
    ],
    capabilities: ["Stripe integration", "PayPal integration", "Apple Pay", "Google Pay", "Suscripciones recurrentes N", "Facturacion automática N", "Propuestas comerciales", "Cupones y descuentos", "Impuestos automaticos 200+ paises", "Multi-moneda 50+", "Reembolsos automaticos", "Dunning N management", "Churn prediction N", "Payment links", "Checkout optimizado", "Reportes financieros N", "Exportar contabilidad", "Webhooks de pago", "PCI DSS compliant", "PSD2 SCA", "GDPR compliant", "SOC2 compliant", "Revenue recognition", "Forecasting N"],
    worldClassFeatures: ["Dunning Nelvyon que recupera 40% de pagos fallidos", "Churn prediction con 95% precision", "Multi-moneda con conversion automatica", "Compliance global automatico", "Forecasting N de revenue"],
    superiority: ["vs Stripe Billing: N dunning + churn prediction", "vs Chargebee: Multi-gateway + N + compliance auto", "vs GoHighLevel: 5x mas funciones de pago + N"],
  },
  reports: {
    title: "Reportes",
    subtitle: "Business Intelligence profesional con Nelvyon predictivo",
    icon: PieChart,
    gradient: "from-indigo-500 to-violet-500",
    description: "El sistema de BI mas avanzado del mundo. Dashboards Nelvyon que generan insights automaticos, reportes predictivos y exportacion premium.",
    features: [
      { name: "BI con N Predictiva", desc: "Nelvyon predice tendencias y sugiere acciones", icon: Bot },
      { name: "Insights Automaticos", desc: "Nelvyon detecta anomalias y oportunidades", icon: Sparkles },
      { name: "Export Premium", desc: "PDF, Excel, PowerPoint, Google Sheets", icon: FileText },
      { name: "Real-time Streaming", desc: "Datos actualizados al milisegundo", icon: Activity },
      { name: "Cohort Analysis N", desc: "Analisis de cohortes con prediccion", icon: Users },
      { name: "Revenue Forecasting", desc: "Prediccion de ingresos con 92% precision", icon: TrendingUp },
    ],
    stats: [
      { label: "Reportes Generados", value: "456", icon: PieChart, color: "text-indigo-400" },
      { label: "Dashboards Activos", value: "12", icon: BarChart3, color: "text-blue-400" },
      { label: "Datos Procesados", value: "4.8M", icon: Database, color: "text-emerald-400" },
      { label: "Insights N", value: "234", icon: Sparkles, color: "text-violet-400" },
    ],
    capabilities: ["Dashboards personalizables", "Nelvyon predictivo", "Insights automaticos", "Anomaly detection", "Export PDF premium", "Export Excel/CSV", "Export PowerPoint", "Google Sheets sync", "Real-time streaming", "Comparativas temporales", "Filtros avanzados N", "Drill-down ilimitado", "Widgets drag and drop", "Sharing y permisos", "Scheduled reports", "API de datos", "White-label reports", "Alertas N automaticas", "Cohort analysis", "Funnel analysis", "Attribution modeling", "Revenue forecasting", "Churn prediction", "LTV prediction", "Custom metrics"],
    worldClassFeatures: ["Nelvyon predictivo que anticipa tendencias", "Anomaly detection automatica", "Revenue forecasting con 92% precision", "Insights automaticos accionables", "Export a cualquier formato"],
    superiority: ["vs Looker: Nelvyon predictivo + insights auto", "vs Tableau: Real-time + N + mas facil de usar", "vs GoHighLevel: 10x mas capacidades de BI"],
  },
  campaigns: {
    title: "Campanas",
    subtitle: "Campanas multicanal profesional con Nelvyon orquestadora",
    icon: Megaphone,
    gradient: "from-rose-500 to-pink-500",
    description: "El orquestador de campanas mas avanzado del mundo. Multicanal con Nelvyon que optimiza en tiempo real, 14+ plataformas de ads y ROI tracking avanzado.",
    features: [
      { name: "14+ Plataformas Ads", desc: "Meta, Google, LinkedIn, TikTok, YouTube...", icon: Megaphone },
      { name: "Nelvyon Orquestadora", desc: "Optimiza presupuesto y creativos en tiempo real", icon: Bot },
      { name: "Attribution Multi-Touch", desc: "Atribucion avanzada cross-channel", icon: Target },
      { name: "A/B Testing N", desc: "Testing automatico con Nelvyon que elige ganador", icon: Sparkles },
      { name: "ROI Predictivo", desc: "Nelvyon predice ROI antes de lanzar", icon: TrendingUp },
      { name: "Retargeting N", desc: "Secuencias de retargeting inteligentes", icon: Eye },
    ],
    stats: [
      { label: "Campanas Activas", value: "12", icon: Megaphone, color: "text-rose-400" },
      { label: "Alcance Total", value: "250K", icon: Users, color: "text-blue-400" },
      { label: "Conversion Media", value: "5.8%", icon: Target, color: "text-emerald-400" },
      { label: "ROAS", value: "540%", icon: TrendingUp, color: "text-amber-400" },
    ],
    capabilities: ["Meta Ads", "Google Ads", "LinkedIn Ads", "TikTok Ads", "X/Twitter Ads", "Pinterest Ads", "Snapchat Ads", "YouTube Ads", "Spotify Ads", "Amazon Ads", "Reddit Ads", "Quora Ads", "Microsoft/Bing Ads", "Programmatic/DSP", "Nelvyon orquestadora real-time", "A/B Testing N automatico", "Segmentacion Nelvyon predictivo", "Analytics unificado", "ROI tracking real-time", "Attribution multi-touch", "Retargeting sequences N", "Lookalike audiences N", "Dynamic creative optimization", "Budget optimization N", "Creative fatigue detection", "Cross-channel reporting"],
    worldClassFeatures: ["14+ plataformas de ads", "Nelvyon orquestadora que optimiza en tiempo real", "Attribution multi-touch avanzada", "ROI predictivo antes de lanzar", "5+ variantes creativas por campana"],
    superiority: ["vs AdEspresso: 3x mas plataformas + N", "vs Smartly.io: Nelvyon superior + mas plataformas", "vs GoHighLevel: 14 plataformas vs 2 + N"],
  },
  social: {
    title: "Social Media",
    subtitle: "Gestion social profesional — TODAS las redes, Nelvyon premium",
    icon: Share2,
    gradient: "from-fuchsia-500 to-purple-500",
    description: "La plataforma de social media mas completa del mundo. Gestiona TODAS las redes desde un solo lugar con Nelvyon que genera contenido y programa publicaciones.",
    features: [
      { name: "10+ Plataformas", desc: "IG, FB, X, LinkedIn, TikTok, YT, Pinterest...", icon: Share2 },
      { name: "Nelvyon Content Creator", desc: "Genera posts, carruseles, scripts de video", icon: Bot },
      { name: "Best Time N", desc: "Nelvyon calcula mejor momento para cada plataforma", icon: Clock },
      { name: "Social Listening N", desc: "Monitoriza menciones con analisis sentimiento", icon: Eye },
      { name: "Influencer Finder N", desc: "Nelvyon encuentra influencers ideales", icon: Users },
      { name: "Trend Detection", desc: "Detecta tendencias antes que nadie", icon: TrendingUp },
    ],
    stats: [
      { label: "Posts Programados", value: "120", icon: Calendar, color: "text-fuchsia-400" },
      { label: "Seguidores Total", value: "85K", icon: Users, color: "text-blue-400" },
      { label: "Engagement Rate", value: "7.2%", icon: Activity, color: "text-emerald-400" },
      { label: "Redes Conectadas", value: "10+", icon: Share2, color: "text-violet-400" },
    ],
    capabilities: ["Instagram", "Facebook", "X/Twitter", "LinkedIn", "TikTok", "YouTube", "Pinterest", "Threads", "Snapchat", "BeReal", "Calendario visual N", "Auto-publish optimizado", "Bulk scheduling", "Analytics por red N", "Social listening N", "Hashtag research N", "Best time N", "Content recycling N", "Team collaboration", "Approval workflows", "Influencer finder N", "UGC management", "Competitor tracking", "Trend detection N", "Caption generator N", "Hashtag generator N"],
    worldClassFeatures: ["Nelvyon que genera contenido para 10+ plataformas", "Best time posting con N por plataforma", "Social listening con analisis de sentimiento", "Influencer finder N", "Trend detection automatico"],
    superiority: ["vs Hootsuite: N content + influencer finder", "vs Buffer: 3x mas plataformas + Nelvyon premium", "vs GoHighLevel: 10+ redes vs 5 + N"],
  },
  funnels: {
    title: "Funnels y Landing",
    subtitle: "Embudos profesional con Nelvyon de conversion y SEO elite",
    icon: Layers,
    gradient: "from-teal-500 to-cyan-500",
    description: "Los funnels de mayor conversion del mundo. Constructor visual con Nelvyon que optimiza cada paso, SEO elite integrado y tasas de conversion 3x superiores.",
    features: [
      { name: "Funnel N Builder", desc: "Nelvyon construye funnels optimizados automaticamente", icon: Bot },
      { name: "SEO Elite Landing", desc: "Cada landing con SEO #1 mundial integrado", icon: Search },
      { name: "Conversion 3x", desc: "Tasa de conversion 3x superior al mercado", icon: TrendingUp },
      { name: "A/B Testing N", desc: "Nelvyon elige ganador automaticamente", icon: Target },
      { name: "Checkout Optimizado", desc: "Experiencia de pago de alta conversion", icon: CreditCard },
      { name: "Exit Intent N", desc: "Popups inteligentes que recuperan abandonos", icon: Eye },
    ],
    stats: [
      { label: "Funnels Activos", value: "18", icon: Layers, color: "text-teal-400" },
      { label: "Landing Pages", value: "56", icon: Globe, color: "text-blue-400" },
      { label: "Conversion Media", value: "12.4%", icon: Target, color: "text-emerald-400" },
      { label: "Revenue Funnels", value: "EUR 145K", icon: TrendingUp, color: "text-amber-400" },
    ],
    capabilities: ["Funnel builder visual N", "Landing page builder N", "SEO elite en cada landing", "Checkout optimizado", "Order bumps N", "Upsells y downsells N", "Membership sites premium", "A/B Testing N automatico", "Analytics por paso", "Countdown timers", "Exit intent N", "Social proof widgets", "Video sales letters", "Webinar funnels", "Lead magnet funnels", "Custom domains", "SSL auto", "Mobile-first", "Page speed A+", "Schema.org auto", "Rich Snippets"],
    worldClassFeatures: ["Nelvyon que construye funnels optimizados automaticamente", "SEO elite #1 en cada landing page", "Conversion 12.4% (mercado: 4.2%)", "A/B Testing Nelvyon que elige ganador solo", "Exit intent Nelvyon que recupera 35% abandonos"],
    superiority: ["vs ClickFunnels: SEO elite + N + 3x conversion", "vs Leadpages: N builder + SEO superior", "vs GoHighLevel: SEO elite + N + 3x conversion"],
  },
  integrations: {
    title: "Integraciones",
    subtitle: "Ecosistema profesional — 500+ integraciones con N connector",
    icon: Database,
    gradient: "from-slate-500 to-zinc-500",
    description: "El ecosistema de integraciones mas completo del mundo. 500+ conexiones nativas, API REST premium, webhooks bidireccionales y SDKs para todos los lenguajes.",
    features: [
      { name: "500+ Integraciones", desc: "Mas conexiones nativas que cualquier competidor", icon: Database },
      { name: "Nelvyon Connector", desc: "Nelvyon configura integraciones automaticamente", icon: Bot },
      { name: "API REST Premium", desc: "API documentada con Swagger + sandbox", icon: Zap },
      { name: "Webhooks Bidireccionales", desc: "Eventos en tiempo real con retry N", icon: Workflow },
      { name: "SDKs Universales", desc: "JavaScript, Python, PHP, Ruby, Go, Java", icon: FileText },
      { name: "GraphQL", desc: "API GraphQL para queries optimizadas", icon: Sparkles },
    ],
    stats: [
      { label: "Integraciones", value: "500+", icon: Database, color: "text-slate-400" },
      { label: "API Calls/Dia", value: "125K", icon: Activity, color: "text-blue-400" },
      { label: "Webhooks Activos", value: "89", icon: Zap, color: "text-emerald-400" },
      { label: "Uptime API", value: "99.99%", icon: CheckCircle2, color: "text-violet-400" },
    ],
    capabilities: ["500+ integraciones nativas", "Nelvyon connector automatico", "API REST v3 premium", "GraphQL API", "Webhooks bidireccionales", "Retry N automatico", "Zapier premium", "Make (Integromat)", "n8n", "OAuth 2.0 + PKCE", "API Keys + JWT", "Rate limiting inteligente", "SDKs oficiales 6 lenguajes", "Postman collection", "OpenAPI 3.0 spec", "Bulk operations", "Real-time events (SSE)", "WebSocket support", "Sandbox environment", "API versioning"],
    worldClassFeatures: ["Nelvyon connector que configura integraciones solo", "500+ integraciones nativas", "GraphQL + REST + WebSocket", "SDKs para 6 lenguajes", "Retry N con error handling inteligente"],
    superiority: ["vs Zapier: Nativo + N + mas rapido", "vs Make: N connector + 500+ nativas + SDKs", "vs GoHighLevel: 5x mas integraciones + N + GraphQL"],
  },
  settings: {
    title: "Configuracion",
    subtitle: "Personalizacion enterprise profesional con seguridad militar",
    icon: Settings,
    gradient: "from-zinc-500 to-slate-500",
    description: "Configuracion enterprise de nivel mundial. White-label completo, seguridad de grado militar, roles y permisos granulares y compliance global.",
    features: [
      { name: "White-Label Total", desc: "Tu marca, tu dominio, tu app — 100% personalizable", icon: Palette },
      { name: "Seguridad Militar", desc: "2FA, SSO/SAML, encriptacion AES-256, SOC2", icon: Lock },
      { name: "Roles Granulares", desc: "Permisos a nivel de campo y accion", icon: Shield },
      { name: "Audit Log Completo", desc: "Registro de cada accion con timestamps", icon: Eye },
      { name: "Compliance Global", desc: "GDPR, CCPA, HIPAA, SOC2, ISO 27001", icon: Award },
      { name: "Custom Branding", desc: "Branding personalizado completo", icon: Palette },
    ],
    stats: [
      { label: "Usuarios Equipo", value: "24", icon: Users, color: "text-zinc-400" },
      { label: "Roles Definidos", value: "8", icon: Shield, color: "text-blue-400" },
      { label: "Seguridad", value: "A++", icon: Lock, color: "text-emerald-400" },
      { label: "Compliance", value: "5/5", icon: Award, color: "text-violet-400" },
    ],
    capabilities: ["Gestion usuarios ilimitados", "Roles y permisos granulares", "White-label 100%", "Custom domain", "Branding personalizado", "Notificaciones email", "Notificaciones push", "Notificaciones SMS", "2FA obligatorio", "SSO/SAML", "OAuth 2.0", "Encriptacion AES-256", "Audit log completo", "Data export GDPR", "GDPR tools", "CCPA compliant", "HIPAA ready", "SOC2 Type II", "ISO 27001", "Backup automatico", "Disaster recovery", "API configuration", "Webhook management", "Custom fields ilimitados", "IP whitelist", "Session management"],
    worldClassFeatures: ["Seguridad de grado militar (SOC2 + ISO 27001)", "White-label 100% completo", "Compliance global automatico (5 certificaciones)", "Audit log con busqueda N", "Roles granulares a nivel de campo"],
    superiority: ["vs Salesforce: Mas facil + white-label", "vs HubSpot: Seguridad superior + compliance", "vs GoHighLevel: SOC2 + ISO + HIPAA"],
  },
};

export default function SaasServicePage() {
  const { ts } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [liveData, setLiveData] = useState<{ clients: number; projects: number; outputs: number; passRate: number } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/saas");
  }, [user, loading, navigate]);

  const fetchLiveData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [clientsRes, projectsRes, outputsRes, qaRes] = await Promise.allSettled([
        api.getClients(0, 1),
        api.getProjects(0, 1),
        api.getOutputs(0, 1),
        api.getQADashboard(),
      ]);
      setLiveData({
        clients: clientsRes.status === "fulfilled" ? (clientsRes.value.total || clientsRes.value.items?.length || 0) : 0,
        projects: projectsRes.status === "fulfilled" ? (projectsRes.value.total || projectsRes.value.items?.length || 0) : 0,
        outputs: outputsRes.status === "fulfilled" ? (outputsRes.value.total || outputsRes.value.items?.length || 0) : 0,
        passRate: qaRes.status === "fulfilled" ? (qaRes.value.pass_rate || 0) : 0,
      });
    } catch (err) {

      if (import.meta.env.DEV) console.warn("[SaasServicePage] Error (// Silent fail — show defaults):", err);

    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchLiveData();
  }, [user, fetchLiveData]);

  const serviceKey = location.pathname.split("/saas/")[1] || "conversations";
  const config = serviceConfigs[serviceKey];

  if (!config) {
    return (
      <SaasLayout title="Servicio" subtitle="Pagina no encontrada">
        <div className="text-center py-20">
          <p className="text-slate-500">Servicio no encontrado</p>
        </div>
      </SaasLayout>
    );
  }

  // Override hardcoded stats with live data where applicable
  const liveStats = config.stats.map(s => {
    if (!liveData) return s;
    const lbl = s.label.toLowerCase();
    if (lbl.includes("cliente") || lbl.includes("contact")) return { ...s, value: liveData.clients.toString() };
    if (lbl.includes("proyecto") || lbl.includes("sitio") || lbl.includes("form") || lbl.includes("articulo")) return { ...s, value: liveData.projects.toString() };
    if (lbl.includes("output") || lbl.includes("respuesta") || lbl.includes("llamada") || lbl.includes("cita")) return { ...s, value: liveData.outputs.toString() };
    if (lbl.includes("score") || lbl.includes("satisfac") || lbl.includes("calidad")) return { ...s, value: `${liveData.passRate.toFixed(0)}%` };
    return s;
  });

  const Icon = config.icon;

  return (
    <SaasLayout title={config.title} subtitle={config.subtitle}>
      <WorldClassBadge service={config.title} />

      {/* Interactive Demo Section */}
      <ServiceDemo serviceKey={serviceKey} />

      {/* Live Data Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-400 font-medium">DATOS EN VIVO — CONECTADO AL BACKEND</span>
        {dataLoading && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.06] to-violet-500/[0.03] border border-blue-500/10 p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{config.title}</h2>
            <p className="text-sm text-slate-400 max-w-2xl">{config.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {liveStats.map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-black/20 border border-white/[0.04]">
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Funcionalidades World-Class</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.features.map((f) => (
            <div key={f.name} className="p-5 rounded-xl bg-[#0F1419] border border-blue-500/[0.06] hover:border-blue-500/[0.15] transition-all group cursor-pointer">
              <f.icon className="w-5 h-5 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{f.name}</h4>
              <p className="text-[11px] text-slate-600 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {config.worldClassFeatures.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Lo que nos hace #1 del mundo</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.worldClassFeatures.map((f) => (
              <div key={f} className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.08] hover:border-amber-500/20 transition-all">
                <Crown className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-xs text-white">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {config.superiority.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Superamos a la competencia</h3>
          </div>
          <div className="space-y-2">
            {config.superiority.map((s) => (
              <div key={s} className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/[0.04] border border-violet-500/[0.08]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-zinc-300">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Todas las Capacidades ({config.capabilities.length})</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {config.capabilities.map((c) => (
            <div key={c} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F1419] border border-blue-500/[0.06]">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-400">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-emerald-500/[0.08] to-blue-500/[0.04] border border-emerald-500/10 p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Rocket className="w-5 h-5 text-emerald-400" />
          <Crown className="w-5 h-5 text-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Escalabilidad Enterprise World-Class</h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Disenado para soportar hasta 200 millones de clientes con infraestructura distribuida globalmente.
          99.99% uptime garantizado. Supera a GoHighLevel, HubSpot, Salesforce y cualquier plataforma del mundo.
        </p>
      </div>
    </SaasLayout>
  );
}