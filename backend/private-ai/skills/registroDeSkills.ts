/**
 * BLOQUE 3 · qué Skill puede usar cada agente.
 *
 * Descargar una Skill no la integra. Sin esto, «NELVYON tiene 16 Skills» seria
 * una frase de folleto: nadie sabria cual usa quien, y en la practica los
 * agentes seguirian trabajando con lo que llevan en su prompt.
 *
 * El reparto es de **minimo privilegio**, igual que las herramientas. Un agente
 * de SEO no necesita el estandar de facturacion; un redactor no necesita el de
 * despliegue. No es burocracia: cada Skill que un agente puede invocar es
 * superficie por la que se le puede desviar, y ademas contexto que compite con
 * su trabajo.
 *
 * Las Skills de QA son distintas a proposito: las usa **quien no hizo el
 * trabajo**. Un agente que revisa su propio entregable no revisa, relee. Por eso
 * `nelvyon-marketing-qa` y `nelvyon-web-qa` estan asignadas al supervisor y al
 * agente de QA, y NO a los que producen.
 */

/** Las Skills propias de NELVYON, tal como viven en `.claude/skills/`. */
export const SKILLS_DE_NELVYON = [
  "nelvyon-web-elite",
  "nelvyon-cro",
  "nelvyon-seo-elite",
  "nelvyon-social-elite",
  "nelvyon-brand-strategy",
  "nelvyon-paid-media",
  "nelvyon-email-marketing",
  "nelvyon-sales",
  "nelvyon-reputation",
  "nelvyon-ecommerce",
  "nelvyon-local-business",
  "nelvyon-analytics",
  "nelvyon-marketing-qa",
  "nelvyon-web-qa",
  "nelvyon-accessibility",
  "nelvyon-performance",
] as const;

export type SkillDeNelvyon = (typeof SKILLS_DE_NELVYON)[number];

/**
 * Skills que produce cada agente interno.
 *
 * Un agente que no aparece aqui no tiene ninguna: el reparto es una lista de
 * concesiones, no de excepciones. Empezar por «todas menos» es como se acaba
 * con un agente de contenido capaz de tocar facturacion.
 */
export const SKILLS_POR_AGENTE: Readonly<Record<string, readonly SkillDeNelvyon[]>> = {
  // -- direccion y supervision ----------------------------------------------
  // El supervisor lleva las de QA porque revisa lo que hicieron otros.
  ceo_supervisor: ["nelvyon-brand-strategy", "nelvyon-analytics", "nelvyon-marketing-qa"],
  qa: ["nelvyon-marketing-qa", "nelvyon-web-qa", "nelvyon-accessibility", "nelvyon-performance"],

  // -- marketing -------------------------------------------------------------
  marketing: ["nelvyon-brand-strategy", "nelvyon-cro", "nelvyon-analytics"],
  content: ["nelvyon-brand-strategy", "nelvyon-seo-elite"],
  seo: ["nelvyon-seo-elite", "nelvyon-analytics", "nelvyon-performance"],
  social_media: ["nelvyon-social-elite", "nelvyon-brand-strategy"],
  email_marketing: ["nelvyon-email-marketing", "nelvyon-brand-strategy"],

  // -- publicidad de pago ----------------------------------------------------
  // Las tres comparten estandar: la estructura de campana y el techo de gasto
  // no cambian por plataforma, cambian los formatos.
  google_ads: ["nelvyon-paid-media", "nelvyon-analytics"],
  meta_ads: ["nelvyon-paid-media", "nelvyon-analytics"],
  tiktok_ads: ["nelvyon-paid-media", "nelvyon-analytics"],

  // -- comercial -------------------------------------------------------------
  sales: ["nelvyon-sales", "nelvyon-brand-strategy"],
  crm: ["nelvyon-sales", "nelvyon-analytics"],
  support: ["nelvyon-reputation", "nelvyon-brand-strategy"],
  portal_client: ["nelvyon-brand-strategy"],

  // -- producto y tecnico ----------------------------------------------------
  product: ["nelvyon-web-elite", "nelvyon-cro"],
  development: ["nelvyon-web-elite", "nelvyon-accessibility", "nelvyon-performance"],
  reporting: ["nelvyon-analytics"],

  // -- operaciones y negocio -------------------------------------------------
  operations: ["nelvyon-local-business", "nelvyon-ecommerce"],

  // Sin Skills de marketing a proposito: su trabajo no las necesita y darselas
  // solo anadiria superficie.
  finance: [],
  cto: [],
  devops: [],
  security_compliance: [],
};

export function skillsDe(agentId: string): readonly SkillDeNelvyon[] {
  return SKILLS_POR_AGENTE[agentId] ?? [];
}

export function agentePuedeUsar(agentId: string, skill: string): boolean {
  return (skillsDe(agentId) as readonly string[]).includes(skill);
}

/** Las Skills que solo debe usar quien NO hizo el trabajo. */
export const SKILLS_DE_REVISION: readonly SkillDeNelvyon[] = [
  "nelvyon-marketing-qa",
  "nelvyon-web-qa",
] as const;

/** Agentes que producen entregables de cliente y por tanto no se autorrevisan. */
export const AGENTES_QUE_PRODUCEN: readonly string[] = [
  "content",
  "seo",
  "social_media",
  "email_marketing",
  "sales",
  "marketing",
  "google_ads",
  "meta_ads",
  "tiktok_ads",
] as const;
