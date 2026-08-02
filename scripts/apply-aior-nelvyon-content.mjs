/**
 * @deprecated Usar content-aior-nelvyon-only.mjs (no fusiona ni borra plantillas).
 */
import { spawnSync } from "node:child_process";
console.warn("[deprecated] apply-aior-nelvyon-content.mjs → content-aior-nelvyon-only.mjs");
const r = spawnSync(process.execPath, ["scripts/content-aior-nelvyon-only.mjs"], {
  stdio: "inherit",
  cwd: process.cwd(),
});
process.exit(r.status ?? 1);
