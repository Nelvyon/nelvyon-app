/** Parses SAAS_NAV_ITEMS from saasNav.ts — single source for smoke scripts. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const navPath = join(root, "apps/web/src/features/saas-shell/saasNav.ts");

/** Canonical GET probe path per sidebar id (must match real route.ts). */
const SAAS_API_BY_ID = {
  dashboard: "/api/saas/dashboard",
  setup: "/api/saas/setup",
  inbox: "/api/saas/inbox",
  crm: "/api/saas/crm/contacts",
  pipeline: "/api/saas/pipeline",
  calendar: "/api/saas/calendar",
  campanias: "/api/saas/campanias",
  sms: "/api/saas/sms",
  social: "/api/saas/social/accounts",
  whatsapp: "/api/saas/whatsapp",
  dialer: "/api/saas/dialer",
  secuencias: "/api/saas/sequences",
  publicidad: "/api/saas/ads",
  seo: "/api/saas/seo",
  reputacion: "/api/saas/reputation",
  workflows: "/api/saas/workflows",
  formularios: "/api/saas/formularios",
  citas: "/api/saas/citas",
  helpdesk: "/api/saas/helpdesk",
  prospecting: "/api/saas/prospecting",
  snippets: "/api/saas/snippets",
  countdown: "/api/saas/countdown",
  objetos: "/api/saas/custom-objects",
  encuestas: "/api/saas/surveys",
  documentos: "/api/saas/documents",
  facturas: "/api/saas/facturas",
  qr: "/api/saas/surveys?type=qr",
  "ab-testing": "/api/saas/ab-testing",
  funnels: "/api/saas/funnels",
  "web-builder": "/api/saas/web-builder",
  lms: "/api/saas/lms",
  store: "/api/saas/store/products",
  affiliates: "/api/saas/affiliates",
  loyalty: "/api/saas/loyalty",
  memberships: "/api/saas/memberships",
  "pack-store": "/api/saas/packs",
  "data-playbooks": "/api/saas/data-playbooks",
  "brief-to-launch": "/api/saas/brief-to-launch",
  compliance: "/api/saas/compliance",
  benchmark: "/api/saas/benchmark",
  autopilot: "/api/saas/autopilot",
  agentes: "/api/saas/agentes/runs",
  chat: "/api/saas/chat",
  copywriter: "/api/saas/ai-copy",
  entregables: "/api/saas/entregables",
  reportes: "/api/saas/reportes",
  attribution: "/api/saas/attribution",
  deliverability: "/api/saas/deliverability",
  marketplace: "/api/saas/marketplace",
  security: "/api/saas/security",
  integraciones: "/api/saas/integrations",
  herramientas: "/api/saas/integrations",
  voice: "/api/saas/voice",
  pwa: "/api/saas/pwa/status",
  auditoria: "/api/saas/audit",
  "lead-scoring": "/api/saas/lead-scoring",
  comunidades: "/api/saas/communities",
  partner: "/api/saas/partner",
  subcuentas: "/api/saas/subcuentas",
  team: "/api/saas/team",
  "white-label": "/api/saas/white-label",
  webhooks: "/api/saas/webhooks",
  "api-keys": "/api/saas/api-keys",
  // Existia y se probaba solo gracias al fallback que fabricaba rutas; al
  // retirarlo habria perdido cobertura en silencio.
  "knowledge-base": "/api/saas/knowledge-base",
  billing: "/api/saas/billing",
  settings: "/api/saas/settings",
};

export function loadSaasNavModules() {
  const src = readFileSync(navPath, "utf8");
  const items = [];
  const re = /\{\s*id:\s*"([^"]+)"[^}]*href:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = m[1];
    const href = m[2];
    // Sin mapeo canonico NO se inventa endpoint.
    //
    // Antes esto era `SAAS_API_BY_ID[id] ?? `/api/saas/${id}``, que fabricaba
    // una ruta inexistente para los modulos que solo tienen pagina. El smoke
    // pedia `/api/saas/erp-purchases`, recibia 404 y lo reportaba como aviso:
    // seis avisos permanentes que no correspondian a ningun defecto. Los cinco
    // modulos ERP viven en rutas anidadas (`/saas/erp/purchases`) y su id de
    // menu nunca fue un segmento de API.
    //
    // Que un modulo no tenga API propia es legitimo. Se marca como tal y decide
    // el llamante; lo que no vale es inventarse la URL y luego avisar de que no
    // responde.
    const apiPath = SAAS_API_BY_ID[id] ?? null;
    items.push({ id, href, apiPath, soloPagina: apiPath === null });
  }
  return items;
}
