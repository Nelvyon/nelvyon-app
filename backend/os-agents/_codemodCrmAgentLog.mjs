import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sectors = path.join(__dirname, "sectors");

const IMPORT_LINE = 'import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";\n';

function walk(dir, acc = []) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.isFile() && /^[A-Z].*Agent\.ts$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function transform(src) {
  if (!src.includes("async run(")) return src;
  if (!src.includes("return { agentId:")) return src;
  if (src.includes("tryLogCrmAgentOutput")) return src;

  let out = src;
  const insertAt = out.indexOf("import ");
  if (insertAt === -1) return src;
  const lineEnd = out.indexOf("\n", insertAt);
  out = out.slice(0, lineEnd + 1) + IMPORT_LINE + out.slice(lineEnd + 1);

  const lines = out.split(/\r?\n/);
  const next = [];
  for (const line of lines) {
    const m = line.match(/^(\s*)return (\{ agentId:.+\});?\s*$/);
    if (m) {
      const ind = m[1];
      next.push(`${ind}const __crmOut = ${m[2]};`);
      next.push(`${ind}await tryLogCrmAgentOutput(userId, input, __crmOut);`);
      next.push(`${ind}return __crmOut;`);
    } else {
      next.push(line);
    }
  }
  return next.join("\n");
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
console.log("crm hook inserted in", c, "files");
