/**
 * DÓNDE VIVE CADA SERVICIO: su disciplina de QA y su departamento.
 *
 * POR QUÉ ESTÁ EN UN FICHERO APARTE. Estos dos mapas los necesitan la matriz y
 * el contrato de servicio. Cuando existían dos copias —una por script— pasó lo
 * que siempre pasa: se añadió un servicio a una y no a la otra, y los dos
 * documentos decían cosas distintas del mismo servicio sin que nadie lo notara,
 * porque cada uno era coherente consigo mismo.
 *
 * POR QUÉ NO SE DEDUCEN DEL NOMBRE. `bots_premium` se revisa con la rúbrica de
 * contenido y `funnel_premium` con la de CRO: acertar por el nombre funcionaría
 * en la mitad de los casos, que es la peor cifra posible para una deducción
 * automática, porque parece que funciona.
 */

/** Qué disciplina de QA le toca a cada servicio. */
export const QA_DE = {
  seo_premium: "seo",
  ads_premium: "ads",
  social_media_premium: "social",
  email_marketing_premium: "email",
  contenido_copywriting_premium: "contenido",
  web_premium: "web",
  landing_premium: "web",
  mantenimiento_web_premium: "web",
  ecommerce_premium: "ecommerce",
  funnel_premium: "cro",
  branding_premium: "creatividad",
  diseno_grafico_creatividades_premium: "creatividad",
  fotografia_producto_premium: "creatividad",
  video_multimedia_premium: "creatividad",
  "3d_contenido_inmersivo_premium": "creatividad",
  reputacion_online_orm_premium: "reputacion",
  advisor_empresarial_premium: "estrategia",
  consultoria_automatizacion_premium: "estrategia",
  influencer_marketing_premium: "social",
  bots_premium: "contenido",
  canales_comunicaciones_premium: "contenido",
  voz_premium: "contenido",
  personal_digital_premium: "contenido",
  integraciones_apis_premium: "estrategia",
  formacion_capacitacion_digital_premium: "contenido",
  crm_captacion_premium: "crm",
  analitica_atribucion_premium: "analitica",
  inteligencia_mercado_premium: "investigacion",
  geo_ai_search_premium: "geo",
};

/**
 * Quién responde de cada servicio.
 *
 * POR QUÉ ES UN MAPA Y NO UNA DEDUCCIÓN. La primera versión de esto derivaba el
 * departamento de la disciplina de optimización, y salió mal de una forma que
 * daba el pego: seis servicios acababan en «Marca» porque se optimizan por
 * rendimiento de la pieza, y la consultoría de automatización acababa en «Web»
 * porque se juzga por conversiones. Ninguna de las dos cosas es falsa sobre
 * cómo se miden, y las dos son falsas sobre quién hace el trabajo.
 *
 * Cómo se optimiza un servicio y quién responde de él son dos preguntas
 * distintas. Una deducción que acierta en la mitad de los casos es peor que
 * ninguna, porque el documento sale entero y parece correcto.
 *
 * `contrato-de-servicio.mjs` comprueba que este mapa cubre los 29 y que cada
 * departamento nombrado existe de verdad en `departamentos.ts`.
 */
export const DEPARTAMENTO_DE_SERVICIO = {
  web_premium: "web",
  ecommerce_premium: "ecommerce",
  seo_premium: "seo",
  ads_premium: "paid_media",
  branding_premium: "marca",
  voz_premium: "contenido",
  bots_premium: "contenido",
  personal_digital_premium: "contenido",
  advisor_empresarial_premium: "estrategia",
  canales_comunicaciones_premium: "contenido",
  social_media_premium: "social",
  email_marketing_premium: "email_lifecycle",
  contenido_copywriting_premium: "copy",
  video_multimedia_premium: "creatividad",
  "3d_contenido_inmersivo_premium": "creatividad",
  fotografia_producto_premium: "creatividad",
  diseno_grafico_creatividades_premium: "creatividad",
  consultoria_automatizacion_premium: "estrategia",
  integraciones_apis_premium: "operaciones",
  mantenimiento_web_premium: "web",
  reputacion_online_orm_premium: "reputacion",
  formacion_capacitacion_digital_premium: "contenido",
  influencer_marketing_premium: "social",
  landing_premium: "cro",
  funnel_premium: "funnels",
  crm_captacion_premium: "captacion",
  analitica_atribucion_premium: "analitica",
  inteligencia_mercado_premium: "inteligencia_mercado",
  geo_ai_search_premium: "geo_ai_search",
};

/**
 * Qué categoría de conector le sirve a cada disciplina.
 *
 * Vacío NO significa «no necesita conexiones»: significa que el trabajo de esa
 * disciplina se entrega sin leer de una plataforma ajena. Un servicio de diseño
 * no necesita conectarse a nada para hacer su trabajo.
 */
export const CONECTORES_DE_DISCIPLINA = {
  paid_media: ["ads"],
  seo: ["seo", "analytics"],
  social: ["social", "ads"],
  email: ["email"],
  cro: ["analytics"],
  contenido: [],
  web: ["analytics"],
  reputacion: [],
  marca: [],
  crm_captacion: ["crm", "email"],
  analitica: ["analytics", "ads", "seo"],
  inteligencia_mercado: [],
  geo_ai_search: ["seo"],
};
