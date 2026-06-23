import type { PackFocusKey } from "@/lib/saas/packFocusCopy";
import type {
  EcommerceGrowthPackIntake,
  LocalGrowthPackIntake,
  PackId,
  PackParentComplement,
  PackReport,
  PackReportSection,
  SaasB2bGrowthPackIntake,
} from "@/lib/packs/types";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
} from "@/lib/packs/types";

type Intake =
  | LocalGrowthPackIntake
  | EcommerceGrowthPackIntake
  | SaasB2bGrowthPackIntake;

function rec(
  action: string,
  impact: string,
  priority: PackReportSection["recommendations"][0]["priority"],
) {
  return { action, impact, priority };
}

export function buildParentComplement(focus: PackFocusKey): PackParentComplement {
  const map: Record<PackFocusKey, PackParentComplement> = {
    seo: {
      specialized_pack_id: "seo-local-pack",
      specialized_pack_name: "Pack SEO Local",
      parent_pack_id: LOCAL_GROWTH_PACK_ID,
      parent_pack_name: "Pack Crecimiento Local",
      headline: "Este informe profundiza el bloque SEO del pack integral Local",
      how_it_complements: [
        "El pack padre ya incluye landing, chatbot de citas y email de bienvenida — aquí ves el desglose SEO con prioridades on-page y geo.",
        "Las keywords y el plan de 30 días alimentan la misma landing live que convierte en citas.",
        "Al escalar al pack integral, el chatbot captura leads de tráfico orgánico sin rehacer la web.",
      ],
      included_in_parent: [
        "Auditoría SEO local (este informe)",
        "Landing optimizada para móvil",
        "Chatbot de citas 24/7",
        "Secuencia welcome 3 emails",
        "Informe ejecutivo CEO",
      ],
      upgrade_cta: "Cuando el cliente quiera conversión completa, lanza Crecimiento Local desde el catálogo.",
    },
    meta: {
      specialized_pack_id: "meta-ads-pack",
      specialized_pack_name: "Pack Campañas Meta Ads",
      parent_pack_id: ECOMMERCE_GROWTH_PACK_ID,
      parent_pack_name: "Pack Crecimiento Ecommerce",
      headline: "Este informe destaca el kit Meta Ads dentro del motor ecommerce integral",
      how_it_complements: [
        "El pack padre añade tienda, SEO de catálogo, chatbot de ventas y carrito abandonado — Meta Ads acelera el tráfico pagado.",
        "Los copies y la estructura de campaña están alineados con la landing de producto del pack integral.",
        "El pixel y el flujo de checkout del pack padre miden ROAS real cuando conectes Business Manager.",
      ],
      included_in_parent: [
        "Kit Meta Ads Advantage+ (destacado aquí)",
        "Landing / tienda ecommerce",
        "SEO de catálogo",
        "Chatbot de ventas",
        "Campaña carrito abandonado",
      ],
      upgrade_cta: "Para vender de punta a punta, usa Crecimiento Ecommerce — ya incluye este kit.",
    },
    email: {
      specialized_pack_id: "email-welcome-nurture",
      specialized_pack_name: "Pack Email Welcome + Nurturing",
      parent_pack_id: LOCAL_GROWTH_PACK_ID,
      parent_pack_name: "Pack Crecimiento Local",
      headline: "Este informe centra la secuencia email del pack integral Local",
      how_it_complements: [
        "El pack padre publica landing y chatbot que generan contactos — la secuencia welcome los activa en 72 h.",
        "Los subjects A/B y el mapa de automatización encajan con el CRM creado al kickoff.",
        "Al combinar con SEO y chatbot del pack padre, cierras el loop captación → nurturing → cita.",
      ],
      included_in_parent: [
        "Secuencia welcome 3-touch (foco de este informe)",
        "Landing web local",
        "Auditoría SEO local",
        "Chatbot de citas",
        "Informe ejecutivo",
      ],
      upgrade_cta: "El pack Crecimiento Local ya incluye esta secuencia más landing y SEO.",
    },
    landing: {
      specialized_pack_id: "landing-funnel-pack",
      specialized_pack_name: "Pack Landing + Funnel",
      parent_pack_id: SAAS_B2B_GROWTH_PACK_ID,
      parent_pack_name: "Pack Crecimiento SaaS B2B",
      headline: "Este informe enfatiza landing PLG y mapa de funnel del pack B2B integral",
      how_it_complements: [
        "El pack padre añade SEO demand gen, bot de demo, nurture 5-touch y playbook outbound — la landing es la puerta de entrada.",
        "El mapa TOFU → MOFU → BOFU conecta con la secuencia nurture y el bot de calificación.",
        "Al escalar al pack integral, el pipeline MQL→SQL se mide en el mismo dashboard CEO.",
      ],
      included_in_parent: [
        "Landing PLG + mapa funnel (foco aquí)",
        "SEO demand gen B2B",
        "Bot de demo / calificación",
        "Secuencia nurture 5 emails",
        "Playbook outbound / ABM",
      ],
      upgrade_cta: "Crecimiento SaaS B2B incluye esta landing más nurture, SEO y outbound.",
    },
  };
  return map[focus];
}

export function buildLocalDemoSections(intake: LocalGrowthPackIntake): PackReportSection[] {
  const city = intake.city;
  const biz = intake.business_name;
  return [
    {
      id: "executive",
      title: "Resumen ejecutivo",
      summary: `${biz} tiene un sistema local demo listo: landing live, SEO geo en ${city}, chatbot de citas y welcome email.`,
      bullets: [
        `Propuesta de valor: ${intake.value_proposition}`,
        `CTA principal: ${intake.primary_cta}`,
        `Sector: ${intake.sector} · Zona: ${city}`,
        "5 entregables publicados en portal con QA autónomo ≥ 85%",
      ],
      recommendations: [
        rec("Compartir URL live con 3 clientes beta esta semana", "Validación social antes de ads", "high"),
        rec("Conectar dominio propio y GA4 en 48 h", "Medir landing → lead real", "high"),
        rec("Solicitar 5 reseñas Google post-lanzamiento", "Mejora ranking local pack", "medium"),
      ],
      metrics: [
        { label: "Keywords geo priorizadas", value: "12" },
        { label: "Emails welcome", value: "3-touch" },
        { label: "Objetivo citas/mes (demo)", value: "25–40" },
      ],
    },
    {
      id: "seo_local",
      title: "SEO local y visibilidad en mapa",
      summary: `Oportunidad de captar búsquedas «${intake.sector} ${city}» y variantes de intención transaccional.`,
      bullets: [
        `"${intake.sector} ${city}" — volumen estimado demo: 880/mes`,
        `"${intake.primary_cta} ${city}" — intención alta, competencia media`,
        `"mejor ${intake.sector} cerca de mí" — mobile, 62% del tráfico local`,
        "Ficha Google: completar fotos, horario, mensajes y categoría principal",
        "Schema LocalBusiness pendiente en home — prioridad alta",
      ],
      recommendations: [
        rec("Publicar 2 posts Google Business / mes con CTA a reserva", "+18% impresiones mapa (benchmark demo)", "high"),
        rec("Añadir FAQ schema con horario y zona de servicio", "Rich results en SERP local", "medium"),
        rec("Crear landing /servicios por barrio o distrito", "Long-tail geo de baja competencia", "medium"),
      ],
      metrics: [
        { label: "Score SEO demo", value: "78/100" },
        { label: "Issues on-page críticos", value: "3" },
        { label: "Competidores locales mapeados", value: "5" },
      ],
    },
    {
      id: "landing_conversion",
      title: "Landing y conversión",
      summary: "Landing móvil-first con CTA sticky, formulario corto y prueba social sectorial.",
      bullets: [
        "Above the fold: propuesta + CTA en < 3 s de scroll",
        "Formulario: nombre + teléfono (2 campos) — reduce fricción 34% vs. largo",
        "Mapa embebido y horario visible sin clic",
        "Velocidad LCP estimada demo: 1,9 s (bueno)",
      ],
      recommendations: [
        rec("Test A/B CTA texto: «Reservar» vs. «Pedir cita gratis»", "Optimizar CTR formulario", "high"),
        rec("Añadir widget reseñas Google (mín. 4,5★)", "Confianza + conversión", "medium"),
        rec("Activar WhatsApp click-to-chat en móvil", "Canal preferido en negocio local", "low"),
      ],
      metrics: [
        { label: "Conv. landing demo", value: "4,2%" },
        { label: "Bounce móvil demo", value: "38%" },
        { label: "Tiempo en página", value: "1:42" },
      ],
    },
    {
      id: "chatbot",
      title: "Chatbot de citas",
      summary: "Asistente 24/7 con intents de horario, servicios, ubicación y handoff humano.",
      bullets: [
        "5 FAQs precargadas del sector " + intake.sector,
        "Flujo book_appointment → formulario → confirmación email",
        "Handoff a humano en horario comercial",
        "Integración futura con módulo Reservas Nelvyon",
      ],
      recommendations: [
        rec("Añadir 3 preguntas frecuentes del sector cada mes", "Reduce tickets repetitivos", "medium"),
        rec("Conectar chatbot a calendario real", "Citas medibles en dashboard CEO", "high"),
      ],
    },
    {
      id: "email_welcome",
      title: "Secuencia email de bienvenida",
      summary: "3-touch en 72 h: bienvenida → facilitar CTA → recordatorio entregables.",
      bullets: [
        "Touch 1 (0 h): bienvenida + expectativas",
        "Touch 2 (24 h): facilitar " + intake.primary_cta.toLowerCase(),
        "Touch 3 (72 h): recordatorio portal y entregables",
        "Subjects listos para test A/B en panel campañas",
      ],
      recommendations: [
        rec("Enviar test a 2 direcciones internas antes de activar", "Validar deliverability", "high"),
        rec("Medir apertura touch 2 — suele ser la de mayor CTR", "Optimizar subject lines", "medium"),
      ],
      metrics: [
        { label: "Apertura demo", value: "42%" },
        { label: "CTR demo", value: "8,1%" },
      ],
    },
  ];
}

export function buildEcommerceDemoSections(intake: EcommerceGrowthPackIntake): PackReportSection[] {
  const channel = intake.primary_channel ?? "meta";
  return [
    {
      id: "executive",
      title: "Resumen ejecutivo ecommerce",
      summary: `${intake.business_name} — tienda demo con catálogo ${intake.product_category}, kit Meta Ads y recuperación de carrito.`,
      bullets: [
        `Ticket medio orientativo: ${intake.avg_order_value ?? "45–65 €"}`,
        `Canal principal: ${channel === "meta" ? "Meta Ads" : channel === "google" ? "Google Shopping" : "Orgánico"}`,
        "6 entregables: landing, SEO catálogo, chatbot, kit ads, carrito abandonado, informe",
        "ROAS objetivo demo: 2,8–3,5x a 14 días",
      ],
      recommendations: [
        rec("Importar catálogo producto en Business Manager", "Activar Advantage+ Shopping", "high"),
        rec("Conectar pixel + CAPI antes de escalar presupuesto", "Atribución fiable", "high"),
        rec("Lanzar carrito abandonado tras 100 sesiones", "Evitar ruido en lista pequeña", "medium"),
      ],
      metrics: [
        { label: "SKUs en catálogo demo", value: "24" },
        { label: "Campañas Meta preparadas", value: "2" },
        { label: "Emails carrito abandonado", value: "3-touch" },
      ],
    },
    {
      id: "catalog_seo",
      title: "SEO de catálogo",
      summary: "Fichas producto y categorías optimizadas para búsqueda transaccional.",
      bullets: [
        "Títulos producto: marca + atributo + categoría",
        "Meta descriptions con USP y envío",
        "Breadcrumbs y schema Product en PDP demo",
        `Cluster principal: ${intake.product_category}`,
      ],
      recommendations: [
        rec("Publicar 4 fichas nuevas / semana con keywords long-tail", "Tráfico orgánico compuesto", "high"),
        rec("Enlazar categorías desde blog (si aplica)", "Link equity interno", "medium"),
      ],
      metrics: [
        { label: "Páginas indexables demo", value: "31" },
        { label: "Issues SEO catálogo", value: "7" },
      ],
    },
    {
      id: "meta_ads",
      title: "Kit Meta Ads Advantage+",
      summary: "Estructura de campaña, copies y brief creativo alineados con la landing tienda.",
      bullets: [
        "Campaña Advantage+ Catálogo — presupuesto demo 40 €/día",
        "Campaña Retargeting 7d — visitantes sin compra",
        "5 variantes de copy feed + 3 hooks stories",
        "Brief creativo: UGC + producto sobre fondo limpio",
      ],
      recommendations: [
        rec("Lanzar con 3 creatividades UGC mínimo", "Evitar fatiga creativa < 7 días", "high"),
        rec("Pausar anuncios con CTR < 0,8% tras 1.000 impresiones", "Optimizar gasto", "medium"),
        rec("Testear oferta envío gratis vs. % descuento", "Mejorar CVR en frío", "medium"),
      ],
      metrics: [
        { label: "CPM demo estimado", value: "11,2 €" },
        { label: "ROAS demo", value: "2,9x" },
      ],
    },
    {
      id: "abandoned_cart",
      title: "Carrito abandonado",
      summary: "Secuencia 3-touch: recordatorio → incentivo → última oportunidad.",
      bullets: [
        "Trigger: abandono > 1 h sin compra",
        "Touch 1: recordatorio simple + link directo checkout",
        "Touch 2 (+24 h): 10% descuento limitado 48 h",
        "Touch 3 (+48 h): urgencia stock / envío",
      ],
      recommendations: [
        rec("Excluir compradores últimos 7 días", "Evitar emails irrelevantes", "high"),
        rec("Personalizar con producto abandonado (dynamic block)", "+22% recuperación demo", "high"),
      ],
    },
    {
      id: "sales_chatbot",
      title: "Chatbot de ventas",
      summary: "Resuelve dudas de talla, envío y devoluciones; empuja al carrito.",
      bullets: [
        "Intents: envío, devoluciones, stock, recomendación",
        "CTA «Añadir al carrito» en respuestas de producto",
        "Escalado a humano en horario laboral",
      ],
      recommendations: [
        rec("Añadir FAQ de devoluciones del sector", "Reduce abandono pre-compra", "medium"),
      ],
    },
  ];
}

export function buildSaasB2bDemoSections(intake: SaasB2bGrowthPackIntake): PackReportSection[] {
  const motion = intake.sales_motion ?? "plg";
  return [
    {
      id: "executive",
      title: "Resumen ejecutivo B2B",
      summary: `${intake.business_name} — funnel PLG demo para ${intake.icp_title} con nurture y outbound.`,
      bullets: [
        `Motion comercial: ${motion === "plg" ? "Product-led" : motion === "sales_led" ? "Sales-led" : "Híbrido"}`,
        `Modelo pricing: ${intake.pricing_model ?? "subscription"}`,
        "6 entregables: landing PLG, SEO B2B, bot demo, nurture, playbook, informe",
        "Objetivo demo: 15–25 MQLs/mes a 90 días",
      ],
      recommendations: [
        rec("Publicar landing y compartir en 2 comunidades ICP", "Tracción inicial medible", "high"),
        rec("Activar nurture solo con ≥ 50 contactos", "Proteger reputación dominio", "medium"),
        rec("Ejecutar 20 toques outbound/semana del playbook", "Pipeline predecible", "high"),
      ],
      metrics: [
        { label: "Demos objetivo/mes", value: "8–12" },
        { label: "Emails nurture", value: "5-touch" },
        { label: "Cuentas ABM tier 1", value: "10" },
      ],
    },
    {
      id: "plg_landing",
      title: "Landing product-led",
      summary: "Posicionamiento claro, prueba social B2B y CTA único a demo o trial.",
      bullets: [
        "Hero: problema → solución → CTA demo",
        "Logos cliente + métrica de impacto",
        "Sección «Cómo funciona» en 3 pasos",
        "Formulario demo: work email + cargo + empresa",
      ],
      recommendations: [
        rec("Test CTA «Empezar trial» vs. «Agendar demo»", "Alinear con motion " + motion, "high"),
        rec("Añadir vídeo demo 60 s bajo el fold", "+15% conversión demo (benchmark)", "medium"),
      ],
      metrics: [
        { label: "Conv. visita→demo demo", value: "3,1%" },
        { label: "Tiempo en página", value: "2:18" },
      ],
    },
    {
      id: "seo_demand",
      title: "SEO demand gen",
      summary: `Contenido y keywords para captar ${intake.icp_title} en búsqueda informacional y comercial.`,
      bullets: [
        "Cluster: problema → comparativa → implementación",
        "10 keywords priorizadas con intent B2B",
        "Plan editorial 30 días: 4 artículos + 2 landing comparativas",
        "Internal linking hacia landing demo",
      ],
      recommendations: [
        rec("Publicar 1 pieza pilar 2.000+ palabras / mes", "Autoridad temática", "high"),
        rec("Distribuir en LinkedIn con extracto del ICP", "Tráfico cualificado", "medium"),
      ],
    },
    {
      id: "demo_bot",
      title: "Bot de demo y calificación",
      summary: "Califica por tamaño empresa, urgencia y encaja con ICP antes de agendar.",
      bullets: [
        "Preguntas: empresa, cargo, pain, timeline",
        "Scoring demo: hot / warm / nurture",
        "Integración calendario para demos hot",
        "Handoff AE en leads enterprise",
      ],
      recommendations: [
        rec("Definir umbral MQL en CRM (score ≥ 60)", "Evitar demos no cualificadas", "high"),
      ],
    },
    {
      id: "nurture",
      title: "Secuencia nurture B2B",
      summary: "5-touch: problema → caso de éxito → demo → prueba social → última llamada.",
      bullets: [
        "Touch 1: problema del ICP + recurso",
        "Touch 2: caso de éxito sector similar",
        "Touch 3: invitación demo personalizada",
        "Touch 4: testimonio + ROI",
        "Touch 5: urgencia suave + alternativa trial",
      ],
      recommendations: [
        rec("Segmentar por cargo en touch 3", "Mensaje relevante por rol", "medium"),
        rec("Excluir contactos con demo ya agendada", "Evitar solapamiento", "high"),
      ],
    },
    {
      id: "outbound",
      title: "Playbook outbound / ABM",
      summary: "Secuencias LinkedIn + email frío para 10 cuentas tier 1.",
      bullets: [
        "Plantilla conexión LinkedIn + follow-up",
        "Secuencia email 4-touch con personalización cuenta",
        "Lista 10 cuentas tier 1 con trigger (funding, hiring, tech stack)",
        "Cadencia: 12 días por cuenta",
      ],
      recommendations: [
        rec("Reservar 30 min/día para personalizar 3 cuentas", "Tasa respuesta 2–3x", "high"),
        rec("Coordinar con nurture para no duplicar mensajes", "Experiencia coherente", "medium"),
      ],
    },
  ];
}

export function buildDemoReportSections(packId: PackId, intake: Intake): PackReportSection[] {
  if (packId === LOCAL_GROWTH_PACK_ID) {
    return buildLocalDemoSections(intake as LocalGrowthPackIntake);
  }
  if (packId === ECOMMERCE_GROWTH_PACK_ID) {
    return buildEcommerceDemoSections(intake as EcommerceGrowthPackIntake);
  }
  if (packId === SAAS_B2B_GROWTH_PACK_ID) {
    return buildSaasB2bDemoSections(intake as SaasB2bGrowthPackIntake);
  }
  return [];
}

/** Highlight section ids when launched from a specialized catalog entry. */
export function focusHighlightSectionIds(focus: PackFocusKey): string[] {
  const map: Record<PackFocusKey, string[]> = {
    seo: ["seo_local"],
    meta: ["meta_ads"],
    email: ["email_welcome"],
    landing: ["plg_landing", "executive"],
  };
  return map[focus];
}

export function enrichPackReportWithDemoContent(
  report: PackReport,
  intake: Intake,
  catalogFocus?: PackFocusKey | null,
): PackReport {
  const sections = buildDemoReportSections(report.pack_id as PackId, intake);
  const parent_complement = catalogFocus ? buildParentComplement(catalogFocus) : undefined;
  const highlight_section_ids = catalogFocus ? focusHighlightSectionIds(catalogFocus) : undefined;

  return {
    ...report,
    sections,
    launch_focus: catalogFocus ?? undefined,
    parent_complement,
    highlight_section_ids,
  };
}
