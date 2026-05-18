/**
 * Genera sectorOsRegistry.ts — 193 sectores → SectorAgentWrapper + runXxxAgentCore / legacy.
 * Uso: node backend/os-agents/scripts/generate-sector-os-registry.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectorsRoot = path.resolve(__dirname, "../sectors");
const outFile = path.resolve(__dirname, "../sectorOsRegistry.ts");

/** No registrar serviceId idéntico a un premium OS (24 servicios). */
const PREMIUM_SERVICE_IDS = new Set([
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
]);

function detectPattern(args) {
  const a = args.replace(/\s+/g, " ");
  if (/temperature/.test(a)) return "C";
  if (/agentId: string, input:/.test(a)) return "A";
  if (/agentId: string, llm: ILlmClient, params:/.test(a)) return "B";
  return "B";
}

function findLegacyGetter(indexSrc) {
  const fns = [...indexSrc.matchAll(/\b(get\w+Agent)\b/g)].map((m) => m[1]);
  return fns.find((n) => n !== "getDefault") ?? fns[0] ?? null;
}

function legacyMethod(agentSrc) {
  if (/async execute\(/.test(agentSrc)) return "execute";
  if (/async run\(/.test(agentSrc)) return "run";
  const custom = agentSrc.match(/async (\w+)\(\s*userId\s*:/);
  if (custom?.[1]) return custom[1];
  return "run";
}

function toServiceId(sectorDir) {
  if (PREMIUM_SERVICE_IDS.has(sectorDir)) throw new Error(`sector folder collides with premium id: ${sectorDir}`);
  return sectorDir;
}

const sectorDirs = fs
  .readdirSync(sectorsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const entries = [];

for (const sector of sectorDirs) {
  const serviceId = toServiceId(sector);
  const sharedPath = path.join(sectorsRoot, sector, "shared.ts");
  const indexPath = path.join(sectorsRoot, sector, "index.ts");

  if (fs.existsSync(sharedPath)) {
    const src = fs.readFileSync(sharedPath, "utf8");
    const fnMatch = src.match(/export async function (run\w+AgentCore)\(([\s\S]*?)\):/);
    if (fnMatch) {
      const fnName = fnMatch[1];
      const pattern = detectPattern(fnMatch[2]);
      const getLlmMatch = src.match(/export function (getDefault\w+Llm)\(\)/);
      const getLlm = getLlmMatch?.[1] ?? "LlmClient.getInstance";
      const useLlmClient = !getLlmMatch;
      entries.push({ sector, serviceId, kind: "core", fnName, pattern, getLlm, useLlmClient });
      continue;
    }
  }

  if (fs.existsSync(indexPath)) {
    const indexSrc = fs.readFileSync(indexPath, "utf8");
    const getter = findLegacyGetter(indexSrc);
    if (getter) {
      const agentTs = `${getter.slice(3)}.ts`;
      const agentPath = path.join(sectorsRoot, sector, agentTs);
      let method = "run";
      if (fs.existsSync(agentPath)) {
        const agentSrc = fs.readFileSync(agentPath, "utf8");
        method = legacyMethod(agentSrc) ?? "run";
      }
      entries.push({ sector, serviceId, kind: "legacy", getter, method });
    }
  }
}

const coreImports = new Map();
for (const e of entries) {
  if (e.kind === "core") {
    coreImports.set(e.sector, e.fnName);
  }
}

let out = `/** AUTO-GENERATED — node backend/os-agents/scripts/generate-sector-os-registry.mjs */\n`;
out += `import { LlmClient } from "./LlmClient";\n`;
out += `import { SectorAgentWrapper, type SectorCoreExecutor } from "./SectorAgentWrapper";\n`;
out += `import type { BaseOsAgent } from "./BaseOsAgent";\n`;
out += `import { buildSectorInputFromPayload, defaultSectorEliteParams } from "./sectorOsPayload";\n`;
out += `import type { OsJobContext, OsJobPayload } from "./types";\n\n`;

for (const [sector, fnName] of [...coreImports.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const getLlmEntry = entries.find((x) => x.sector === sector && x.kind === "core");
  if (getLlmEntry?.useLlmClient) {
    out += `import { ${fnName} } from "./sectors/${sector}/shared";\n`;
  } else if (getLlmEntry?.getLlm) {
    out += `import { ${fnName}, ${getLlmEntry.getLlm} } from "./sectors/${sector}/shared";\n`;
  } else {
    out += `import { ${fnName} } from "./sectors/${sector}/shared";\n`;
  }
}

const legacyEntries = entries.filter((e) => e.kind === "legacy");
for (const e of legacyEntries) {
  out += `import { ${e.getter} } from "./sectors/${e.sector}";\n`;
}

out += `\nexport const OS_SECTOR_SERVICE_IDS = [\n`;
for (const e of entries) {
  out += `  "${e.serviceId}",\n`;
}
out += `] as const;\n\nexport type OsSectorServiceId = (typeof OS_SECTOR_SERVICE_IDS)[number];\n\n`;

out += `type SectorFactory = () => BaseOsAgent;\n\n`;

const executorFns = [];

for (const e of entries) {
  const fnId = e.serviceId.replace(/[^a-zA-Z0-9]/g, "_");
  let body = "";
  if (e.kind === "core") {
    const llmExpr = e.useLlmClient ? "LlmClient.getInstance()" : `${e.getLlm}()`;
    if (e.pattern === "A") {
      body = `
  const input = buildSectorInputFromPayload("${e.sector}", payload, ctx);
  const llm = ${llmExpr};
  const agentId = String(input.agentId ?? "${e.sector}-os");
  return ${e.fnName}(agentId, input as never, llm);`;
    } else if (e.pattern === "C") {
      body = `
  const input = buildSectorInputFromPayload("${e.sector}", payload, ctx);
  const llm = ${llmExpr};
  const agentId = String(input.agentId ?? "${e.sector}-os");
  const params = defaultSectorEliteParams();
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.3;
  return ${e.fnName}(agentId, llm, params, input as never, temperature);`;
    } else {
      body = `
  const input = buildSectorInputFromPayload("${e.sector}", payload, ctx);
  const llm = ${llmExpr};
  const agentId = String(input.agentId ?? "${e.sector}-os");
  const params = defaultSectorEliteParams();
  return ${e.fnName}(agentId, llm, params, input as never);`;
    }
  } else {
    body = `
  const input = buildSectorInputFromPayload("${e.sector}", payload, ctx);
  const userId = String(input.userId ?? ctx.clientId);
  const agent = ${e.getter}();
  return (agent as { ${e.method}: (uid: string, inp: unknown) => Promise<unknown> }).${e.method}(userId, input as never);`;
  }

  executorFns.push(`const exec_${fnId}: SectorCoreExecutor = async (payload: OsJobPayload, ctx: OsJobContext) => {${body}
};`);
}

out += executorFns.join("\n\n");
out += `\n\nexport const SECTOR_OS_AGENT_REGISTRY: Record<OsSectorServiceId, SectorFactory> = {\n`;

for (const e of entries) {
  const fnId = e.serviceId.replace(/[^a-zA-Z0-9]/g, "_");
  out += `  "${e.serviceId}": () => new SectorAgentWrapper({ serviceId: "${e.serviceId}", executor: exec_${fnId} }),\n`;
}

out += `};\n\n`;
out += `export function isSectorServiceId(id: string): id is OsSectorServiceId {\n`;
out += `  return (OS_SECTOR_SERVICE_IDS as readonly string[]).includes(id);\n`;
out += `}\n\n`;
out += `export function instantiateSectorOsAgent(serviceId: string): BaseOsAgent | null {\n`;
out += `  if (!isSectorServiceId(serviceId)) return null;\n`;
out += `  return SECTOR_OS_AGENT_REGISTRY[serviceId]();\n`;
out += `}\n`;

fs.writeFileSync(outFile, out);
console.log(`Wrote ${outFile} — ${entries.length} sectores (${legacyEntries.length} legacy, ${entries.length - legacyEntries.length} core).`);
