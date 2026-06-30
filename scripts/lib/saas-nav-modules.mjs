/** Parses SAAS_NAV_ITEMS from saasNav.ts — single source for smoke scripts. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const navPath = join(root, "apps/web/src/features/saas-shell/saasNav.ts");

/** Canonical GET probe path per sidebar id (must match real route.ts). */
const SAAS_API_BY_ID = {
  dashboard: "/api/saas/dashboard",
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
  objetos: "/api/saas/objects",
  encuestas: "/api/saas/encuestas",
  documentos: "/api/saas/documentos",
  facturas: "/api/saas/facturas",
  qr: "/api/saas/qr",
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
    const apiPath = SAAS_API_BY_ID[id] ?? `/api/saas/${id}`;
    items.push({ id, href, apiPath });
  }
  return items;
}
