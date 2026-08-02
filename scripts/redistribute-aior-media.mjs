/**
 * Wrapper de media — política SELECTIVA (CEO 2026-08-02).
 * Delega en pasada de fidelidad (no scramble de paths).
 *
 *   node scripts/brand-aior-nelvyon.mjs
 *   node scripts/content-aior-nelvyon-only.mjs
 *   node scripts/redistribute-aior-media.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const script = path.join(ROOT, "scripts", "fidelity-aior-media-pass.mjs");
const r = spawnSync(process.execPath, [script], { stdio: "inherit", cwd: ROOT });
process.exit(r.status ?? 1);
