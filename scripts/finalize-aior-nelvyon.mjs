/**
 * @deprecated Destruye plantillas — NO usar.
 * Usar: brand-aior-nelvyon.mjs + content-aior-nelvyon-only.mjs
 */
import { spawnSync } from "node:child_process";
console.warn("[deprecated] finalize-aior-nelvyon.mjs → delegando a content-aior-nelvyon-only.mjs");
const r = spawnSync(process.execPath, ["scripts/content-aior-nelvyon-only.mjs"], {
  stdio: "inherit",
  cwd: process.cwd(),
});
process.exit(r.status ?? 1);
