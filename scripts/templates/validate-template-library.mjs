#!/usr/bin/env node
/**
 * Validates Nelvyon template library registry counts and seed safety.
 * Usage: node scripts/templates/validate-template-library.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

// Dynamic import via tsx if available, else instruct
async function main() {
  try {
    const { register } = await import("tsx/esm/api");
    register();
  } catch {
    console.log("Note: install tsx for direct TS import, or run: cd apps/web && pnpm exec vitest run src/lib/template-library");
  }

  const mod = await import(
    path.join(root, "apps/web/src/lib/template-library/registry.ts").replace(/\\/g, "/")
  );
  const { getTemplateLibraryStats, listTemplates } = mod;

  const stats = getTemplateLibraryStats();
  console.log("NELVYON Template Library — validation\n");
  console.log(JSON.stringify(stats, null, 2));

  const seeds = listTemplates({ status: "seed_only" });
  const deliverable = listTemplates({ status: "active" }).filter((t) => t.nelvyon_owned);

  console.log(`\nClient-facing active: ${deliverable.length}`);
  console.log(`Internal seeds: ${seeds.length}`);

  const violations = listTemplates().filter(
    (t) => !t.nelvyon_owned && t.status === "active",
  );
  if (violations.length) {
    console.error("\nFAIL: non-owned templates marked active:", violations.map((t) => t.id));
    process.exit(1);
  }

  if (stats.landings < 15) {
    console.error("\nFAIL: expected >= 15 landings");
    process.exit(1);
  }

  console.log("\nOK: registry validation passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
