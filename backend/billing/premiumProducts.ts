import type { OsPremiumServiceId } from "../os-agents/constants";

import type { PremiumProduct } from "./types";

/** Display catalog for OS premium services (billing via Paddle subscription). */
export const PREMIUM_PRODUCTS: Record<OsPremiumServiceId, PremiumProduct> = {
  web_premium: { name: "Web Premium", amount: 150_000 },
  ecommerce_premium: { name: "Ecommerce Premium", amount: 200_000 },
  seo_premium: { name: "SEO Premium", amount: 80_000 },
  ads_premium: { name: "Ads Premium", amount: 100_000 },
  branding_premium: { name: "Branding Premium", amount: 90_000 },
  voz_premium: { name: "Voz Premium", amount: 120_000 },
  bots_premium: { name: "Bots Premium", amount: 110_000 },
  personal_digital_premium: { name: "Personal Digital Premium", amount: 70_000 },
  advisor_empresarial_premium: { name: "Advisor Empresarial Premium", amount: 130_000 },
  canales_comunicaciones_premium: { name: "Canales y Comunicaciones Premium", amount: 95_000 },
  social_media_premium: { name: "Social Media Premium", amount: 85_000 },
  email_marketing_premium: { name: "Email Marketing Premium", amount: 60_000 },
  contenido_copywriting_premium: { name: "Contenido y Copywriting Premium", amount: 75_000 },
  video_multimedia_premium: { name: "Video y Multimedia Premium", amount: 140_000 },
  "3d_contenido_inmersivo_premium": { name: "3D e Inmersivo Premium", amount: 160_000 },
  fotografia_producto_premium: { name: "Fotografía de Producto Premium", amount: 90_000 },
  diseno_grafico_creatividades_premium: { name: "Diseño Gráfico Premium", amount: 65_000 },
  consultoria_automatizacion_premium: { name: "Consultoría y Automatización Premium", amount: 110_000 },
  integraciones_apis_premium: { name: "Integraciones y APIs Premium", amount: 125_000 },
  mantenimiento_web_premium: { name: "Mantenimiento Web Premium", amount: 45_000 },
  reputacion_online_orm_premium: { name: "Reputación y ORM Premium", amount: 100_000 },
  formacion_capacitacion_digital_premium: { name: "Formación Digital Premium", amount: 55_000 },
  influencer_marketing_premium: { name: "Influencer Marketing Premium", amount: 150_000 },
  landing_premium: { name: "Landing Page Premium", amount: 95_000 },
  funnel_premium: { name: "Funnel Multi-paso Premium", amount: 105_000 },

  // ── Los cuatro nuevos, SIN PRECIO DEFINITIVO ────────────────────────────
  //
  // `precioPendiente: true` y NO un numero inventado. Poner una cifra
  // plausible aqui la convertiria en la cifra real el dia que alguien la
  // copie a una propuesta, y nadie recordaria que se puso a ojo.
  //
  // El importe es el de un servicio comparable, SOLO para que la interfaz
  // pueda pintar algo. Que sea provisional lo dice el propio campo, y la
  // prueba `elPrecioProvisionalNoSeCobra` impide que se facture.
  crm_captacion_premium: {
    name: "CRM y Captación Premium",
    amount: 100_000,
    precioPendiente: true,
  },
  analitica_atribucion_premium: {
    name: "Analítica y Atribución Premium",
    amount: 90_000,
    precioPendiente: true,
  },
  inteligencia_mercado_premium: {
    name: "Inteligencia de Mercado Premium",
    amount: 85_000,
    precioPendiente: true,
  },
  geo_ai_search_premium: {
    name: "Visibilidad en Buscadores de IA Premium",
    amount: 95_000,
    precioPendiente: true,
  },
};

export function getPremiumProduct(serviceId: string): PremiumProduct | undefined {
  return PREMIUM_PRODUCTS[serviceId as OsPremiumServiceId];
}

/**
 * El precio con el que SE PUEDE COBRAR.
 *
 * `null` cuando el precio es provisional. No es una comodidad: es lo que impide
 * que una cifra puesta a ojo acabe en una factura. Quien quiera cobrar tiene
 * que pasar por aqui y encontrarse con el `null`, en vez de leer `amount` y no
 * enterarse de que era provisional.
 *
 * Fijar el precio real es una DECISION DE NEGOCIO: depende de lo que cuesta
 * prestar el servicio y de lo que el mercado paga, y ninguna de las dos cosas
 * esta en el codigo.
 */
export function precioFacturable(serviceId: string): number | null {
  const p = getPremiumProduct(serviceId);
  if (!p) return null;
  return p.precioPendiente ? null : p.amount;
}

/** Los servicios cuyo precio sigue pendiente de decidir. */
export function serviciosSinPrecioDefinitivo(): string[] {
  return Object.entries(PREMIUM_PRODUCTS)
    .filter(([, p]) => p.precioPendiente)
    .map(([id]) => id)
    .sort();
}
