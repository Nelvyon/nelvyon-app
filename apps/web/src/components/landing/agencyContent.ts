import { BRAND } from "./shared";

export { BRAND };

export const AGENCY_STATS = [
  { value: "10.000+", label: "proyectos gestionados", numeric: 10000 },
  { value: "193", label: "sectores", numeric: 193 },
  { value: "8+", label: "años de experiencia", numeric: 8 },
  { value: "24/7", label: "soporte disponible", numeric: null },
] as const;

export const AGENCY_SERVICES = [
  {
    name: "SEO Premium",
    desc: "Posicionamiento orgánico con auditorías, contenido y enlaces de calidad.",
    from: "497",
  },
  {
    name: "Google Ads",
    desc: "Campañas de búsqueda y display optimizadas con tecnología IA.",
    from: "397",
  },
  {
    name: "Meta Ads",
    desc: "Facebook e Instagram con creatividades que convierten.",
    from: "397",
  },
  {
    name: "TikTok Ads",
    desc: "Alcance Gen Z y millennials con vídeo corto de alto impacto.",
    from: "297",
  },
  {
    name: "Email Marketing",
    desc: "Newsletters, automatizaciones y secuencias de nurturing.",
    from: "197",
  },
  {
    name: "Automatización",
    desc: "Flujos multicanal que trabajan mientras duermes.",
    from: "297",
  },
  {
    name: "Webs y landings",
    desc: "Diseño, desarrollo y optimización para conversión.",
    from: "697",
  },
  {
    name: "Contenido IA",
    desc: "Copy, imágenes y vídeos para redes y campañas.",
    from: "197",
  },
  {
    name: "Redes sociales",
    desc: "Calendario editorial, publicación y community management.",
    from: "297",
  },
] as const;

export const AGENCY_FAQ = [
  {
    q: "¿Qué incluye trabajar con NELVYON como agencia?",
    a: "Estrategia, ejecución y reporting en los canales que tu negocio necesita: SEO, paid media, email, webs y automatización. Un equipo dedicado y un único interlocutor.",
  },
  {
    q: "¿Cuánto tiempo hasta ver resultados?",
    a: "En publicidad digital, los primeros leads suelen llegar en 2-4 semanas. En SEO, los resultados sólidos se consolidan entre 3 y 6 meses según competencia.",
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
