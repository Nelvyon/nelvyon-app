import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function readPremIds() {
  const t = fs.readFileSync(path.join(root, "backend/os-agents/constants.ts"), "utf8");
  return [...t.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function readSectorIds() {
  const t = fs.readFileSync(path.join(root, "backend/os-agents/sectorOsRegistry.ts"), "utf8");
  const m = t.match(/export const OS_SECTOR_SERVICE_IDS = \[([\s\S]*?)\] as const/);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const sectorsDir = path.join(root, "backend/os-agents/sectors");
const sectorAgents = [];
for (const sector of fs.readdirSync(sectorsDir)) {
  const dir = path.join(sectorsDir, sector);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith("Agent.ts")) continue;
    sectorAgents.push({ sector, className: f.replace(/\.ts$/, "") });
  }
}
sectorAgents.sort((a, b) => a.sector.localeCompare(b.sector) || a.className.localeCompare(b.className));

const premiumAgents = fs
  .readdirSync(path.join(root, "backend/os-agents/agents"))
  .filter((f) => f.endsWith("PremiumAgent.ts"))
  .map((f) => f.replace(/\.ts$/, ""));

function listPages(dir, base = "") {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    const rel = `${base}/${ent.name}`.replace(/\\/g, "/");
    if (ent.isDirectory()) out.push(...listPages(p, rel));
    else if (ent.name === "page.tsx") out.push(base || "/");
  }
  return out;
}

const appDir = path.join(root, "apps/web/src/app");
const pages = listPages(appDir).map((p) => (p === "" ? "/" : p)).sort();

const nextApiApp = [];
function walkApi(d, prefix) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) walkApi(p, `${prefix}/${ent.name}`);
    else if (ent.name === "route.ts") nextApiApp.push(prefix);
  }
}
walkApi(path.join(root, "apps/web/src/app/api"), "/api");

const pagesApi = fs
  .readdirSync(path.join(root, "apps/web/src/pages/api"), { withFileTypes: true });
function walkPagesApi(d, prefix) {
  const out = [];
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) out.push(...walkPagesApi(p, `${prefix}/${ent.name}`));
    else if (ent.name.endsWith(".ts")) out.push(`${prefix}/${ent.name.replace(/\.ts$/, "")}`);
  }
  return out;
}
const pagesApiRoutes = walkPagesApi(path.join(root, "apps/web/src/pages/api"), "/api").sort();

const frontendPages = fs
  .readdirSync(path.join(root, "frontend/src/pages"), { recursive: true })
  .filter((f) => String(f).endsWith(".tsx"))
  .map((f) => String(f).replace(/\\/g, "/").replace(/\.tsx$/, ""))
  .sort();

const out = {
  premIds: readPremIds(),
  sectorIds: readSectorIds(),
  premiumAgents: premiumAgents.sort(),
  sectorAgents,
  pages,
  nextApiApp: nextApiApp.sort(),
  pagesApiRoutes,
  frontendPages,
};
fs.writeFileSync(path.join(root, "tools/inventory.json"), JSON.stringify(out, null, 0));
console.log(
  JSON.stringify({
    prem: out.premIds.length,
    sectors: out.sectorIds.length,
    agents: out.sectorAgents.length,
    pages: out.pages.length,
    nextApi: out.nextApiApp.length,
    pagesApi: out.pagesApiRoutes.length,
    frontend: out.frontendPages.length,
  }),
);
