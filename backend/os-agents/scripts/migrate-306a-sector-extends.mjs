/**
 * MIG 306-A PASO 2: BaseOsAgent → SectorAgentBase en *Agent.ts de los primeros 97 sectores (alfabético).
 * Uso: node backend/os-agents/scripts/migrate-306a-sector-extends.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectorsRoot = path.resolve(__dirname, "../sectors");

const sectorDirs = fs
  .readdirSync(sectorsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()
  .slice(0, 97);

let changed = 0;

for (const sector of sectorDirs) {
  const dir = path.join(sectorsRoot, sector);
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith("Agent.ts")) continue;
    const filePath = path.join(dir, name);
    let src = fs.readFileSync(filePath, "utf8");
    if (!src.includes("extends BaseOsAgent")) continue;

    const depth = 2;
    const importPath = `${"../".repeat(depth)}SectorAgentBase`;
    if (!src.includes("SectorAgentBase")) {
      src = `import { SectorAgentBase } from "${importPath}";\n${src}`;
    }
    src = src.replace(/\bextends BaseOsAgent\b/g, "extends SectorAgentBase");
    src = src.replace(
      /import\s*\{\s*BaseOsAgent\s*\}\s*from\s*["'][^"']+["'];\n?/g,
      "",
    );
    fs.writeFileSync(filePath, src);
    changed++;
    console.log("updated", path.relative(sectorsRoot, filePath));
  }
}

console.log(`MIG 306-A: ${changed} archivos actualizados en ${sectorDirs.length} sectores.`);
