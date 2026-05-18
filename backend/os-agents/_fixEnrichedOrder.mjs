import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectors = path.join(__dirname, "sectors");

const ENRICH_START = "const enriched = (await ClientProfileService.enrichInput(";
const ENRICH_END_MARKER = ")) as typeof input & { _clientProfileBrief?: string };";

function walk(dir, acc = []) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.isFile() && /^[A-Z].*Agent\.ts$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function extractEnrichBlock(src) {
  const i = src.indexOf(ENRICH_START);
  if (i === -1) return null;
  const j = src.indexOf(ENRICH_END_MARKER, i);
  if (j === -1) return null;
  return { start: i, end: j + ENRICH_END_MARKER.length, block: src.slice(i, j + ENRICH_END_MARKER.length) };
}

function fixFile(src) {
  const ex = extractEnrichBlock(src);
  if (!ex) return src;
  const promptIdx0 = src.indexOf("const prompt = `");
  if (promptIdx0 === -1 || ex.start > promptIdx0) return src;

  const without = src.slice(0, ex.start) + src.slice(ex.end);
  const promptIdx = without.indexOf("const prompt = `");
  if (promptIdx === -1) return src;
  const chunk = without.slice(0, promptIdx);
  const re = /async \w+\([^)]*\)(?::\s*Promise<[^>]+>)?\s*\{/g;
  let openBrace = -1;
  let m;
  while ((m = re.exec(chunk)) !== null) openBrace = m.index + m[0].length - 1;
  if (openBrace === -1) return src;

  const lines = ex.block.trim().split("\n");
  const normalizedBlock = lines.map((l) => `    ${l.trim()}`).join("\n");
  const insertAt = openBrace + 1;
  return `${without.slice(0, insertAt)}\n${normalizedBlock}\n${without.slice(insertAt)}`;
}

let n = 0;
for (const f of walk(sectors)) {
  const s = fs.readFileSync(f, "utf8");
  if (!s.includes("ClientProfileService.enrichInput")) continue;
  const t = fixFile(s);
  if (t !== s) {
    fs.writeFileSync(f, t, "utf8");
    n++;
  }
}
console.log("reordered enriched in", n, "files");
