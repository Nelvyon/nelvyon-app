/**
 * Que departamento responde por cada servicio que se vende.
 *
 * ── LAS DOS CAPAS NO SON LA MISMA LISTA, Y ESTA BIEN ────────────────────────
 *
 * NELVYON tiene dos catalogos de agentes y llevaban tiempo sin hablarse:
 *
 *   · `backend/os-agents/agents/*` — TREINTA agentes con nombre de SERVICIO
 *     (`web_premium`, `seo_premium`, `reputacion_online_orm_premium`). Son los
 *     que producen el entregable que el cliente compra.
 *
 *   · `backend/agents/workforce/hierarchy` — el ORGANIGRAMA: `ceo_supervisor`,
 *     `cto`, `qa`, `devops`, `finance`. Es quien supervisa, con que permisos y
 *     que conocimiento puede leer.
 *
 * Que no coincidan no es un fallo: un catalogo de servicios y un organigrama no
 * tienen por que tener las mismas entradas. Una agencia vende «fotografia de
 * producto» sin tener un director de fotografia.
 *
 * ── LO QUE SI ES UN FALLO ───────────────────────────────────────────────────
 *
 * Que la diferencia no este escrita en ningun sitio. Sin este mapa:
 *
 *   · un servicio puede existir sin que NADIE responda por el —ni supervision,
 *     ni permisos, ni escalado—;
 *   · dos capas pueden divergir durante meses y solo se nota al auditarlas;
 *   · «¿quien aprueba esto?» no tiene respuesta consultable.
 *
 * Aqui la diferencia pasa a ser INTENCIONAL, EXPLICABLE Y VERIFICADA: cada
 * servicio nombra a su dueno, y un guardian comprueba que ninguno se quede
 * huerfano y que ningun dueno sea inventado.
 */

/** Un servicio del catalogo, por su `serviceId`. */
export type ServicioVendido = string;

/** Un agente del organigrama, por su `agentId`. */
export type DepartamentoResponsable = string;

/**
 * Servicio → departamento que responde por el.
 *
 * «Responde» significa tres cosas concretas: supervisa la calidad de lo que sale,
 * presta sus permisos y su ambito de conocimiento, y es a quien se escala cuando
 * hace falta una persona.
 */
export const DUENO_DE_SERVICIO: Readonly<Record<ServicioVendido, DepartamentoResponsable>> = {
  // ── Producto digital: lo construye ingenieria ────────────────────────────
  web_premium: "development",
  landing_premium: "development",
  ecommerce_premium: "development",
  mantenimiento_web_premium: "development",
  funnel_premium: "development",
  integraciones_apis_premium: "development",

  // ── Visibilidad ──────────────────────────────────────────────────────────
  seo_premium: "seo",
  geo_ai_search_premium: "seo",

  // ── Contenido ────────────────────────────────────────────────────────────
  contenido_copywriting_premium: "content",
  formacion_capacitacion_digital_premium: "content",

  // ── Social ───────────────────────────────────────────────────────────────
  social_media_premium: "social_media",
  influencer_marketing_premium: "social_media",

  // ── Creatividad. Su head se creo AQUI, no por adorno: cinco servicios que
  //    se venden no tenian quien respondiera por ellos ─────────────────────
  diseno_grafico_creatividades_premium: "creative",
  video_multimedia_premium: "creative",
  fotografia_producto_premium: "creative",
  "3d_contenido_inmersivo_premium": "creative",
  branding_premium: "creative",

  // ── Reputacion. Mismo caso: un servicio que responde publicamente en nombre
  //    del cliente y no tenia supervisor ───────────────────────────────────
  reputacion_online_orm_premium: "reputation",

  // ── Demanda y relacion con el cliente ────────────────────────────────────
  crm_captacion_premium: "crm",
  email_marketing_premium: "email_marketing",
  ads_premium: "marketing",
  inteligencia_mercado_premium: "marketing",
  advisor_empresarial_premium: "marketing",

  // ── Atencion y automatizacion operativa ──────────────────────────────────
  bots_premium: "support",
  voz_premium: "support",
  canales_comunicaciones_premium: "support",
  personal_digital_premium: "operations",
  consultoria_automatizacion_premium: "operations",

  // ── Medicion ─────────────────────────────────────────────────────────────
  analitica_atribucion_premium: "reporting",
};

/** Quien responde por un servicio, o `null` si nadie lo declara. */
export function duenoDe(serviceId: string): DepartamentoResponsable | null {
  return DUENO_DE_SERVICIO[serviceId] ?? null;
}

/** Los servicios de los que responde un departamento. */
export function serviciosDe(departamento: string): ServicioVendido[] {
  return Object.entries(DUENO_DE_SERVICIO)
    .filter(([, d]) => d === departamento)
    .map(([s]) => s)
    .sort();
}
