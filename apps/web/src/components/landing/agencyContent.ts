import { BRAND } from "./shared";

export { BRAND };

export const AGENCY_STATS = [
  { value: "+10.000", label: "clientes atendidos" },
  { value: "+340%", label: "leads medios" },
  { value: "193", label: "sectores" },
  { value: "8+", label: "años de experiencia" },
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
    q: "¿Qué es NELVYON SaaS?",
    a: "Un software todo-en-uno que reemplaza herramientas como HubSpot, Mailchimp, Hootsuite y más. Marketing, ventas y automatización en un panel.",
  },
  {
    q: "¿Puedo probar antes de pagar?",
    a: "Sí. 14 días de prueba gratuita en el plan Growth sin tarjeta de crédito.",
  },
  {
    q: "¿Qué plan me conviene?",
    a: "Starter para equipos pequeños (hasta 3 usuarios). Growth para la mayoría de PYMEs. Elite para agencias y empresas con necesidades avanzadas.",
  },
  {
    q: "¿Incluye soporte?",
    a: "Email en Starter, prioritario en Growth y account manager dedicado en Elite.",
  },
  {
    q: "¿Puedo migrar desde HubSpot o GoHighLevel?",
    a: "Sí. Te ayudamos a importar contactos, pipelines y plantillas en el onboarding.",
  },
  {
    q: "¿Hay API y white-label?",
    a: "Disponible en plan Elite para integraciones y revendedores.",
  },
  {
    q: "¿Los datos son míos?",
    a: "100%. Exportación en cualquier momento. Cumplimos RGPD.",
  },
  {
    q: "¿Diferencia con contratar la agencia?",
    a: "SaaS es software para que tu equipo ejecute. La agencia ejecuta por ti. Muchos clientes combinan ambos.",
  },
] as const;
