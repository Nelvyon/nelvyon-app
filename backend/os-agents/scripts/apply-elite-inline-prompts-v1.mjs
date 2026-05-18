/**
 * MIG 300 — Refuerza prompts inline en *Agent.ts (const prompt = `...)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectorsRoot = path.join(__dirname, "..", "sectors");

const ELITE_BLOCK = `### ESTÁNDAR NELVYON OS — PROMPTS ÉLITE v1
1. ROL EXPERTO verificable · 2. CONTEXTO del cliente · 3. TAREA con formato estructurado · 4. Ejemplos concretos · 5. Sin relleno genérico · 6. Calidad top 1% mundial.

`;

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, files);
    else if (name.name.endsWith("Agent.ts")) files.push(p);
  }
  return files;
}

let patched = 0;

for (const file of walk(sectorsRoot)) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("const prompt = `") && !content.includes("const prompt=`")) continue;
  if (content.includes("ESTÁNDAR NELVYON OS — PROMPTS ÉLITE v1")) continue;

  const updated = content.replace(
    /const prompt = `\$\{/g,
    `const prompt = \`${ELITE_BLOCK}\${`,
  );

  if (updated !== content) {
    fs.writeFileSync(file, updated, "utf8");
    patched++;
  }
}

console.log(`MIG 300 inline agents patched=${patched}`);
