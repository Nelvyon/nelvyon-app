#!/usr/bin/env node
/**
 * Generates 200 seed entries per sector (10 sectors).
 * Seeds are compact template objects with {{variable}} placeholders.
 * Run: node backend/os-agents/seeds/generate.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));

/** Template variables: {{business_name}}, {{city}}, {{value_proposition}}, {{primary_cta}} */

const SECTORS = {
  restaurantes: {
    headlines: [
      "Sabor auténtico en el corazón de {{city}}","La cocina de toda la vida en {{city}}","Tu mesa favorita en {{city}} te espera",
      "Gastronomía de autor con ingredientes de temporada","El sabor que no encontrarás en otro restaurante","Donde cada plato cuenta una historia",
      "La experiencia gastronómica que {{city}} merece","Cocina honesta, ingredientes frescos, sabor real","Más de 10 años dando de comer con cariño en {{city}}",
      "El restaurante que repites en {{city}}","Menú del día que hace que vuelvas","Cocina casera con toque de autor",
      "Tu restaurante de confianza en {{city}}","Gastronomía local con productos del mercado","Donde comer bien no cuesta una fortuna",
      "El sitio donde los locals de {{city}} comen de verdad","Ingredientes del huerto, sabor de siempre","La mesa que te hace sentir en casa",
      "Cocina mediterránea con alma en {{city}}","El restaurante que recomiendan tus amigos en {{city}}",
    ],
    metas: [
      "Restaurante en {{city}} — {{business_name}} | Reserva online","{{business_name}}: Cocina de calidad en {{city}} | Reservar mesa",
      "Mejor restaurante en {{city}} — {{business_name}}","{{business_name}} {{city}} — Gastronomía auténtica | Reservas",
    ],
    ctaLabels: ["Reservar mesa","Ver menú del día","Reserva online","Pide tu mesa","Ver la carta"],
    chatbotGreetings: [
      "¡Hola! Soy el asistente de {{business_name}}. ¿Quieres reservar una mesa o ver nuestra carta?",
      "Bienvenido/a a {{business_name}}. ¿En qué puedo ayudarte? Puedo informarte sobre el menú o gestionar tu reserva.",
    ],
  },
  clinicas: {
    headlines: [
      "Tu salud en manos de los mejores especialistas de {{city}}","Consulta médica de confianza en {{city}}","Atención personalizada para toda la familia",
      "Especialistas que escuchan y cuidan en {{city}}","Primera consulta sin esperas en {{city}}","Medicina preventiva y curativa en {{city}}",
      "Clínica con más de 15 años de experiencia en {{city}}","Tu médico de cabecera en {{city}} disponible hoy","Tecnología avanzada al servicio de tu salud",
      "Diagnóstico preciso y tratamiento personalizado","Centro médico multidisciplinar en {{city}}","Cuidamos tu salud y la de tu familia",
      "Atención médica de calidad sin listas de espera","Especialistas en {{city}} que te atienden el mismo día","Salud integral para toda la familia en {{city}}",
      "Medicina de precisión en el centro de {{city}}","Tu segunda opinión médica en {{city}}","Consulta online y presencial disponible",
      "Equipo médico comprometido con tu bienestar","Clínica de referencia en {{city}} desde hace más de una década",
    ],
    metas: [
      "Clínica médica en {{city}} — {{business_name}} | Pide cita","{{business_name}}: Especialistas médicos en {{city}} | Cita previa",
      "Médicos en {{city}} — {{business_name}} | Primera consulta","{{business_name}} {{city}} — Atención médica | Solicita cita",
    ],
    ctaLabels: ["Pedir cita","Primera consulta","Reservar cita","Consulta online","Agendar visita"],
    chatbotGreetings: [
      "Hola, soy el asistente de {{business_name}}. ¿Necesitas pedir cita o tienes alguna consulta?",
      "Bienvenido/a a {{business_name}}. Puedo ayudarte a pedir cita con nuestros especialistas.",
    ],
  },
  estetica: {
    headlines: [
      "Luce mejor que nunca en {{city}}","Tratamientos de belleza que transforman en {{city}}","Tu centro de estética de confianza en {{city}}",
      "Belleza y bienestar en el centro de {{city}}","Resultados visibles desde la primera sesión","Tu imagen, nuestra pasión en {{city}}",
      "Expertos en belleza que cuidan cada detalle","El centro de estética que recomienda {{city}}","Tratamientos personalizados para tu tipo de piel",
      "Donde la belleza se convierte en bienestar","Rituales de belleza exclusivos en {{city}}","Tu transformación comienza aquí en {{city}}",
      "Estética avanzada con tecnología de última generación","El lugar donde te mimas en {{city}}","Tratamientos faciales y corporales que funcionan",
      "Tu centro de belleza y relajación en {{city}}","Professionals de la estética con 10 años en {{city}}","Belleza natural potenciada en {{city}}",
      "Cuídate como mereces en {{city}}","El spa urbano que {{city}} estaba esperando",
    ],
    metas: [
      "Centro de estética en {{city}} — {{business_name}} | Reservar","{{business_name}}: Belleza y estética en {{city}} | Cita previa",
      "Estética y spa en {{city}} — {{business_name}}","{{business_name}} {{city}} — Tratamientos de belleza | Reserva",
    ],
    ctaLabels: ["Reservar tratamiento","Primera sesión","Reservar cita","Prueba gratuita","Ver tratamientos"],
    chatbotGreetings: [
      "¡Hola! Soy el asistente de {{business_name}}. ¿Te ayudo a reservar un tratamiento o tienes alguna pregunta?",
      "Bienvenida/o a {{business_name}}. Puedo informarte sobre nuestros tratamientos y ayudarte a reservar.",
    ],
  },
  realestate: {
    headlines: [
      "Encuentra tu hogar ideal en {{city}}","Expertos inmobiliarios de confianza en {{city}}","Compra, vende o alquila con los mejores en {{city}}",
      "Tu propiedad en {{city}} en las mejores manos","Más de 500 propiedades gestionadas en {{city}}","La inmobiliaria que cierra tus operaciones al mejor precio",
      "Asesoría inmobiliaria personalizada en {{city}}","Compra el piso de tus sueños en {{city}}","Vendemos tu propiedad en menos de 60 días",
      "Inversión inmobiliaria inteligente en {{city}}","Agentes locales que conocen cada barrio de {{city}}","Tu próximo hogar en {{city}} te está esperando",
      "Gestión integral de propiedades en {{city}}","La inmobiliaria más valorada de {{city}}","Asesoramiento jurídico y financiero incluido",
      "Compradores preseleccionados listos para tu piso","Sin comisiones ocultas, transparencia total","Valuación gratuita de tu propiedad en {{city}}",
      "Tu agente inmobiliario local en {{city}}","Alquiler y compraventa en {{city}} con garantías",
    ],
    metas: [
      "Inmobiliaria en {{city}} — {{business_name}} | Propiedades","{{business_name}}: Pisos y casas en {{city}} | Ver oferta",
      "Comprar piso en {{city}} — {{business_name}}","{{business_name}} {{city}} — Inmobiliaria | Tasación gratuita",
    ],
    ctaLabels: ["Ver propiedades","Tasación gratuita","Contactar agente","Ver pisos","Solicitar visita"],
    chatbotGreetings: [
      "Hola, soy el asistente de {{business_name}}. ¿Buscas comprar, vender o alquilar una propiedad en {{city}}?",
      "Bienvenido/a a {{business_name}}. Puedo ayudarte a encontrar la propiedad ideal en {{city}}.",
    ],
  },
  retail: {
    headlines: [
      "Calidad y precio que no encontrarás en otro sitio en {{city}}","Tu tienda de confianza en {{city}}","Productos que cuidan cada detalle",
      "Lo mejor para tu hogar a precios justos en {{city}}","Tienda local con productos exclusivos en {{city}}","Calidad premium a precios accesibles",
      "El rincón donde encuentras lo que buscas en {{city}}","Productos seleccionados para los más exigentes","Atención personalizada que marca la diferencia",
      "Tu comercio de barrio con todo lo que necesitas","Primeras marcas con el mejor servicio en {{city}}","Ahorra sin renunciar a la calidad en {{city}}",
      "La tienda que conocen todos en {{city}}","Asesoramiento experto para cada compra","Ofertas exclusivas para clientes de {{city}}",
      "Envíos a domicilio y recogida en tienda en {{city}}","Productos artesanales y de producción local","Catálogo renovado cada temporada",
      "Más de 1.000 referencias disponibles en {{city}}","La tienda que recomienda el boca a boca en {{city}}",
    ],
    metas: [
      "Tienda en {{city}} — {{business_name}} | Ver productos","{{business_name}}: Comprar en {{city}} | Catálogo online",
      "Retail y tienda en {{city}} — {{business_name}}","{{business_name}} {{city}} — Tu comercio local | Ofertas",
    ],
    ctaLabels: ["Ver catálogo","Comprar ahora","Visitar tienda","Ver ofertas","Solicitar info"],
    chatbotGreetings: [
      "¡Hola! Soy el asistente de {{business_name}}. ¿Buscas algún producto en concreto?",
      "Bienvenido/a a {{business_name}}. ¿En qué puedo ayudarte hoy?",
    ],
  },
  ecommerce: {
    headlines: [
      "Envío en 24h a toda España desde {{city}}","Los mejores productos online con garantía total","Compra inteligente, ahorra más en {{city}}",
      "Tu tienda online de confianza con miles de productos","Devoluciones gratuitas en 30 días","Precios imbatibles con calidad garantizada",
      "Descubre nuestra selección exclusiva online","Más de 10.000 clientes satisfechos cada mes","Seguro, rápido y sin complicaciones",
      "La tienda online que tus amigos ya conocen","Envío gratis en pedidos superiores a 49€","Atención al cliente 7 días a la semana",
      "Novedades cada semana en todos los departamentos","Paga en 3 plazos sin intereses","Compra desde el móvil en 2 minutos",
      "Stock actualizado en tiempo real","Los productos más valorados están aquí","Garantía de precio mínimo 30 días",
      "Entrega exprés disponible en {{city}}","Tu próxima compra tiene descuento esperándote",
    ],
    metas: [
      "Tienda online — {{business_name}} | Comprar online España","{{business_name}}: Compra online con envío 24h | Ver productos",
      "{{business_name}} — Ecommerce España | Mejor precio","Comprar {{business_name}} online | Envío gratis +49€",
    ],
    ctaLabels: ["Comprar ahora","Ver ofertas","Envío gratis","Añadir al carrito","Descubrir"],
    chatbotGreetings: [
      "¡Hola! Soy el asistente de {{business_name}}. ¿En qué producto estás interesado/a hoy?",
      "Bienvenido/a a {{business_name}}. ¿Busco algo en concreto o te muestro nuestras novedades?",
    ],
  },
  moda: {
    headlines: [
      "Moda que te define en {{city}}","Tu estilo, tu identidad — {{business_name}}","Colecciones exclusivas que no encontrarás en ningún sitio",
      "Viste diferente, viste mejor con {{business_name}}","Moda sostenible con diseño de autor","Tu guardarropa empieza aquí",
      "Tendencias de temporada a precios justos","Ropa que dura y que sienta bien","Diseño español para todo tipo de estilos",
      "Ediciones limitadas para quienes marcan tendencia","Lo que llevan las que saben en {{city}}","Básicos y piezas especiales en un solo lugar",
      "Envío a toda España en 24h — moda sin esperas","Devuelve gratis si no es lo que esperabas","Nueva colección disponible cada 2 semanas",
      "Materiales naturales, producción responsable","Talla única hasta la 52 — moda para todas","El outlet online con las mejores marcas",
      "Outfits completos por menos de lo que imaginas","La marca de moda que {{city}} está descubriendo",
    ],
    metas: [
      "Tienda de moda online — {{business_name}} | Nueva colección","{{business_name}}: Ropa y moda online España | Ver colección",
      "{{business_name}} — Moda mujer/hombre España | Comprar","Moda online {{business_name}} | Envío gratis y devolución fácil",
    ],
    ctaLabels: ["Ver colección","Comprar ahora","Nueva temporada","Ver lookbook","Últimas unidades"],
    chatbotGreetings: [
      "¡Hola! Soy el asistente de {{business_name}}. ¿Te ayudo a encontrar tu look perfecto?",
      "Bienvenida/o a {{business_name}}. ¿Buscas algo en especial o quieres ver las novedades?",
    ],
  },
  saasb2b: {
    headlines: [
      "{{value_proposition}} — empieza gratis hoy","El software que los equipos de ventas B2B eligen","Automatiza lo repetitivo, céntrate en cerrar",
      "De lead a cliente en menos pasos con {{business_name}}","La plataforma que escala contigo sin fricciones","Prueba 14 días gratis, cancela cuando quieras",
      "ROI positivo en los primeros 30 días o te devolvemos el dinero","Integrado con las herramientas que ya usas","Onboarding en 20 minutos, resultados en 7 días",
      "Más pipelines cerrados con menos esfuerzo manual","El CRM que los equipos de ventas realmente usan","Dashboard en tiempo real para que el CEO duerma tranquilo",
      "Soporte humano incluido en todos los planes","Seguridad enterprise sin coste enterprise","API abierta, integraciones ilimitadas",
      "Adaptado a procesos B2B complejos con múltiples stakeholders","De MVP a escala — crece sin cambiar de herramienta","Referencias reales disponibles bajo NDA",
      "Tu competidor ya lo usa — tú, ¿cuándo empiezas?","El SaaS que cierra el gap entre marketing y ventas B2B",
    ],
    metas: [
      "{{business_name}} — Software B2B | Prueba gratis 14 días","{{business_name}}: SaaS para equipos de ventas B2B | Demo",
      "{{business_name}} — Automatización B2B | Prueba gratis","Software B2B {{business_name}} | Ver demo y precios",
    ],
    ctaLabels: ["Prueba gratis","Ver demo","Empezar gratis","Solicitar demo","Ver planes"],
    chatbotGreetings: [
      "Hola, soy el asistente de {{business_name}}. ¿Quieres ver una demo o hablar con ventas?",
      "Bienvenido/a a {{business_name}}. ¿En qué reto de negocio puedo ayudarte hoy?",
    ],
  },
  consultoria: {
    headlines: [
      "Resultados medibles o no cobramos","Consultoría B2B que transforma negocios en {{city}}","Estrategia y ejecución, no solo PowerPoints",
      "Tu equipo externo de alto rendimiento","Del problema a la solución en semanas, no meses","Experiencia senior sin el coste de un equipo interno",
      "Consultoría especializada para empresas que quieren crecer","Metodología probada en más de 100 proyectos","Diagnóstico gratuito en la primera sesión",
      "El partner estratégico que tu empresa necesita","Nuestros clientes crecen un 30% de media","Consultoría de negocio + implementación real",
      "Sin jerga innecesaria, con resultados concretos","Acompañamiento durante todo el proceso de cambio","Expertise en {{value_proposition}}",
      "Talleres ejecutivos que aceleran decisiones","Análisis de datos para decisiones estratégicas","Del benchmarking a la hoja de ruta ejecutable",
      "Consultoría con skin in the game — compartimos el riesgo","El consultor que tus inversores recomiendan",
    ],
    metas: [
      "Consultoría empresarial en {{city}} — {{business_name}} | Contactar","{{business_name}}: Consultoría B2B en {{city}} | Primera sesión gratis",
      "{{business_name}} — Consultoría estratégica | Solicitar propuesta","Consultoría {{city}} — {{business_name}} | Ver casos de éxito",
    ],
    ctaLabels: ["Primera sesión gratis","Solicitar propuesta","Ver casos de éxito","Hablar con un consultor","Descargar metodología"],
    chatbotGreetings: [
      "Hola, soy el asistente de {{business_name}}. ¿En qué reto empresarial puedo ayudarte?",
      "Bienvenido/a a {{business_name}}. ¿Quieres agendar una sesión diagnóstico gratuita?",
    ],
  },
  fintech: {
    headlines: [
      "Finanzas inteligentes para empresas que crecen","Mueve tu dinero más rápido y con menos costes","El banco empresarial que entiende tu negocio",
      "Gestión financiera automatizada para PYMEs","Crédito empresarial en 48h sin papeleo","Tu CFO virtual disponible 24/7",
      "Pagos internacionales sin comisiones abusivas","Visibilidad total de tu cashflow en tiempo real","Open Banking para que tomes mejores decisiones",
      "Financiación flexible adaptada a tu ciclo de negocio","Cobros más rápidos, pagos más controlados","La plataforma fintech que tu contable también aprecia",
      "Sin permanencia, sin letra pequeña, sin sorpresas","Seguridad bancaria con agilidad startup","Integrado con tu ERP en menos de un día",
      "Analítica financiera predictiva para anticiparte","Tarjetas de empresa con control por departamento","Reconciliación automática que ahorra horas al mes",
      "Préstamos basados en datos reales de tu negocio","La fintech que crece con empresas como la tuya",
    ],
    metas: [
      "{{business_name}} — Fintech para empresas | Abre cuenta gratis","{{business_name}}: Finanzas empresariales | Prueba 30 días gratis",
      "{{business_name}} — Soluciones financieras B2B | Ver planes","Fintech empresarial {{business_name}} | Demo y precios",
    ],
    ctaLabels: ["Abrir cuenta gratis","Ver demo","Solicitar financiación","Ver planes","Hablar con ventas"],
    chatbotGreetings: [
      "Hola, soy el asistente de {{business_name}}. ¿En qué puedo ayudarte con tu gestión financiera?",
      "Bienvenido/a a {{business_name}}. ¿Quieres ver cómo podemos optimizar las finanzas de tu empresa?",
    ],
  },
};

const N = 200;

for (const [sector, data] of Object.entries(SECTORS)) {
  const seeds = [];
  for (let i = 0; i < N; i++) {
    const hi = data.headlines[i % data.headlines.length];
    const mi = data.metas[i % data.metas.length];
    const ci = data.ctaLabels[i % data.ctaLabels.length];
    const gi = data.chatbotGreetings[i % data.chatbotGreetings.length];
    // Add variation suffix to make each seed unique
    const suffix = i >= data.headlines.length ? ` (v${Math.floor(i / data.headlines.length) + 1})` : "";
    seeds.push({
      id: `${sector}-${String(i + 1).padStart(3, "0")}`,
      headline: hi + suffix,
      meta_title: mi,
      cta_label: ci,
      chatbot_greeting: gi,
    });
  }
  const out = join(DIR, `${sector}.json`);
  writeFileSync(out, JSON.stringify(seeds, null, 2), "utf8");
  console.log(`✅ ${sector}.json — ${seeds.length} seeds`);
}

console.log("\n✅ Generación completa — 10 sectores × 200 seeds");
