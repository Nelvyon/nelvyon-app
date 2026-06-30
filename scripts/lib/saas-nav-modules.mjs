/** Parses SAAS_NAV_ITEMS from saasNav.ts — single source for smoke scripts. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const navPath = join(root, "apps/web/src/features/saas-shell/saasNav.ts");

const SAAS_API_BY_ID = {
  dashboard: "dashboard",
  inbox: "inbox",
  crm: "crm",
  pipeline: "pipeline",
  calendar: "calendar",
  campanias: "campanias",
  sms: "sms",
  social: "social",
  whatsapp: "whatsapp",
  dialer: "dialer",
  secuencias: "sequences",
  publicidad: "ads",
  seo: "seo",
  reputacion: "reputation",
  workflows: "workflows",
  formularios: "formularios",
  citas: "citas",
  helpdesk: "helpdesk",
  prospecting: "prospecting",
  snippets: "snippets",
  countdown: "countdown",
  objetos: "objects",
  encuestas: "encuestas",
  documentos: "documentos",
  facturas: "facturas",
  qr: "qr",
  "ab-testing": "ab-testing",
  funnels: "funnels",
  "web-builder": "web-builder",
  lms: "lms",
  store: "store",
  affiliates: "affiliates",
  loyalty: "loyalty",
  "pack-store": "packs",
  "data-playbooks": "playbooks",
  "brief-to-launch": "brief-to-launch",
  compliance: "compliance",
  benchmark: "benchmark",
  autopilot: "autopilot",
  agentes: "agentes",
  chat: "chat",
  copywriter: "ai-copy",
  entregables: "entregables",
  reportes: "reportes",
  integraciones: "integrations",
  herramientas: "integrations",
  voice: "voice",
  pwa: "pwa",
  auditoria: "audit",
  "lead-scoring": "lead-scoring",
  comunidades: "communities",
  partner: "partner",
  subcuentas: "subcuentas",
  team: "team",
  "white-label": "white-label",
  webhooks: "webhooks",
  "api-keys": "api-keys",
  billing: "billing",
  settings: "settings",
};

export function loadSaasNavModules() {
  const src = readFileSync(navPath, "utf8");
  const items = [];
  const re = /\{\s*id:\s*"([^"]+)"[^}]*href:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = m[1];
    const href = m[2];
    items.push({
      id,
      href,
      apiPath: `/api/saas/${SAAS_API_BY_ID[id] ?? id}`,
    });
  }
  return items;
}
