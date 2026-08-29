/** Premium OS service identifiers — v1 registry (no Node-only imports; safe for client bundles). */
export const OS_PREMIUM_SERVICE_IDS = [
  "web_premium",
  "ecommerce_premium",
  "seo_premium",
  "ads_premium",
  "branding_premium",
  "voz_premium",
  "bots_premium",
  "personal_digital_premium",
  "advisor_empresarial_premium",
  "canales_comunicaciones_premium",
  "social_media_premium",
  "email_marketing_premium",
  "contenido_copywriting_premium",
  "video_multimedia_premium",
  "3d_contenido_inmersivo_premium",
  "fotografia_producto_premium",
  "diseno_grafico_creatividades_premium",
  "consultoria_automatizacion_premium",
  "integraciones_apis_premium",
  "mantenimiento_web_premium",
  "reputacion_online_orm_premium",
  "formacion_capacitacion_digital_premium",
  "influencer_marketing_premium",
  "landing_premium",
  "funnel_premium",

  // ── Cuatro capacidades que faltaban ─────────────────────────────────────
  //
  // Se anaden porque NINGUN servicio las cubria y SI existen los departamentos
  // que las harian. No se anaden porque suenen bien: cada una tiene resultado
  // propio, se puede ejecutar con lo que ya hay y se puede medir.
  //
  // Lo que NO se ha anadido, y por que:
  //
  //   Community management .... cabe dentro de social_media_premium. Otro SKU
  //                             para lo mismo infla el catalogo sin dar mas.
  //   Social listening ........ cabe dentro de inteligencia de mercado y de
  //                             reputacion.
  //   Growth .................. es una forma de trabajar, no un servicio.
  //   Partnerships ............ no hay evidencia de encaje. Anadirlo seria
  //                             inventar demanda.
  //   Programatica ............ cabe dentro de ads_premium.
  //
  // Profundidad antes que catalogo inflado.
  "crm_captacion_premium",
  "analitica_atribucion_premium",
  "inteligencia_mercado_premium",
  "geo_ai_search_premium",
] as const;

export type OsPremiumServiceId = (typeof OS_PREMIUM_SERVICE_IDS)[number];
