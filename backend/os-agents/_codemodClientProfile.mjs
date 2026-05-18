import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectors = path.join(__dirname, "sectors");

const IMPORT_LINE = 'import { ClientProfileService } from "../../client-profile";';

const ENRICH_BLOCK = `    const enriched = (await ClientProfileService.enrichInput(
      userId,
      String((input as { brandName?: string }).brandName ?? ""),
      input as object,
    )) as typeof input & { _clientProfileBrief?: string };

`;

// Inserted at start of prompt template (TS). Inner \\n\\n → \\n in generated .ts for runtime newlines in LLM prompt.
const PREFIX = '${enriched._clientProfileBrief ? `${String(enriched._clientProfileBrief).trim()}\\n\\n` : ""}';

function walk(dir, acc = []) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.isFile() && /^[A-Z].*Agent\.ts$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function transform(src) {
  if (src.includes("ClientProfileService.enrichInput")) return src;
  if (!src.includes("const prompt = `")) return src;

  let out = src;
  if (!out.includes("ClientProfileService")) {
    const firstImport = out.indexOf("import ");
    if (firstImport === -1) return src;
    const lineEnd = out.indexOf("\n", firstImport);
    out = out.slice(0, lineEnd + 1) + IMPORT_LINE + "\n" + out.slice(lineEnd + 1);
  }

  const needle = "const prompt = `";
  const idx = out.indexOf(needle);
  if (idx === -1) return src;
  if (!out.slice(Math.max(0, idx - 400), idx).includes("ClientProfileService.enrichInput")) {
    out = out.slice(0, idx) + ENRICH_BLOCK + out.slice(idx);
  }

  const idx2 = out.indexOf(needle);
  const afterBacktick = idx2 + needle.length;
  const slice = out.slice(afterBacktick, afterBacktick + 80);
  if (!slice.includes("enriched._clientProfileBrief")) {
    out = out.slice(0, afterBacktick) + PREFIX + out.slice(afterBacktick);
  }

  out = out.replace(/\binput\./g, "enriched.");
  out = out.replace(/^\s*void userId;\s*\n/gm, "");

  return out;
}

let c = 0;
for (const f of walk(sectors)) {
  const s = fs.readFileSync(f, "utf8");
  const t = transform(s);
  if (t !== s) {
    fs.writeFileSync(f, t, "utf8");
    c++;
  }
}
console.log("updated", c, "agent files");
