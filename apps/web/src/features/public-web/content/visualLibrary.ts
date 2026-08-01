/**
 * premium stock → NELVYON public visual library (publishable paths).
 * Product UI screens ALWAYS come from saas-shots, never third-party dashboards.
 */

export type LibraryPhotoId = "F-01" | "F-02";

const PHOTO_BASE = "/brand/public/library/photos";

export const libraryPhotos: Record<
  LibraryPhotoId,
  { id: LibraryPhotoId; webp: string; avif: string; jpg: string; alt: string; pages: readonly string[] }
> = {
  "F-01": {
    id: "F-01",
    webp: `${PHOTO_BASE}/F-01.webp`,
    avif: `${PHOTO_BASE}/F-01.avif`,
    jpg: `${PHOTO_BASE}/F-01.jpg`,
    alt: "Equipo de negocio colaborando en oficina moderna",
    pages: ["/agencia", "/", "/contacto"],
  },
  "F-02": {
    id: "F-02",
    webp: `${PHOTO_BASE}/F-02.webp`,
    avif: `${PHOTO_BASE}/F-02.avif`,
    jpg: `${PHOTO_BASE}/F-02.jpg`,
    alt: "Centro de negocio contemporáneo con puestos de trabajo",
    pages: ["/enterprise", "/producto", "/sectores"],
  },
};

export function libraryPhoto(id: LibraryPhotoId): string {
  return libraryPhotos[id].webp;
}

const I = {
  saas: (slug: string) => `/brand/public/library/icons/I-01/${slug}.svg`,
  mkt: (slug: string) => `/brand/public/library/icons/I-02/${slug}.svg`,
  crm: (slug: string) => `/brand/public/library/icons/I-03/${slug}.svg`,
  auto: (slug: string) => `/brand/public/library/icons/I-04/${slug}.svg`,
  db: (slug: string) => `/brand/public/library/icons/I-05/${slug}.svg`,
} as const;

/** Curated premium stock icons for SaaS module cards (Home + /producto). */
export const moduleIcons: Record<string, string> = {
  crm: I.crm("019-crm"),
  pipeline: I.auto("sales-funnel"),
  campanas: I.mkt("019-email"),
  workflows: I.auto("workflow"),
  ia: I.auto("machine-learning"),
  agentes: I.saas("saas-automation-cloud-process-software-workflow-smart-system-auto-task"),
  inbox: I.mkt("031-mail"),
  analytics: I.auto("data-analytics"),
  billing: I.saas("saas-billing-online-invoice-payment-system-software-finance-subscription-bill"),
  funnels: I.mkt("035-target"),
  "landing-pages": I.mkt("030-landing-page"),
  lms: I.saas("user-onboarding-software-setup-product-tutorial-welcome-flow-app-guide"),
  ecommerce: I.auto("order-processing"),
  marketing: I.mkt("001-marketing-automation"),
  whatsapp: I.mkt("014-social-media"),
  calendario: I.auto("scheduling"),
  store: I.auto("inventory-management"),
  chat: I.crm("003-customer-service"),
  ads: I.mkt("021-campaign"),
  seo: I.mkt("017-optimization"),
  portal: I.saas("user-access-saas-users-team-management-account-control-cloud-login"),
  integraciones: I.saas("saas-api-software-integration-cloud-tools-app-connection-developer-tool"),
  seguridad: I.db("firewall-server-security-data-protection-network"),
  default: I.saas("saas-application-web-app-software-cloud-ui-online-tool"),
};

export function moduleIcon(slug: string): string {
  return moduleIcons[slug] ?? moduleIcons.default;
}

/** Agency service icon hints (premium stock). */
export const agencyIcons: Record<string, string> = {
  seo: I.mkt("017-optimization"),
  "google-ads": I.mkt("021-campaign"),
  "meta-ads": I.mkt("014-social-media"),
  branding: I.mkt("016-content-curation"),
  contenido: I.mkt("016-content-curation"),
  "desarrollo-web": I.mkt("008-website"),
  "email-marketing": I.mkt("019-email"),
  automatizacion: I.auto("workflow"),
  consultoria: I.mkt("011-consulting"),
  diseno: I.mkt("022-content"),
  "social-media": I.mkt("014-social-media"),
  sem: I.mkt("017-optimization"),
  ads: I.mkt("021-campaign"),
  ecommerce: I.auto("order-processing"),
  ia: I.auto("machine-learning"),
  default: I.mkt("001-marketing-automation"),
};

export function agencyIcon(slug: string): string {
  return agencyIcons[slug] ?? agencyIcons.default;
}

/** Enterprise / infra icons. */
export const enterpriseIcons = {
  security: I.db("firewall-server-security-data-protection-network"),
  cloud: I.db("cloud-server-hosting-data-cloud-storage"),
  database: I.db("database-storage-server-data-management"),
  sync: I.db("sync-data-server-cloud-connection"),
  analytics: I.auto("business-intelligence"),
  compliance: I.auto("compliance-tracking"),
} as const;

export const LIBRARY_MANIFEST = "/brand/public/library/manifest.json";
