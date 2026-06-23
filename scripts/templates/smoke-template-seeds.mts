#!/usr/bin/env node
/**
 * Smoke: template library + seed store + pack wiring.
 * Usage: pnpm --dir apps/web exec tsx ../../scripts/templates/smoke-template-seeds.mts
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPackLibraryInternalRefs } from "../../apps/web/src/lib/packs/packTemplateLibrary.ts";
import { seedStoreStats } from "../../apps/web/src/lib/template-library/ingest/seed-store.ts";
import { getTemplateLibraryStats } from "../../apps/web/src/lib/template-library/registry.ts";

const stats = getTemplateLibraryStats();
const seeds = seedStoreStats();
const localRefs = buildPackLibraryInternalRefs({
  pack_id: "local-business-growth",
  sector: "restaurant",
});
const saasRefs = buildPackLibraryInternalRefs({
  pack_id: "saas-b2b-growth",
  sector: "saas_b2b",
});

console.log("SMOKE template-library + seeds\n");
console.log("registry:", JSON.stringify(stats));
console.log("seed-store:", JSON.stringify(seeds));
console.log("local on_disk_seeds:", localRefs.on_disk_seeds.length);
console.log("saas on_disk_seeds:", saasRefs.on_disk_seeds.length);
console.log("saas native landing:", saasRefs.native_templates.landing?.id);

if (stats.client_facing < 40) throw new Error("client_facing too low");
if (seeds.on_disk < 4) throw new Error("expected >= 4 aceternity seeds on disk");
if (saasRefs.on_disk_seeds.length < 4) throw new Error("saas pack missing on-disk seeds");
if (!saasRefs.native_templates.landing?.id) throw new Error("missing native landing");

console.log("\nOK: smoke passed");
