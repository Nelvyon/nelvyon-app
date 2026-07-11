#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(root, "..", "backend", "local-ai", "migrations");
const container = "nelvyon-local-ai-postgres";

const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  const full = path.join(migrationsDir, file);
  console.log(`Applying ${file}...`);
  execSync(`docker exec -i ${container} psql -U nelvyon_local -d nelvyon_local_ai`, {
    input: fs.readFileSync(full, "utf8"),
    stdio: ["pipe", "inherit", "inherit"],
  });
}
console.log("LOCAL_AI_MIGRATE_OK");
