#!/usr/bin/env node
/**
 * Move classified-archive orphans to docs/archive/ (idempotent).
 * Uses PowerShell-friendly sync spawn; no top-level await.
 */

import {
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const archiveDir = join(root, "docs", "archive");
mkdirSync(archiveDir, { recursive: true });

const readme = join(archiveDir, "README.md");
if (!existsSync(readme)) {
  writeFileSync(
    readme,
    `# docs/archive — documentación histórica

Documentos clasificados como **obsoletos / snapshots / research dumps**.
No forman parte del manifiesto RAG activo.

Para reactivar: mover a \`docs/\` y añadir entrada en \`orphanClassification.ts\` (disposition: index).
`,
    "utf8",
  );
}

const tmp = join(root, "scripts", "_archive-orphans-run.mts");
writeFileSync(
  tmp,
  `import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { archiveClassifications } from "../backend/local-ai/specialization/orphanClassification.ts";
const listPath = ${JSON.stringify(join(root, "scripts", "_archive-list.json"))};
writeFileSync(listPath, JSON.stringify(archiveClassifications().map(a => a.path), null, 2));
`,
);

const r = spawnSync("pnpm", ["-C", "apps/web", "exec", "tsx", tmp], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  process.exit(r.status ?? 1);
}

const list = JSON.parse(readFileSync(join(root, "scripts", "_archive-list.json"), "utf8"));
let moved = 0;
let skipped = 0;
const log = [];

for (const rel of list) {
  const from = join(root, rel);
  const to = join(archiveDir, basename(rel));
  if (!existsSync(from)) {
    if (existsSync(to)) {
      skipped++;
      log.push({ path: rel, status: "already_archived" });
    } else {
      log.push({ path: rel, status: "missing" });
    }
    continue;
  }
  renameSync(from, to);
  moved++;
  log.push({ path: rel, status: "moved", to: `docs/archive/${basename(rel)}` });
}

writeFileSync(
  join(root, "backend/local-ai/benchmarks/knowledge_archive_log.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), moved, skipped, log }, null, 2),
);

try {
  unlinkSync(tmp);
  unlinkSync(join(root, "scripts", "_archive-list.json"));
} catch {
  /* ignore */
}

console.log(JSON.stringify({ ok: true, moved, skipped }, null, 2));
