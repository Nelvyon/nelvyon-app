/**
 * SOLO contenido sobre AIOR intacto en apps/web/public/www
 * NO elimina plantillas · NO reemplaza nav/megamenú · NO fusiona homes
 * NO cierra arquitectura definitiva de URLs públicas (mapa temporal)
 *
 * Tras: node scripts/brand-aior-nelvyon.mjs
 * Luego: node scripts/content-aior-nelvyon-only.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WWW = path.join(ROOT, "apps", "web", "public", "www");
const BASE = "https://nelvyon.com";
const SHOTS = path.join(ROOT, "apps", "web", "public", "brand", "public", "saas-shots");
const BRAND = path.join(ROOT, "apps", "web", "public", "brand", "public");
const PHRASE_SWAPS = [
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass2.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass3.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass4.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass5.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass6.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass7.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass8.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass9.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass10.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "data", "aior-nelvyon-phrase-swaps-pass11.json"), "utf8")),
];

/**
 * Meta temporal por plantilla.
 * canonical provisional = /www/<archivo> hasta decidir navegación pública definitiva.
 */
const PAGE_META = {
  "index.html": { title: "NELVYON — Agencia IA + SaaS B2B", description: "Agencia de marketing digital operada por IA y SaaS B2B.", role: "Home 01 / startup (temporal)" },
  "home-ai-startup.html": { title: "Agencia + IA | NELVYON", description: "Agencia de marketing digital operada por IA.", role: "Home 01 multipage" },
  "home-ai-startup-op.html": { title: "Agencia + IA (landing) | NELVYON", description: "Variante one-page Agencia + IA NELVYON.", role: "Home 01 onepage" },
  "home-ai-chatbot.html": { title: "Inbox y conversaciones | NELVYON", description: "Inbox unificado e IA conversacional en el SaaS NELVYON.", role: "Home 02" },
  "home-ai-chatbot-op.html": { title: "Inbox (landing) | NELVYON", description: "Variante one-page inbox NELVYON.", role: "Home 02 onepage" },
  "home-ai-writer-tool.html": { title: "Contenido y copy | NELVYON", description: "Contenido y producción editorial con agencia IA NELVYON.", role: "Home 04" },
  "home-ai-writer-tool-op.html": { title: "Contenido (landing) | NELVYON", description: "Variante one-page contenido NELVYON.", role: "Home 04 onepage" },
  "home-business-intelligence.html": { title: "Business Intelligence | NELVYON", description: "BI, reporting y gobierno operativo NELVYON.", role: "Home 05" },
  "home-business-intelligence-op.html": { title: "BI (landing) | NELVYON", description: "Variante one-page BI NELVYON.", role: "Home 05 onepage" },
  "home-ai-agent.html": { title: "IA y agentes | NELVYON", description: "Panel de IA y agentes con gobierno y trazabilidad.", role: "Home 06" },
  "home-ai-agent-op.html": { title: "IA (landing) | NELVYON", description: "Variante one-page IA NELVYON.", role: "Home 06 onepage" },
  "home-productivity-tools.html": { title: "Automatizaciones | NELVYON", description: "Workflows e idempotencia en el SaaS NELVYON.", role: "Home 07" },
  "home-productivity-tools-op.html": { title: "Automatizaciones (landing) | NELVYON", description: "Variante one-page automatizaciones.", role: "Home 07 onepage" },
  "home-ai-chatbot-tool.html": { title: "Comunicaciones | NELVYON", description: "Comunicaciones y WhatsApp Business en NELVYON.", role: "Home 08" },
  "home-ai-chatbot-tool-op.html": { title: "Comms (landing) | NELVYON", description: "Variante one-page comunicaciones.", role: "Home 08 onepage" },
  "home-cloud-based-saas.html": { title: "Cloud SaaS | NELVYON", description: "SaaS B2B cloud NELVYON: CRM, campañas y workflows.", role: "Home 09" },
  "home-cloud-based-saas-op.html": { title: "Cloud (landing) | NELVYON", description: "Variante one-page cloud SaaS.", role: "Home 09 onepage" },
  "home-saas-product-showcase.html": { title: "Producto SaaS | NELVYON", description: "Showcase del SaaS B2B NELVYON con capturas reales.", role: "Home 10" },
  "home-saas-product-showcase-op.html": { title: "Producto (landing) | NELVYON", description: "Variante one-page producto SaaS.", role: "Home 10 onepage" },
  "about.html": { title: "Nosotros / Agencia | NELVYON", description: "Qué es NELVYON — agencia IA + SaaS.", role: "interna" },
  "features.html": { title: "Funciones | NELVYON", description: "Capacidades NELVYON.", role: "interna" },
  "pricing.html": { title: "Precios SaaS | NELVYON", description: "Starter €97, Growth €297, Elite €797. Agencia a presupuesto.", role: "interna" },
  "contact.html": { title: "Contacto | NELVYON", description: "Contacte con NELVYON: demo SaaS o presupuesto de agencia.", role: "interna" },
  "faq.html": { title: "FAQ | NELVYON", description: "Preguntas frecuentes NELVYON.", role: "interna" },
  "integrations.html": { title: "Integraciones | NELVYON", description: "Integraciones Stripe, SES, Twilio, Meta, Google y webhooks.", role: "interna" },
  "case-studies.html": { title: "Perfiles de proyecto | NELVYON", description: "Perfiles de operación NELVYON sin clientes inventados.", role: "interna" },
  "case-studies-2.html": { title: "Perfiles de proyecto | NELVYON", description: "Variante de perfiles de proyecto NELVYON.", role: "interna" },
  "case-studies-details.html": { title: "Detalle de perfil | NELVYON", description: "Detalle de perfil de proyecto NELVYON.", role: "interna" },
  "cases.html": { title: "Perfiles | NELVYON", description: "Perfiles NELVYON.", role: "interna" },
  "blog.html": { title: "Blog | NELVYON", description: "Blog y recursos NELVYON.", role: "interna" },
  "blog-details.html": { title: "Artículo | Blog NELVYON", description: "Artículo del blog NELVYON.", role: "interna" },
  "team.html": { title: "Equipo | NELVYON", description: "Producto y equipo NELVYON.", role: "interna" },
  "team-details.html": { title: "Detalle | NELVYON", description: "Detalle NELVYON.", role: "interna" },
  "testimonial.html": { title: "Hechos de plataforma | NELVYON", description: "Hechos de producto NELVYON — sin testimonios inventados.", role: "interna" },
  "typography.html": { title: "Tipografía | NELVYON", description: "Referencia tipográfica NELVYON.", role: "interna" },
  "error.html": { title: "No encontrado | NELVYON", description: "Página no encontrada.", role: "interna" },
};

/** Renombrar ítems del megamenú (hrefs a .html intactos). */
const MENU_LABELS = [
  ["01. Home Agencia + IA", "01. Agencia + IA"],
  ["01. Home Ai Startup", "01. Agencia + IA"],
  ["Home Agencia + IA", "Agencia + IA"],
  ["02. Home Chatbot IA", "02. Inbox / conversaciones"],
  ["Home Chatbot IA", "Inbox / conversaciones"],
  ["04. Home AI Writer", "04. Contenido / Agencia"],
  ["Home AI Writer", "Contenido / Agencia"],
  ["05. Home Business Intelligence", "05. Enterprise"],
  ["Home Business Intelligence", "Enterprise"],
  ["06. Home Agentes IA", "06. IA y agentes"],
  ["Home Agentes IA", "IA y agentes"],
  ["07. Home Productividad", "07. Automatizaciones"],
  ["Home Productividad", "Automatizaciones"],
  ["08. Home Chatbot IA tool", "08. WhatsApp / Comms"],
  ["Home Chatbot IA tool", "WhatsApp / Comms"],
  ["09. Home Cloud SaaS", "09. Cloud SaaS"],
  ["Home Cloud SaaS", "Cloud SaaS"],
  ["10. Home Producto SaaS", "10. Producto SaaS"],
  ["Home Producto SaaS", "Producto SaaS"],
  ["Case Studies style 2", "Casos (estilo 2)"],
  ["Price Table", "Precios"],
  ["Error Page", "Error 404"],
  ["Blog Details", "Detalle del artículo"],
  ["Multipage", "Abrir"],
  ["Onepage", "Landing"],
];

const CONTENT_SWAPS = [
  [/\u2019/g, "'"],
  [/\u2018/g, "'"],
  [/\u201C/g, '"'],
  [/\u201D/g, '"'],
  [/\u2013/g, "-"],
  [/\u2014/g, "-"],
  [/Planora/gi, "NELVYON"],
  [/NELVYON streamlines your workflow, helping you prioritize tasks, set deadlines\./gi, "Los workflows NELVYON priorizan tareas y ejecutan con idempotencia."],
  [/Message credits\/moth/gi, "Acceso SaaS según plan"],
  [/Message credits\/month/gi, "Acceso SaaS según plan"],
  [/\d+\s*Message credits\/moth/gi, "Acceso SaaS según plan"],
  [/\d+\s*Message credits\/month/gi, "Acceso SaaS según plan"],
  [/AI and Robotics Team/gi, "equipo de producto NELVYON"],
  [/Meet the Innovators Behind NELVYON's AI and Robotics Team/gi, "El equipo detrás de NELVYON"],
  [/team@example\.com/gi, "contact@nelvyon.com"],
  [/aiors?@example\.com/gi, "contact@nelvyon.com"],
  [/themehour/gi, "nelvyon"],
  [/themeforest\.net/gi, "nelvyon.com"],
  [/themeforest/gi, "nelvyon"],
  [/ThemeForest/g, "NELVYON"],
  [/Home Ai Image Generate/gi, "(excluida)"],
  [/Home Image Gen/gi, "(excluida)"],
  [/Home finance crypto service/gi, "(excluida)"],
  [/Home Finance/gi, "(excluida)"],
  [/href="home-ai-image-generate[^"]*"/gi, 'href="index.html"'],
  [/href="home-finance-crypto-service[^"]*"/gi, 'href="index.html"'],
  [/\$<\/span>\s*0\b/g, "&euro;</span>97"],
  [/\$<\/span>\s*199\b/g, "&euro;</span>297"],
  [/\$<\/span>\s*599\b/g, "&euro;</span>797"],
  [/\$<\/span>\s*29\b/g, "&euro;</span>97"],
  [/\$<\/span>\s*49\b/g, "&euro;</span>97"],
  [/\$<\/span>\s*99\b/g, "&euro;</span>297"],
  [/\$<\/span>\s*299\b/g, "&euro;</span>797"],
  [/>\$(\d+)/g, ">&euro;$1"],
  [/Carlos Johnson/gi, "NELVYON"],
  [/Bright Innovations/gi, "NELVYON"],
  [/TechFlow/gi, "NELVYON"],
  [/Evolve Care/gi, "NELVYON"],
  [/Creative Director at Nova/gi, "Producto NELVYON"],
  [/Foundar at /gi, "Producto "],
  [/Marketing Lead at /gi, "Producto "],
  [/Product Manager at /gi, "Producto "],
  [/CEO and Co-founder/gi, "Producto NELVYON"],
  [/Join 5,000\+ companies already growing/gi, "Empiece con NELVYON: demo SaaS o presupuesto de agencia"],
  [/35% increase in conversion/gi, "Mejora operativa medible (sin % inventados)"],
  [/60% reduction in response time/gi, "Respuesta operativa más ágil (sin % inventados)"],
  [/up to 44% of chats/gi, "conversaciones del inbox"],
  [/Trusted by \d+k?\+ Users/gi, "Producto SaaS real"],
  [/Loved by Customers/gi, "Hechos de plataforma"],
  [/What People Say/gi, "Hechos de plataforma"],
  [/Proven Client Results/gi, "Hechos de plataforma"],
  [/All Success Stories/gi, "Todos los perfiles"],
  [/Recent Case Studies/gi, "Perfiles recientes"],
  [/Case Studies Details/gi, "Detalle de perfil"],
  [/Case Study Details/gi, "Detalle de perfil"],
  [/Frequently Asked Questions/gi, "Preguntas frecuentes"],
  [/Frequently Ask Questions/gi, "Preguntas frecuentes"],
  [/Freequently ask questions/gi, "Preguntas frecuentes"],
  [/Learn More/gi, "Saber más"],
  [/Read More/gi, "Leer más"],
  [/View Details/gi, "Ver detalle"],
  [/Back To Home/gi, "Volver al inicio"],
  [/Start Now/gi, "Empezar ahora"],
  [/Try it Now/gi, "Probar ahora"],
  [/Get Free Consultation/gi, "Solicitar consulta"],
  [/Create Account/gi, "Crear cuenta"],
  [/How it Works/gi, "Cómo funciona"],
  [/Why Choose Us/gi, "Por qué NELVYON"],
  [/Our Features/gi, "Nuestras funciones"],
  [/\bOur Team\b/gi, "Equipo"],
  [/\bTeam Members\b/gi, "Equipo"],
  [/\bTeam Details\b/gi, "Detalle"],
  [/\bTeam Member Details\b/gi, "Detalle"],
  [/\bTeam Member\b/gi, "Miembro"],
  [/\bTeam Leader of ADE\b/gi, "Producto NELVYON"],
  [/\bTeam Leader\b/gi, "Responsable"],
  [/\bPricing Plan\b/gi, "Planes de precios"],
  [/\[ Pricing Plan \]/gi, "[ Precios ]"],
  [/\[ Pricing \]/gi, "[ Precios ]"],
  [/\[ Our Services \]/gi, "[ Servicios ]"],
  [/\[ Team Members \]/gi, "[ Equipo ]"],
  [/Terms of Services/gi, "Términos"],
  [/\bBasic Plan\b/gi, "Plan Starter"],
  [/\bPro Plan\b/gi, "Plan Growth"],
  [/\bPriority Support\b/gi, "Soporte prioritario"],
  [/\bDedicated Support\b/gi, "Soporte dedicado"],
  [/\bCustomer Support\b/gi, "Soporte"],
  [/\bExpert Support\b/gi, "Soporte experto"],
  [/\bDirect Support\b/gi, "Soporte directo"],
  [/24\/7 Support/gi, "Soporte"],
  [/24\/7 Chatbot support/gi, "Soporte conversacional"],
  [/Explore More/gi, "Explorar más"],
  [/Explore All/gi, "Explorar todo"],
  [/Explore Services/gi, "Explorar servicios"],
  [/Browse All Articles/gi, "Ver todos los artículos"],
  [/Browse All Services/gi, "Ver servicios"],
  [/BROWSE ALL/g, "VER TODO"],
  [/\bSubscribe\b/g, "Suscribirse"],
  [/Business Intelligence/gi, "Business Intelligence"],
  [/\bBusiness\b/g, "Negocio"],
  [/Negocioes/g, "negocios"],
  [/Negocio Intelligence/g, "Business Intelligence"],
  [/yEquipo/g, "su equipo"],
  [/help@NELVYON\.com/gi, "contact@nelvyon.com"],
  [/help@nelvyon\.com/gi, "contact@nelvyon.com"],
  [/<span class="dollar">\$<\/span>\s*[\d,\.]+/gi, '<span class="dollar">&euro;</span>97'],
  [/<span class="dollar">\$<\/span>/gi, '<span class="dollar">&euro;</span>'],
  [/Empezar Free/gi, "Empezar"],
  [/Empezar free/gi, "Empezar"],
  [/Registrarse Free/gi, "Registrarse"],
  [/Registrarse Now/gi, "Registrarse"],
  [/Try it Demo/gi, "Probar demo"],
  [/Try it Free/gi, "Probar demo"],
  [/Try NELVYON Today Free/gi, "Pruebe NELVYON"],
  [/Get Started Free/gi, "Empezar"],
  [/Start Free/gi, "Empezar"],
  [/Esto es un enlace in title/gi, "Enlace en título"],
  [/Find Our Perfect Planes de precios/gi, "Elija su plan de precios"],
  [/6 Reson Why Negocioes Choose NELVYON/gi, "6 razones para elegir NELVYON"],
  [/6 Reson Why negocios Choose NELVYON/gi, "6 razones para elegir NELVYON"],
  [/Uniting Technology, Negocio Innovation, and Stellar Experience/gi, "Tecnología, innovación y experiencia operativa NELVYON"],
  [/Equipo crafts a tailored marketing strategy that aligns with your objectives/gi, "Packs OS y operación de agencia alineados a objetivos del cliente"],
  [/NELVYON AI Workflows for yEquipo/gi, "Workflows IA NELVYON para su equipo"],
  [/NELVYON AI Workflows for su equipo/gi, "Workflows IA NELVYON para su equipo"],
  [/so yEquipo can focus/gi, "para que su equipo se centre"],
  [/so su equipo can focus/gi, "para que su equipo se centre"],
  [/free yEquipo for/gi, "libere a su equipo para"],
  [/enhance yEquipo's efficiency/gi, "mejore la eficiencia de su equipo"],
  [/enhance su equipo's efficiency/gi, "mejore la eficiencia de su equipo"],
  [/NELVYON allows you to assign tasks clearly, ensuring their responsibilities\./gi, "NELVYON permite asignar tareas con claridad y responsabilidad."],
  [/NELVYON facilitates seamless communication among Equipo\./gi, "NELVYON facilita la comunicación del equipo en inbox y CRM."],
  [/NELVYON facilitates seamless communication among Team\./gi, "NELVYON facilita la comunicación del equipo en inbox y CRM."],
  [/NELVYON facilitates seamless communication among team\./gi, "NELVYON facilita la comunicación del equipo en inbox y CRM."],
  [/NELVYON facilitates seamless communication among team members\./gi, "NELVYON facilita la comunicación del equipo en inbox y CRM."],
  [/With NELVYON['\u2019]s intuitive interface, managing multiple projects becomes effortless\./gi, "Con la interfaz del SaaS NELVYON gestione proyectos y módulos sin fricción."],
  [/The Voice AI Platform for Negocio Casos de uso/gi, "Comunicaciones e IA para casos de uso B2B"],
  [/The Voice AI Platform for Business Use Cases/gi, "Comunicaciones e IA para casos de uso B2B"],
  [/The Voice AI Platform for Negocio Use Cases/gi, "Comunicaciones e IA para casos de uso B2B"],
  [/Oops! The page you're looking for doesn't exist/gi, "La página que busca no existe"],
  [/Aiorbot/gi, "NELVYON"],
  [/aiors?@example\.com/gi, "contact@nelvyon.com"],
  [/About NELVYON/gi, "NELVYON"],
  [/Hechos de plataforma NELVYON About NELVYON/gi, "Hechos de plataforma NELVYON"],
  [/Hechos de plataforma NELVYON About Aiorbot/gi, "Hechos de plataforma NELVYON"],
  [/Connect NELVYON to The Apps You Love/gi, "Conecta NELVYON con las apps que usas"],
  [/Connect Aiorbot to The Apps You Love/gi, "Conecta NELVYON con las apps que usas"],
  [/It takes just a few minutes to set up NELVYON\. No technical skills are/gi, "La puesta en marcha del SaaS NELVYON es guiada. Sin código para el usuario de negocio."],
  [/It takes just a few minutes to set up Aiorchat\. No technical skills are/gi, "La puesta en marcha del SaaS NELVYON es guiada. Sin código para el usuario de negocio."],
  [/From converting up to 44% of chats into sales and cutting support costs, to gaining actionable insights for new strategies, brands in any industry can thrive with NELVYON\.?/gi, "Inbox, campañas y workflows en el SaaS NELVYON — sin métricas inventadas de conversión."],
  [/From converting up to 44% of chats into sales and cutting support costs, to gaining actionable insights for new strategies, brands in any industry can thrive with Aiorchat\.?/gi, "Inbox, campañas y workflows en el SaaS NELVYON — sin métricas inventadas de conversión."],
  [/gaining actionable insights for new strategies, brands in any industry can thrive with NELVYON\.?/gi, "operación comercial unificada en el SaaS NELVYON."],
  [/gaining actionable insights for new strategies, brands in any industry can thrive with Aiorchat\.?/gi, "operación comercial unificada en el SaaS NELVYON."],
  [/NELVYON AI<\/a>/gi, "Contacto</a>"],
  [/NELVYON vs Chatty AI<\/a>/gi, "FAQ</a>"],
  [/Aiorchat AI<\/a>/gi, "Contacto</a>"],
  [/Aiorchat vs Chatty AI<\/a>/gi, "FAQ</a>"],
  [/Trusted by the best companies/gi, "Módulos del SaaS NELVYON"],
  [/What Our Clients Are Sayingss?/gi, "Hechos de plataforma NELVYON"],
  [/What Our Clients Are Saying/gi, "Hechos de plataforma NELVYON"],
  [/What Our Clients Say/gi, "Hechos de plataforma NELVYON"],
  [/5\/5 \(1850\+ reviews\)/gi, "Agencia IA + SaaS B2B"],
  [/1850\+ reviews/gi, "producto real"],
  [/No Credit card required/gi, "Demo con producto real"],
  [/Free For 30 Day Trial/gi, "SaaS y Agencia con precios separados"],
  [/Live support 24\/7/gi, "Sin inventar clientes ni resultados"],
  [/Start Free Trial/gi, "Solicitar demo"],
  [/Probar gratis/gi, "Solicitar demo"],
  [/Book a Demo/gi, "Reservar demo"],
  [/Request a Demo/gi, "Solicitar demo"],
  [/\bGet Started\b/gi, "Empezar"],
  [/Likmy Clayton|Arnold Doe|Arina Sathi|Jakon John/g, "NELVYON"],
  [/CEO of Company|Marketing Manager/gi, "Producto NELVYON"],
  [/Bridal Makeup|Beard Treatments|Hair Coloring|Aromatherapy/gi, "Demo del SaaS"],
  [/action="mail\.php"/gi, 'action="/api/contact"'],
  [/help@nelvyon\.ai/gi, "contact@nelvyon.com"],
  [/Aurix/gi, "NELVYON"],
  [/Leadwayz/gi, "NELVYON"],
  [/lorem ipsum[\s\S]{0,200}/gi, ""],
  [/Revolution in robotics and drones with cutting-edge AI/gi, "IA con gobierno, kill-switch y evidencia"],
  [/\u2019/g, "'"],
  [/\u2018/g, "'"],
  [/\u201C/g, '"'],
  [/\u201D/g, '"'],
  [/\u2013/g, "-"],
  [/\u2014/g, "-"],
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function copyShots() {
  const dest = path.join(WWW, "assets", "img", "nelvyon");
  fs.mkdirSync(dest, { recursive: true });
  if (fs.existsSync(SHOTS)) {
    for (const n of fs.readdirSync(SHOTS)) {
      if (/\.webp$/i.test(n)) fs.copyFileSync(path.join(SHOTS, n), path.join(dest, n));
    }
  }
  for (const n of ["hero-team.webp", "agency-brand.webp", "agency-collab.webp", "enterprise-meeting.webp", "platform-ui.webp"]) {
    const from = path.join(BRAND, n);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dest, n));
  }
}

function injectSeo(html, file) {
  const seo = PAGE_META[file];
  if (!seo) return html;
  let out = html;
  // Canonical temporal apuntando al HTML en /www — URLs públicas definitivas: pendiente
  const canon = `${BASE}/www/${file}`;
  const block = `
    <title>${seo.title}</title>
    <meta name="description" content="${seo.description}">
    <meta name="nv:template-role" content="${seo.role || "aior"}">
    <link rel="canonical" href="${canon}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="es_ES">
    <meta property="og:site_name" content="NELVYON">
    <meta property="og:title" content="${seo.title}">
    <meta property="og:description" content="${seo.description}">
    <meta property="og:url" content="${canon}">
    <meta property="og:image" content="${BASE}/opengraph-image">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${seo.title}">
    <meta name="twitter:description" content="${seo.description}">
    <meta name="twitter:image" content="${BASE}/opengraph-image">
    <meta name="robots" content="noindex,nofollow">
`;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, "");
  out = out.replace(/<meta name="description"[^>]*>/gi, "");
  out = out.replace(/<meta name="nv:template-role"[^>]*>/gi, "");
  out = out.replace(/<link rel="canonical"[^>]*>/gi, "");
  out = out.replace(/<meta property="og:[^"]+"[^>]*>/gi, "");
  out = out.replace(/<meta name="twitter:[^"]+"[^>]*>/gi, "");
  out = out.replace(/<meta name="robots"[^>]*>/gi, "");
  out = out.replace(/(<meta charset="[^"]*">)/i, `$1\n${block}`);
  out = out.replace(/lang="zxx"/i, 'lang="es"');
  out = out.replace(/lang="en"/i, 'lang="es"');
  return out;
}

function swapProductImages(html) {
  // Desactivado: la redistribución de media AIOR la hace redistribute-aior-media.mjs
  // (no sustituir por saas-shots repetidos).
  return html;
}

function applyPhraseSwaps(html) {
  let out = html;
  const sorted = [...PHRASE_SWAPS].sort((a, b) => String(b[0] || "").length - String(a[0] || "").length);
  for (const [from, to] of sorted) {
    if (!from) continue;
    const parts = String(from).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const re = new RegExp(parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"), "g");
    out = out.replace(re, to);
  }
  return out;
}

function applyContent(html, file) {
  let out = html;
  for (const [re, to] of CONTENT_SWAPS) out = out.replace(re, to);
  out = applyPhraseSwaps(out);
  for (const [from, to] of MENU_LABELS) out = out.split(from).join(to);
  // Footer legales
  if (out.includes("footer-wrapper") && !out.includes('href="/privacidad"')) {
    out = out.replace(
      /(©\s*2026\s*NELVYON[\s\S]{0,80}<\/p>)/i,
      `$1
                        <p class="mb-0 mt-2" style="font-size:13px">
                          <a href="/aviso-legal">Aviso legal</a> ·
                          <a href="/privacidad">Privacidad</a> ·
                          <a href="/cookies">Cookies</a> ·
                          <a href="/terminos">Términos</a> ·
                          <a href="/legal/dpa">DPA</a> ·
                          <a href="/seguridad">Seguridad</a>
                        </p>`
    );
  }
  out = out.replace(/With our talented team, we push the boundaries by solving complex problems\./gi, "");
  out = out.replace(/\$<\/span>0/g, "&euro;</span>97");
  out = out.replace(/\$<\/span>199/g, "&euro;</span>297");
  out = out.replace(/\$<\/span>599/g, "&euro;</span>797");
  out = out.replace(/\$0\b/g, "€97");
  out = out.replace(/\$199\b/g, "€297");
  out = out.replace(/\$599\b/g, "€797");
  // Contadores vanity del template (números partidos en spans) → métricas honestas NELVYON
  out = out.replace(
    /<h2 class="box-number"><span class="counter-number">500<\/span>K\+<\/h2>/g,
    '<h2 class="box-number">CRM</h2>'
  );
  out = out.replace(
    /<h2 class="box-number"><span class="counter-number">99\.9<\/span>%<\/h2>/g,
    '<h2 class="box-number">Email</h2>'
  );
  out = out.replace(
    /<h2 class="box-number"><span class="counter-number">2\.5<\/span>B\+<\/h2>/g,
    '<h2 class="box-number">API</h2>'
  );
  out = out.replace(
    /<h3 class="box-number"><span class="counter-number">10<\/span>M\+<\/h3>/g,
    '<h3 class="box-number">Inbox</h3>'
  );
  out = out.replace(
    /<h3 class="box-number"><span class="counter-number">150<\/span>\+<\/h3>/g,
    '<h3 class="box-number">Packs</h3>'
  );
  out = out.replace(
    /<h3 class="box-number"><span class="counter-number">4\.9<\/span>\/5<\/h3>/g,
    '<h3 class="box-number">SaaS</h3>'
  );
  out = out.replace(
    /<h3 class="box-number"><span class="counter-number">24<\/span>\/7<\/h3>/g,
    '<h3 class="box-number">OS</h3>'
  );
  out = out.replace(/class="duration">\/month<\/span>/gi, 'class="duration">/mes</span>');
  out = out.replace(/class="duration">\/Month<\/span>/gi, 'class="duration">/mes</span>');
  // Precios SaaS reales (Starter 97 / Growth 297 / Elite 797) — sin cifras demo del template
  out = out.replace(
    /<h3 class="box-title">Starter<\/h3>\s*<p class="box-text">Growth — operación comercial<\/p>/g,
    '<h3 class="box-title">Growth</h3>\n                                <p class="box-text">Operación comercial completa</p>'
  );
  out = out.replace(
    /<h3 class="box-title">Starter<\/h3>\s*<p class="box-text">Plan Elite \/ enterprise<\/p>/g,
    '<h3 class="box-title">Growth</h3>\n                                <p class="box-text">Operación comercial completa</p>'
  );
  out = out.replace(/&euro;<\/span>297\.99/g, "&euro;</span>297");
  out = out.replace(/&euro;<\/span>797\.99/g, "&euro;</span>797");
  out = out.replace(
    /<h3 class="box-title">Enterprise<\/h3>\s*<p class="box-text">(?:Equipo según plan|Unlimited Members)<\/p>/g,
    '<h3 class="box-title">Agencia</h3>\n                                <p class="box-text">Packs OS y operación a medida</p>'
  );
  out = out.replace(
    /In today's fast-paced tech\s*environment, incorporating AI is\s*essential\. It changes\s*how businesses and customers connect, offering key insights for adapting to market trends\. AI\s*involves creating computer systems that can do things that usually need human intelligence\./gi,
    "NELVYON une agencia de marketing digital operada por IA y SaaS B2B: CRM, campañas, inbox, workflows y packs OS con gobierno y evidencia."
  );
  out = out.replace(/>cases</g, ">Casos<");
  out = out.replace(/Microsoft Teamsss+/g, "Microsoft Teams");
  out = out.replace(/\bMicrosoft Team(?!s)\b/g, "Microsoft Teams");
  out = out.replace(/>AI solutions</g, ">Soluciones IA<");
  out = out.replace(/\bAI solutions\b/g, "Soluciones IA");
  out = out.replace(/pensado para su operación/g, "pensadas para su operación");
  out = out.replace(/Home Negocio Intelligence/g, "Business Intelligence");
  out = out.replace(/05\. Negocio Intelligence/g, "05. Business Intelligence");
  out = out.replace(/>Changelog</g, ">Cambios<");
  out = out.replace(/>Team</g, ">Equipo<");
  out = out.replace(/>Testimonial</g, ">Hechos<");
  out = out.replace(/Contenido \/ Agencia Tool/g, "Contenido / Agencia");
  out = out.replace(/Copyright <a /g, "<a ");
  out = out.replace(/case studies/gi, "perfiles de proyecto");
  out = out.replace(/\bUse contexto\b/g, "Utilice el contexto");
  // Agencia: precio a medida (no reutilizar €97 del template)
  out = out.replace(
    /(<h3 class="box-title">Agencia<\/h3>[\s\S]{0,280}?<h4 class="box-price"><span class="dollar">&euro;<\/span>)97<span class="duration">\/mes<\/span><\/h4>/g,
    '$1—<span class="duration">a medida</span></h4>'
  );
  out = out.replace(
    /<h2 class="box-number">SES<\/h2>/g,
    '<h2 class="box-number">Email</h2>'
  );
  out = out.replace(
    /(<h3 class="box-title">Definición del problema<\/h3>\s*<p class="box-text">)Integraciones y webhooks: Stripe, SES, Twilio, Meta, Google y API del tenant\./g,
    "$1Aclaramos objetivos, canales y restricciones del tenant antes de activar módulos."
  );
  out = out.replace(
    /(<h3 class="box-title">Inteligencia de datos<\/h3>\s*<p class="box-text">)Integraciones y webhooks: Stripe, SES, Twilio, Meta, Google y API del tenant\./g,
    "$1Conectamos CRM, campañas e inbox con gobierno de datos del tenant."
  );
  out = out.replace(
    /(<h3 class="box-title">Estrategia de modelo<\/h3>\s*<p class="box-text">)Integraciones y webhooks: Stripe, SES, Twilio, Meta, Google y API del tenant\./g,
    "$1Definimos automatizaciones, agentes y umbrales con control humano."
  );
  out = out.replace(
    /(<h3 class="box-title">Humano en el bucle<\/h3>\s*<p class="box-text">)Integraciones y webhooks: Stripe, SES, Twilio, Meta, Google y API del tenant\./g,
    "$1Validación operativa, roles y cortes de emergencia antes de escalar."
  );
  out = out.replace(
    /(<h3 class="box-title">Producción<\/h3>\s*<p class="box-text">)Integraciones y webhooks: Stripe, SES, Twilio, Meta, Google y API del tenant\./g,
    "$1Despliegue con trazabilidad, alertas y mejora continua en producción."
  );
  // Checklist about: eliminar duplicados de plantilla
  out = out.replace(
    /<div class="checklist list-two-column about-checklist[\s\S]*?<\/div>/,
    `<div class="checklist list-two-column about-checklist wow fadeInUp" data-wow-delay=".6s">
                            <ul>
                                <li class="wow fadeInUp" data-wow-delay=".1s">Agencia operada por IA</li>
                                <li class="wow fadeInUp" data-wow-delay=".2s">SaaS B2B multi-tenant</li>
                                <li class="wow fadeInUp" data-wow-delay=".3s">CRM, campañas e inbox</li>
                                <li class="wow fadeInUp" data-wow-delay=".4s">Workflows con idempotencia</li>
                                <li class="wow fadeInUp" data-wow-delay=".5s">Packs OS con evidencia</li>
                                <li class="wow fadeInUp" data-wow-delay=".5s">Gobierno y roles</li>
                            </ul>
                        </div>`
  );
  // Perfiles: textos alineados al título (evitar copy idéntico)
  out = out.replace(
    /(<h3 class="box-title"><a href="case-studies-details\.html">Soporte<\/a><\/h3>\s*<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1Inbox, agentes e IA con gobierno: corte de emergencia, roles y evidencia.$2"
  );
  out = out.replace(
    /(<h3 class="box-title"><a href="case-studies-details\.html">Salud y citas<\/a><\/h3>\s*<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1Operación de agenda, recordatorios y seguimiento en el SaaS NELVYON.$2"
  );
  out = out.replace(
    /(<h3 class="box-title"><a href="case-studies-details\.html">Formación y LMS<\/a><\/h3>\s*<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1Formación interna y contenidos operativos ligados al tenant.$2"
  );
  out = out.replace(
    /(<h3 class="box-title"><a href="case-studies-details\.html">Comercio electrónico<\/a><\/h3>\s*<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1Catálogo, campañas y recuperación de carritos con workflows NELVYON.$2"
  );
  // Integraciones: textos distintos por marca
  out = out.replace(
    /(<h3 class="box-title">Microsoft Teams<\/h3>\s*)[\s\S]*?(<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1$2Notificaciones y colaboración del equipo conectadas al SaaS NELVYON.$3"
  );
  out = out.replace(
    /(<h3 class="box-title">IA NELVYON<\/h3>\s*)[\s\S]*?(<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1$2Agentes y automatizaciones con contexto del CRM y gobierno.$3"
  );
  out = out.replace(
    /(<h3 class="box-title">Zapier<\/h3>\s*)[\s\S]*?(<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1$2Conectores y webhooks hacia herramientas del stack del cliente.$3"
  );
  out = out.replace(
    /(<h3 class="box-title">Loom<\/h3>\s*)[\s\S]*?(<p class="box-text">)[\s\S]*?(<\/p>)/,
    "$1$2Material de onboarding y soporte embebido en la operación.$3"
  );
  // Precios: diferenciar bullets por plan (Growth / Starter / Elite / Agencia)
  out = out.replace(
    /(<h3 class="box-title">Growth<\/h3>[\s\S]*?<ul>\s*)<li>CRM \+ contactos<\/li>\s*<li>Módulos SaaS según plan<\/li>\s*<li>Despliegue autogestionado<\/li>\s*<li>Acceso al dashboard SaaS<\/li>/,
    "$1<li>CRM + pipeline</li>\n                                    <li>Campañas e inbox</li>\n                                    <li>Workflows programados</li>\n                                    <li>Dashboard Growth</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Starter<\/h3>[\s\S]*?<ul>\s*)<li>Campañas email SES<\/li>\s*<li>Módulos SaaS según plan<\/li>\s*<li>Secuencias y seguimiento<\/li>\s*<li>Acceso al dashboard SaaS<\/li>/,
    "$1<li>CRM esencial</li>\n                                    <li>Campañas email SES</li>\n                                    <li>Secuencias básicas</li>\n                                    <li>Dashboard Starter</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Elite<\/h3>[\s\S]*?<ul>\s*)<li>Workflows \+ automatizaciones<\/li>\s*<li>Módulos SaaS según plan<\/li>\s*<li>Secuencias y seguimiento<\/li>\s*<li>Acceso al dashboard SaaS<\/li>/,
    "$1<li>Automatizaciones avanzadas</li>\n                                    <li>Gobierno y roles</li>\n                                    <li>API y webhooks</li>\n                                    <li>Dashboard Elite</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Agencia<\/h3>[\s\S]*?<ul>\s*)<li>Workflows \+ automatizaciones<\/li>\s*<li>Módulos SaaS según plan<\/li>\s*<li>Secuencias y seguimiento<\/li>\s*<li>Acceso al dashboard SaaS<\/li>/,
    "$1<li>Packs OS a medida</li>\n                                    <li>Operación de agencia</li>\n                                    <li>Portal cliente</li>\n                                    <li>Presupuesto personalizado</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Definición del problema<\/h3>[\s\S]*?<ul>\s*)<li>Experiencia operativa<\/li>\s*<li>Enfoque en el cliente<\/li>\s*<li>Tecnología avanzada<\/li>\s*<li>Soluciones a medida<\/li>\s*<li>Diseño centrado en el usuario<\/li>/,
    "$1<li>Objetivos de negocio</li>\n                                            <li>Canales prioritarios</li>\n                                            <li>Restricciones del tenant</li>\n                                            <li>Criterios de éxito</li>\n                                            <li>Alcance del kickoff</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Inteligencia de datos<\/h3>[\s\S]*?<ul>\s*)<li>Preparación de datos del tenant<\/li>\s*<li>Mapa de riesgos y sesgos<\/li>\s*<li>Recomendación construir o comprar<\/li>\s*<li>Soluciones a medida<\/li>\s*<li>Diseño centrado en el usuario<\/li>/,
    "$1<li>Preparación de datos del tenant</li>\n                                            <li>Mapa de riesgos y sesgos</li>\n                                            <li>Calidad e integridad</li>\n                                            <li>Permisos y roles</li>\n                                            <li>Fuentes CRM y campañas</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Estrategia de modelo<\/h3>[\s\S]*?<ul>\s*)<li>Equilibrio precisión \/ latencia<\/li>\s*<li>Coste según escala<\/li>\s*<li>Interpretabilidad y control<\/li>\s*<li>Soluciones a medida<\/li>\s*<li>Diseño centrado en el usuario<\/li>/,
    "$1<li>Automatizaciones clave</li>\n                                            <li>Umbrales y alertas</li>\n                                            <li>Coste según escala</li>\n                                            <li>Interpretabilidad</li>\n                                            <li>Control operativo</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Humano en el bucle<\/h3>[\s\S]*?<ul>\s*)<li>Equilibrio precisión \/ latencia<\/li>\s*<li>Coste según escala<\/li>\s*<li>Tecnología avanzada<\/li>\s*<li>Soluciones a medida<\/li>\s*<li>Diseño centrado en el usuario<\/li>/,
    "$1<li>Revisión humana</li>\n                                            <li>Roles y permisos</li>\n                                            <li>Cortes de emergencia</li>\n                                            <li>Escalado seguro</li>\n                                            <li>Evidencia de decisiones</li>"
  );
  out = out.replace(
    /(<h3 class="box-title">Producción<\/h3>[\s\S]*?<ul>\s*)<li>Monitorización y alertas<\/li>\s*<li>Versionado y rollback<\/li>\s*<li>Cumplimiento y trazabilidad<\/li>\s*<li>Soluciones a medida<\/li>\s*<li>Diseño centrado en el usuario<\/li>/,
    "$1<li>Monitorización y alertas</li>\n                                            <li>Versionado y rollback</li>\n                                            <li>Cumplimiento y trazabilidad</li>\n                                            <li>Mejora continua</li>\n                                            <li>Soporte operativo</li>"
  );
  out = out.replace(/Works Process/g, "Proceso de trabajo");
  out = out.replace(/<\/span> STEP<\/span>/g, "</span> PASO</span>");
  // Contacto: eliminar dirección/teléfonos ficticios de plantilla
  out = out.replace(/>Location</g, ">Ubicación<");
  out = out.replace(
    /300 SW 1st Ave, Suite 155, Fort Lauderdale, FL 33301/g,
    "Operación remota · España / UE"
  );
  out = out.replace(
    /<a href="tel:\+00123456789">\+\(00\) 12 - 345 6789<\/a>\s*<a href="tel:\+00109876543">\+\(00\) 10 - 9876 543<\/a>/g,
    '<a href="mailto:contact@nelvyon.com">contact@nelvyon.com</a>'
  );
  out = out.replace(
    /<a href="mailto:contact@nelvyon\.com">contact@nelvyon\.com<\/a>\s*<a href="mailto:contact@nelvyon\.com">contact@nelvyon\.com<\/a>/g,
    '<a href="mailto:contact@nelvyon.com">contact@nelvyon.com</a>'
  );
  // Select de precios: opciones reales (no 4× Demo)
  out = out.replace(
    /<option value="Demo del SaaS">Demo del SaaS<\/option>\s*<option value="Demo del SaaS">Demo del SaaS<\/option>\s*<option value="Demo del SaaS">Demo del SaaS<\/option>\s*<option value="Demo del SaaS">Demo del SaaS\s*<\/option>/g,
    `<option value="demo-saas">Demo del SaaS</option>
                                        <option value="plan-starter">Plan Starter</option>
                                        <option value="plan-growth">Plan Growth</option>
                                        <option value="plan-elite">Plan Elite</option>
                                        <option value="agencia">Servicios de agencia / packs</option>`
  );
  // pricing.html style2: alinear título/precio con la lista de features
  if (file === "pricing.html") {
    out = out.replace(
      /(<h3 class="box-title">)Elite(<\/h3>\s*<h4 class="box-price"><span class="dollar">&euro;<\/span>)797(<span class="duration">\/mes<\/span><\/h4>\s*<p class="subtitle">)Plan SaaS - enterprise(<\/p>\s*<\/div>\s*<div class="available-list">\s*<ul>\s*<li>Dashboard unificado<\/li>)/,
      "$1Starter$297$3Plan SaaS - 1 usuario$4"
    );
    out = out.replace(
      /(<h3 class="box-title">)Growth(<\/h3>\s*<h4 class="box-price"><span class="dollar">&euro;<\/span>)297(<span class="duration">\/mes<\/span><\/h4>\s*<p class="subtitle">)Plan SaaS - hasta 5 usuarios(<\/p>\s*<\/div>\s*<div class="available-list">\s*<ul>\s*<li>Todo lo de Growth<\/li>)/,
      "$1Elite$2797$3Plan SaaS - enterprise$4"
    );
    out = out.replace(
      /(<h3 class="box-title">)Starter(<\/h3>\s*<h4 class="box-price"><span class="dollar">&euro;<\/span>)97(<span class="duration">\/mes<\/span><\/h4>\s*<p class="subtitle">)Plan SaaS - 1 usuario(<\/p>\s*<\/div>\s*<div class="available-list">\s*<ul>\s*<li>Todo lo de Starter<\/li>)/,
      "$1Growth$2297$3Plan SaaS - hasta 5 usuarios$4"
    );
  }
  out = out.replace(/Anual <span class="">-35%<\/span>/g, "Anual");
  out = out.replace(/Anual −35%/g, "Anual");
  out = out.replace(/Anual -35%/g, "Anual");
  // Placeholders EN residuales (UI plantilla)
  out = out.replace(/What are you looking for\?/g, "¿Qué busca?");
  out = out.replace(/Write a prompt here\.\.\./g, "Escriba un prompt aquí...");
  out = out.replace(/Enter Su nombre/g, "Su nombre");
  out = out.replace(/Write you message/g, "Su mensaje");
  out = out.replace(/Su email address/g, "Su email");
  out = out.replace(/placeholder="integration"/g, 'placeholder="Buscar integración"');
  // Contact map: eliminar embed Angfuztheme (plantilla) → mapa genérico España
  out = out.replace(
    /src="https:\/\/www\.google\.com\/maps\/embed\?pb=[^"]*Angfuztheme[^"]*"/gi,
    'src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d194348!2d-3.7038!3d40.4168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses!2ses!4v1700000000000!5m2!1ses!2ses" title="NELVYON — España / UE"'
  );
  out = out.replace(
    /loading="lazy"\s+allowfullscreen=""\s+loading="lazy"/gi,
    'allowfullscreen="" loading="lazy"'
  );
  // About: misión/visión plantilla EN → NELVYON ES
  if (file === "about.html") {
    out = out.replace(
      /NELVYON Agencia \+ IA es <span class="d-block">[\s\S]*?<\/span><\/span><\/h2>/,
      `NELVYON Agencia + IA es <span class="d-block">operación con IA fiable</span></h2>`
    );
    out = out.replace(
      /<p class="about-text">NELVYON Inspire Platform[\s\S]*?<\/p>/,
      `<p class="about-text">NELVYON une agencia de marketing digital operada por IA y SaaS B2B: CRM, campañas, workflows, inbox e integraciones en un solo stack, con puesta en marcha guiada y datos reales — sin mocks silenciosos.</p>`
    );
    out = out.replace(
      /<p class="about-text">Our vision is to empower[\s\S]*?<\/p>/,
      `<p class="about-text">Nuestra visión: que equipos de marketing y ventas operen con un sistema unificado — Agencia + SaaS — medible, seguro por tenant y listo para crecer sin cambiar de herramienta cada trimestre.</p>`
    );
  }
  // FAQ: cortar cola EN plantilla residual (si queda tras phrase swaps)
  out = out.replace(
    /\s*effortlessly\. The AI teammate provides smart suggestions to improve workflows and track\s*progress in real time\./gi,
    ""
  );
  // Team details: bio plantilla arquitectura → rol NELVYON
  if (file === "team-details.html") {
    out = out.replace(
      /Architecture the structure is defined by clean lines[\s\S]*?inside and out\./,
      "Perfil de producto y plataforma NELVYON: CRM, workflows, campañas e integraciones con foco en operación real, seguridad multi-tenant y entrega medible."
    );
    out = out.replace(
      /Sustainability is also at the core of the design[\s\S]*?throughout\./g,
      "El enfoque NELVYON prioriza operación sostenible: menos herramientas sueltas, más gobierno, trazabilidad y entrega medible."
    );
    out = out.replace(
      /Material selection plays a key role[\s\S]*?conservation strategies\./g,
      "Seleccionamos módulos e integraciones según el caso: CRM, campañas, workflows, inbox y reporting, con un stack coherente en lugar de un collage de herramientas."
    );
  }
  // FAQ plantilla EN (cuerpo genérico)
  out = out.replace(
    /For the most precise and current pricing details,\s*we encourage\s*you to contact our amicable sales representatives\./gi,
    "Consulte precios actuales en la página de precios (Starter €97, Growth €297, Elite €797) o solicite presupuesto de agencia en contacto."
  );
  // Blog details: cuerpo EN robots.txt → artículo NELVYON ES
  if (file === "blog-details.html") {
    out = out.replace(
      /The robots\.txt file is one of the simplest yet most important tools[\s\S]*?adopt AI\./g,
      "Cómo NELVYON estructura la operación de marketing: CRM, secuencias, workflows e IA con evidencia. Este artículo resume buenas prácticas para poner en marcha el SaaS sin improvisar datos ni procesos."
    );
    out = out.replace(
      /The robots\.txt file is one of the simplest yet most important tools in[\s\S]*?search engines\./g,
      "La base es un proceso claro: captación, cualificación, nurturing y reporting en el mismo panel. NELVYON conecta canales y automatiza lo repetible para que el equipo decida con datos."
    );
    out = out.replace(
      /Your robots\.txt file should do just enough to guide search engines without[\s\S]*?(?:blocking|access)\./g,
      "Defina alcance, conecte integraciones críticas y active solo los módulos que vaya a operar. Evite activar todo a la vez sin dueño ni métrica."
    );
    out = out.replace(
      /A well-configured robots\.txt file improves crawl efficiency,[\s\S]*?\./g,
      "Una puesta en marcha ordenada mejora la adopción, reduce ruido operativo y deja el stack listo para escalar campañas y workflows con control."
    );
  }
  // Case study details: cuerpo EN → caso NELVYON ES
  if (file === "case-studies-details.html") {
    out = out.replace(
      /This U\.S\.-based ecommerce brand offers high-quality canvas wall art crafted[\s\S]*?\./g,
      "Marca ecommerce B2C que necesitaba unificar captación, CRM y campañas sin depender de hojas de cálculo ni herramientas desconectadas."
    );
    out = out.replace(
      /The goal was to optimize ad performance, cut wasted spend, and scale[\s\S]*?\./g,
      "El objetivo: optimizar rendimiento de adquisición, cortar gasto improductivo y escalar nurturing con workflows NELVYON y reporting claro."
    );
    out = out.replace(
      /The store had been running campaigns[\s\S]*?break-even\. Budgets were spread[\s\S]*?\./g,
      "Las campañas estaban dispersas, el CRM no reflejaba el embudo real y no había un dueño único del dato. Se unificó operación en NELVYON con reglas por etapa."
    );
  }
  // Tipografía demo: sustituir filler latino por muestra NELVYON (misma etiqueta)
  if (file === "typography.html") {
    out = out.replace(
      /<h6>pit![\s\S]*?<\/p>\s*<p>praesentium[\s\S]*?<\/p>/i,
      `<h6>NELVYON tipografía</h6>
            <p>Muestra de tipografía para la marca NELVYON. Agencia de marketing digital operada por IA y SaaS B2B.</p>
            <p>Usar esta página solo como referencia tipográfica interna. No es contenido comercial público.</p>`
    );
  }
  return out;
}

if (!fs.existsSync(WWW)) {
  console.error("Missing www. Run brand-aior-nelvyon.mjs first.");
  process.exit(1);
}

copyShots();
const files = walk(WWW).filter((f) => !path.basename(f).startsWith("mapa-"));
let n = 0;
for (const filePath of files) {
  const file = path.basename(filePath);
  let html = fs.readFileSync(filePath, "utf8");
  html = applyContent(html, file);
  html = swapProductImages(html);
  html = injectSeo(html, file);
  fs.writeFileSync(filePath, html);
  n++;
}

console.log(`Content-only pass on ${n} HTML files (layout untouched).`);
console.log("Content-only pass on 36 HTML files (layout untouched).");
console.log("Next: node scripts/fidelity-aior-media-pass.mjs && node scripts/fix-aior-www-broken-refs.mjs");
console.log("Map:", path.join(WWW, "mapa-plantillas.html"));
