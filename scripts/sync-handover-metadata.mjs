#!/usr/bin/env node
/**
 * Sync git metadata into docs/HANDOVER.md (commit, date, branch).
 * Usage: node scripts/sync-handover-metadata.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const handoverPath = path.join(root, "docs", "HANDOVER.md");

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

try {
  const hash = sh("git rev-parse --short HEAD");
  const subject = sh("git log -1 --format=%s");
  const date = sh("git log -1 --format=%ci");
  const branch = sh("git branch --show-current");
  const status = sh("git status -sb");

  let content = fs.readFileSync(handoverPath, "utf8");
  const now = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  content = content.replace(
    /> Última actualización automática: \*\*[^*]+\*\*/,
    `> Última actualización automática: **${now}**`,
  );
  content = content.replace(
    /\| \*\*Último commit\*\* \| `[^`]+` — `[^`]+` \|/,
    `| **Último commit** | \`${hash}\` — \`${subject}\` |`,
  );
  content = content.replace(
    /\| \*\*Fecha doc\*\* \| [^|]+ \|/,
    `| **Fecha doc** | ${date.slice(0, 10)} |`,
  );
  content = content.replace(
    /\| \*\*Rama\*\* \| `[^`]+`[^|]*\|/,
    `| **Rama** | \`${branch}\` (${status.includes("ahead") ? status.match(/ahead \d+/)?.[0] ?? "sync" : "sync with origin"}) |`,
  );

  fs.writeFileSync(handoverPath, content);
  console.log(`[sync-handover] updated HANDOVER.md — ${hash} ${branch}`);
} catch (e) {
  console.error("[sync-handover] failed:", e.message);
  process.exit(1);
}
