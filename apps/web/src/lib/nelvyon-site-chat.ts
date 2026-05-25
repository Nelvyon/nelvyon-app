/** F63 — Sector-aware sales chatbot for nelvyon.com (30+ sectors). */

export type ChatStage = "detect_sector" | "cases" | "qualify" | "offer" | "cta";

export type SectorProfile = {
  id: string;
  label: string;
  cases: string[];
  qualify: string;
  planHint: string;
};

export const SECTOR_PROFILES: SectorProfile[] = [
  { id: "restaurante", label: "Restaurante", cases: ["+340% reservas en 60 días con SEO local + Google Ads + reseñas automáticas.", "Restaurantes de carta han llenado fines de semana sin depender de TheFork al 100%."], qualify: "¿Cuántas reservas nuevas a la semana necesitas?", planHint: "Growth para reservas + reputación" },
  { id: "clinica", label: "Clínica / salud", cases: ["Clínicas similares: 80+ pacientes nuevos/mes con captación IA.", "Reducción del 40% en coste por cita con campañas segmentadas."], qualify: "¿Cuántos pacientes nuevos al mes necesitas?", planHint: "Elite para captación médica compliance-friendly" },
  { id: "ecommerce", label: "Ecommerce", cases: ["Tiendas online x4 ventas en 90 días con ads + email automation.", "ROAS medio 3.2 en Meta + Google con creatividades IA."], qualify: "¿Cuántos pedidos nuevos al mes buscas?", planHint: "Growth para escala de ventas" },
  { id: "abogado", label: "Despacho legal", cases: ["Bufetes: 25-40 consultas cualificadas/mes desde SEO + ads locales.", "Coste por lead legal bajado un 35% con landing + nurturing."], qualify: "¿Cuántas consultas cualificadas al mes necesitas?", planHint: "Starter o Growth según volumen" },
  { id: "inmobiliaria", label: "Inmobiliaria", cases: ["Agencias: pipeline de 50+ leads/mes en zonas objetivo.", "Visitas concertadas +40% con WhatsApp + email secuencias."], qualify: "¿Cuántos leads de compradores/inquilinos al mes?", planHint: "Growth para generación de leads" },
  { id: "academia", label: "Academia / formación", cases: ["Academias: matrículas +180% en campaña de captación 90 días.", "Coste por alumno -28% con retargeting + email."], qualify: "¿Cuántas matrículas nuevas al mes?", planHint: "Growth" },
  { id: "gym", label: "Gimnasio / fitness", cases: ["Gyms: 120 altas/mes con ofertas locales + influencers micro.", "Bajas cancelaciones con email onboarding automatizado."], qualify: "¿Cuántas altas nuevas al mes?", planHint: "Starter → Growth" },
  { id: "peluqueria", label: "Peluquería / belleza", cases: ["Salones: agenda llena 3 semanas vista con Instagram + Google local.", "Ticket medio +22% con upsell automatizado post-visita."], qualify: "¿Cuántas citas nuevas a la semana?", planHint: "Starter" },
  { id: "agencia", label: "Agencia marketing", cases: ["Agencias white-label NELVYON para 10+ clientes sin ampliar plantilla.", "Márgenes +35% automatizando reporting y campañas."], qualify: "¿Cuántos clientes gestionas en paralelo?", planHint: "Elite multi-workspace" },
  { id: "consultoria", label: "Consultoría B2B", cases: ["Consultoras: 15 reuniones cualificadas/mes vía LinkedIn + email IA.", "Pipeline enterprise con ABM automatizado."], qualify: "¿Cuántas reuniones con decisores al mes?", planHint: "Growth o Elite" },
  { id: "hotel", label: "Hotel / hospedaje", cases: ["Hoteles boutique: ocupación +25% fuera de temporada con ads geo.", "Direct booking +30% reduciendo OTA."], qualify: "¿Qué ocupación mensual objetivo buscas?", planHint: "Growth" },
  { id: "dentista", label: "Clínica dental", cases: ["Dentistas: 60 primeras visitas/mes en implantes/ortodoncia.", "Recordatorios automáticos reducen no-shows 18%."], qualify: "¿Cuántas primeras visitas al mes?", planHint: "Growth" },
  { id: "veterinario", label: "Veterinaria", cases: ["Clínicas vet: +90 citas/mes con Google local + retargeting.", "Fidelización con recordatorios vacunas por email."], qualify: "¿Cuántas citas nuevas a la semana?", planHint: "Starter" },
  { id: "automocion", label: "Automoción / taller", cases: ["Talleres: 45 leads/mes para revisiones y neumáticos.", "Campañas estacionales ROI 4.1x."], qualify: "¿Cuántos servicios nuevos al mes?", planHint: "Starter" },
  { id: "construccion", label: "Construcción / reformas", cases: ["Reformistas: 20 presupuestos cualificados/mes.", "Seguimiento automático cierra +15% presupuestos."], qualify: "¿Cuántos presupuestos cualificados al mes?", planHint: "Growth" },
  { id: "saas", label: "SaaS / software", cases: ["SaaS B2B: demos +120% con outbound IA + ads.", "CAC -32% en 2 trimestres."], qualify: "¿Cuántas demos o trials al mes?", planHint: "Elite" },
  { id: "retail", label: "Retail / tienda física", cases: ["Retail: tráfico tienda +55% con local ads + SMS.", "Fidelización club clientes automatizada."], qualify: "¿Cuántos clientes nuevos en tienda al mes?", planHint: "Growth" },
  { id: "franquicia", label: "Franquicia", cases: ["Franquicias: playbook marketing replicado en 8 locales.", "Leads por territorio con reporting unificado."], qualify: "¿Cuántos locales activarás este año?", planHint: "Elite" },
  { id: "eventos", label: "Eventos / bodas", cases: ["Wedding planners: agenda 9 meses con Meta + Pinterest ads.", "Leads premium CPL -25%."], qualify: "¿Cuántos eventos cerrar al mes?", planHint: "Growth" },
  { id: "coaching", label: "Coaching / mentoría", cases: ["Coaches: lista espera programas high-ticket.", "Webinars automatizados → 35% conversión a llamada."], qualify: "¿Cuántos clientes high-ticket al mes?", planHint: "Growth" },
  { id: "fotografia", label: "Fotografía / vídeo", cases: ["Estudios: sesiones reservadas 6 semanas por ad local.", "Upsell álbumes +40% con email post-shoot."], qualify: "¿Cuántas sesiones nuevas al mes?", planHint: "Starter" },
  { id: "floristeria", label: "Floristería", cases: ["Floristerías: picos San Valentín/Madre x3 ventas online.", "Suscripciones corporativas recurrentes."], qualify: "¿Cuántos pedidos online a la semana en temporada alta?", planHint: "Starter" },
  { id: "farmacia", label: "Farmacia", cases: ["Farmacias: tráfico local + parafarmacia online.", "Campañas estacionales gripes/alergias."], qualify: "¿Cuántos clientes nuevos recurrentes al mes?", planHint: "Starter" },
  { id: "psicologia", label: "Psicología / terapia", cases: ["Consultas online: lista pacientes estable en 8 semanas.", "Anuncios éticos segmentados por especialidad."], qualify: "¿Cuántas primeras sesiones al mes?", planHint: "Starter" },
  { id: "nutricion", label: "Nutrición / dietética", cases: ["Nutricionistas: packs 3 meses vendidos con embudo email.", "Retargeting recupera 22% abandonos."], qualify: "¿Cuántos pacientes en programa trimestral?", planHint: "Starter" },
  { id: "inmobiliaria_lujo", label: "Inmobiliaria lujo", cases: ["Luxury: leads UHNW cualificados vía contenido + ads discretos.", "Visitas privadas +50% año 1."], qualify: "¿Cuántas operaciones al año objetivo?", planHint: "Elite" },
  { id: "turismo", label: "Turismo / experiencias", cases: ["Operadores: reservas experiencias +200% temporada.", "Email pre/post viaje aumenta reseñas 5★."], qualify: "¿Cuántas reservas al mes en temporada?", planHint: "Growth" },
  { id: "logistica", label: "Logística B2B", cases: ["Logística: leads empresa transporte 30/mes.", "LinkedIn ABM para decisores supply chain."], qualify: "¿Cuántos contratos B2B nuevos al trimestre?", planHint: "Elite" },
  { id: "energia", label: "Energía / instaladores", cases: ["Solar: 80 leads instalación/mes zonas solares.", "Cualificación IA reduce visitas improductivas."], qualify: "¿Cuántas instalaciones al mes?", planHint: "Growth" },
  { id: "educacion_infantil", label: "Guardería / infantil", cases: ["Escuelas infantiles: plazas cubiertas curso con ads locales.", "Open days automatizados llenan agenda."], qualify: "¿Cuántas matrículas nuevas este curso?", planHint: "Starter" },
  { id: "moda", label: "Moda / marca D2C", cases: ["D2C moda: ROAS 2.8 TikTok + Meta UGC.", "Email flows recuperan carrito 18%."], qualify: "¿Cuántos pedidos al mes objetivo?", planHint: "Growth" },
  { id: "otro", label: "Negocio local / servicios", cases: ["Negocios locales: +150% visibilidad en 90 días con SEO + ads.", "Automatización ahorra 15h/semana al equipo."], qualify: "¿Cuántos clientes nuevos al mes necesitas conseguir?", planHint: "Plan según volumen" },
];

export const PLANS = {
  starter: { name: "Starter", price: "97€/mes", includes: "SEO base, 1 canal ads, email esencial, panel métricas" },
  growth: { name: "Growth", price: "297€/mes", includes: "SEO avanzado, Google+Meta ads, email automation, agentes IA" },
  elite: { name: "Elite", price: "797€/mes", includes: "Todo Growth + TikTok ads, outbound IA, CSM dedicado, multi-campaña" },
} as const;

export function detectSectorHeuristic(text: string): string {
  const t = text.toLowerCase();
  const rules: [RegExp, string][] = [
    [/restaur|bar|cafeter|hosteler/i, "restaurante"],
    [/clinic|médic|salud|hospital/i, "clinica"],
    [/tienda online|ecommerce|e-commerce|shopify/i, "ecommerce"],
    [/abogad|legal|despacho/i, "abogado"],
    [/inmobil|real estate|pisos/i, "inmobiliaria"],
    [/academ|curso|formación|bootcamp/i, "academia"],
    [/gym|gimnasio|fitness|crossfit/i, "gym"],
    [/peluquer|barber|belleza|estética/i, "peluqueria"],
    [/agencia marketing|marketing agency/i, "agencia"],
    [/consultor/i, "consultoria"],
    [/hotel|hostal|alojamiento/i, "hotel"],
    [/dental|dentista|ortodon/i, "dentista"],
    [/veterin/i, "veterinario"],
    [/taller|mecánic|automoci/i, "automocion"],
    [/reforma|construc/i, "construccion"],
    [/saas|software|startup tech/i, "saas"],
    [/franquic/i, "franquicia"],
    [/boda|evento|wedding/i, "eventos"],
    [/coach|mentor/i, "coaching"],
    [/tiktok|moda|ropa|fashion/i, "moda"],
    [/farmacia|parafarmacia/i, "farmacia"],
    [/psicolog|terapia/i, "psicologia"],
    [/nutri|diet/i, "nutricion"],
    [/turismo|viaje|tour/i, "turismo"],
    [/logístic|transporte b2b/i, "logistica"],
    [/solar|energía|instalador/i, "energia"],
    [/guarder|infantil|escuela/i, "educacion_infantil"],
  ];
  for (const [re, id] of rules) {
    if (re.test(t)) return id;
  }
  return "otro";
}

export function getSector(id: string): SectorProfile {
  return SECTOR_PROFILES.find((s) => s.id === id) ?? SECTOR_PROFILES[SECTOR_PROFILES.length - 1];
}

export function pickPlan(monthlyClients: number): keyof typeof PLANS {
  if (monthlyClients >= 80) return "elite";
  if (monthlyClients >= 25) return "growth";
  return "starter";
}

export function parseClientTarget(text: string): number {
  const m = text.match(/(\d+)/);
  if (!m) return 30;
  return Math.min(500, Math.max(1, parseInt(m[1], 10)));
}
