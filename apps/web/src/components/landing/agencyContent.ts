import {
  BarChart3,
  Bot,
  ClipboardCheck,
  FileText,
  Ghost,
  Globe,
  Image,
  Linkedin,
  Mail,
  MessageCircle,
  Newspaper,
  Palette,
  PenLine,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Target,
  UserPlus,
  Users,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { BRAND } from "./shared";

export { BRAND };

export type ServiceItem = {
  slug: string;
  name: string;
  desc: string;
  from: string;
  icon: LucideIcon;
};

export const ALL_SERVICES: ServiceItem[] = [
  { slug: "seo", name: "SEO Premium", desc: "Posicionamiento orgánico con auditorías, contenido y enlaces", from: "497", icon: Search },
  { slug: "google-ads", name: "Google Ads", desc: "Campañas de búsqueda y display con IA", from: "397", icon: Target },
  { slug: "meta-ads", name: "Meta Ads", desc: "Facebook e Instagram con creatividades que convierten", from: "397", icon: Share2 },
  { slug: "tiktok-ads", name: "TikTok Ads", desc: "Alcance Gen Z y millennials con vídeo corto", from: "297", icon: Video },
  { slug: "email", name: "Email Marketing", desc: "Newsletters, automatizaciones y secuencias de nurturing", from: "197", icon: Mail },
  { slug: "automatizacion", name: "Automatización de marketing", desc: "Flujos multicanal sin intervención manual", from: "297", icon: Workflow },
  { slug: "webs", name: "Creación de webs", desc: "Webs corporativas y tiendas online a medida", from: "697", icon: Globe },
  { slug: "ecommerce", name: "Creación de tiendas online", desc: "E-commerce completo con pasarela de pago", from: "897", icon: ShoppingCart },
  { slug: "branding", name: "Diseño de logos e identidad visual", desc: "Logotipos, paleta de colores, brand guidelines", from: "297", icon: Palette },
  { slug: "social", name: "Gestión de redes sociales", desc: "Publicación, respuesta y crecimiento orgánico", from: "297", icon: Share2 },
  { slug: "contenido-ia", name: "Creación de contenido con IA", desc: "Artículos, posts, guiones y creatividades", from: "197", icon: Sparkles },
  { slug: "chatbot", name: "Chatbot IA para clientes", desc: "Atención automática 24/7 por web, WhatsApp o email", from: "197", icon: Bot },
  { slug: "sms-whatsapp", name: "SMS y WhatsApp marketing", desc: "Campañas de mensajería directa", from: "197", icon: MessageCircle },
  { slug: "crm", name: "CRM y gestión de contactos", desc: "Base de datos de clientes centralizada", from: "297", icon: Users },
  { slug: "video-ia", name: "Generación de vídeos con IA", desc: "Vídeos promocionales y contenido audiovisual", from: "397", icon: Video },
  { slug: "imagen-ia", name: "Generación de imágenes con IA", desc: "Creatividades, banners y visuales de marca", from: "197", icon: Image },
  { slug: "copy-ia", name: "Copywriting con IA", desc: "Textos de venta, landing pages y anuncios", from: "197", icon: PenLine },
  { slug: "analytics", name: "Análisis y reporting", desc: "Informes de rendimiento en tiempo real", from: "197", icon: BarChart3 },
  { slug: "reputacion", name: "Reputación online", desc: "Gestión de reseñas y presencia en Google Maps", from: "297", icon: Star },
  { slug: "influencer", name: "Influencer marketing", desc: "Identificación y gestión de colaboraciones", from: "497", icon: UserPlus },
  { slug: "pr", name: "PR digital", desc: "Apariciones en medios y notas de prensa digitales", from: "397", icon: Newspaper },
  { slug: "presupuestos", name: "Presupuestos automáticos", desc: "Generación de propuestas comerciales con IA", from: "197", icon: FileText },
  { slug: "snapchat", name: "Snapchat Ads", desc: "Campañas en Snapchat para audiencias jóvenes", from: "297", icon: Ghost },
  { slug: "linkedin", name: "LinkedIn Ads", desc: "Campañas B2B y generación de leads profesionales", from: "397", icon: Linkedin },
  { slug: "auditoria", name: "Auditoría digital completa", desc: "Análisis 360º de la presencia digital", from: "497", icon: ClipboardCheck },
];

/** @deprecated Use ALL_SERVICES */
export const AGENCY_SERVICES = ALL_SERVICES;

export const AGENCY_STATS = [
  { value: "10.000+", label: "proyectos gestionados", numeric: 10000 },
  { value: "193", label: "sectores", numeric: 193 },
  { value: "8+", label: "años de experiencia", numeric: 8 },
  { value: "24/7", label: "soporte disponible", numeric: null },
] as const;

export const AGENCY_FAQ = [
  {
    q: "¿Qué incluye trabajar con NELVYON como agencia?",
    a: "Estrategia, ejecución y reporting en los canales que tu negocio necesita: SEO, paid media, email, webs y automatización. Un equipo dedicado y un único interlocutor.",
  },
  {
    q: "¿Cuánto tiempo hasta ver resultados?",
    a: "Depende del canal y del sector. En publicidad suele haber actividad en las primeras semanas; en SEO los cambios orgánicos suelen consolidarse en varios meses. Resultados variables según sector y campaña.",
  },
  {
    q: "¿Trabajáis con mi sector?",
    a: "Hemos trabajado con más de 193 sectores: clínicas, inmobiliarias, e-commerce, servicios profesionales, hostelería y más.",
  },
  {
    q: "¿Necesito contratar varias herramientas aparte?",
    a: "No. Ejecutamos con nuestra tecnología y te entregamos informes claros. Si quieres software propio, conoce nuestra oferta SaaS en /saas.",
  },
  {
    q: "¿Hay permanencia en los contratos?",
    a: "Trabajamos con compromisos mensuales flexibles. Recomendamos mínimo 3 meses para optimizar campañas con datos reales.",
  },
  {
    q: "¿Cómo se mide el éxito?",
    a: "Definimos KPIs contigo al inicio: leads, CPL, ROAS, tráfico orgánico o ventas. Dashboard compartido y reuniones de seguimiento.",
  },
  {
    q: "¿Podéis gestionar mi presupuesto de anuncios?",
    a: "Sí. El gasto en plataformas (Google, Meta, etc.) va aparte; nosotros gestionamos, optimizamos y reportamos sin sorpresas.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "Solicita una propuesta en /contacto. En 48h recibes un plan con canales, inversión recomendada y calendario de acciones.",
  },
] as const;

export const SAAS_FAQ = [
  {
    q: "¿Necesito conocimientos técnicos?",
    a: "No. La plataforma está diseñada para usarse sin programar ni configurar servidores. Todo es automático desde el panel.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, sin permanencia. Cancelas desde tu cuenta cuando lo decidas.",
  },
  {
    q: "¿Nelvyon reemplaza a mi agencia?",
    a: "Sí. Incluye las funciones que suele cubrir una agencia: marketing, ventas, comunicación y reporting en un solo software.",
  },
  {
    q: "¿Cuánto tarda en funcionar?",
    a: "Menos de 24 horas tras elegir plan y conectar tus canales.",
  },
  {
    q: "¿Hay contrato de permanencia?",
    a: "No. Facturación mensual sin compromiso a largo plazo.",
  },
  {
    q: "¿Atiende a mis clientes el chatbot?",
    a: "Sí. El chatbot con IA puede responder consultas frecuentes las 24 horas del día.",
  },
  {
    q: "¿Puedo tener varias webs?",
    a: "Según el plan: 1 en Starter, 3 en Growth e ilimitadas en Elite.",
  },
  {
    q: "¿Los informes son en tiempo real?",
    a: "Sí. Los dashboards se actualizan de forma continua con los datos de tus campañas y contactos.",
  },
  {
    q: "¿Está disponible en español?",
    a: "Sí. Interfaz, soporte y documentación en español.",
  },
  {
    q: "¿Qué pasa si necesito ayuda?",
    a: "Soporte por email en Starter, prioritario en Growth y atención dedicada en Elite.",
  },
] as const;
