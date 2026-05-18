import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appWebRoot = join(__dirname, "..");
const files = JSON.parse(readFileSync(join(__dirname, "smoke-test-files.json"), "utf8"));
const vitestEntry = join(appWebRoot, "node_modules", "vitest", "vitest.mjs");

const r = spawnSync(process.execPath, [vitestEntry, "run", ...files], {
  cwd: appWebRoot,
  stdio: "inherit",
  shell: false,
  env: process.env,
});

if (r.signal) process.exit(1);
process.exit(r.status ?? 1);
