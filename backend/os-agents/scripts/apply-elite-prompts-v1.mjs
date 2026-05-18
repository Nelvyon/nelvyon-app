// MIG 300 — Inyecta ELITE_V300_STANDARDS en todos los build*Prompt de sector shared.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectorsRoot = path.join(__dirname, "..", "sectors");

const SKIP = new Set([
  "seo",
  "ads",
  "copywriting",
  "technicalseoaudit",
  "productanalytics",
  "emailmarketing",
  "superiorcontentai",
]);

const IMPORT_LINE =
  'import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";\n';

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, files);
    else if (name.name === "shared.ts") files.push(p);
  }
  return files;
}

let patched = 0;
let skipped = 0;

for (const file of walk(sectorsRoot)) {
  const sector = path.basename(path.dirname(file));
  if (SKIP.has(sector)) {
    skipped++;
    continue;
  }

  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("export function build") || content.includes("ELITE_V300_STANDARDS")) {
    skipped++;
    continue;
  }

  if (!content.includes("elitePromptLibrary")) {
    const m = content.match(/^import[\s\S]*?;\n\n/m);
    if (m) {
      content = content.replace(m[0], `${m[0]}${IMPORT_LINE}`);
    } else {
      content = `${IMPORT_LINE}\n${content}`;
    }
  }

  const updated = content.replace(
    /return `\$\{params\.eliteRole\}\n\n/g,
    "return `${params.eliteRole}\n\n${ELITE_V300_STANDARDS}\n\n",
  );

  if (updated === content) {
    skipped++;
    continue;
  }

  fs.writeFileSync(file, updated, "utf8");
  patched++;
}

console.log(`MIG 300 batch: patched=${patched} skipped=${skipped}`);
