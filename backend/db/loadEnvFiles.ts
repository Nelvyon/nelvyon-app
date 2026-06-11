import fs from "fs";
import path from "path";

/** Load repo/web env files. With MIGRATE_ENV=staging, prefers apps/web/.env.staging.local. */
export function loadEnvFiles(): void {
  const repoRoot = path.resolve(__dirname, "../..");
  const webRoot = path.join(repoRoot, "apps", "web");
  const staging = (process.env.MIGRATE_ENV ?? process.env.NELVYON_ENV ?? "").toLowerCase() === "staging";
  const files = [
    ...(staging ? [path.join(webRoot, ".env.staging.local")] : []),
    path.join(webRoot, ".env.production.local"),
    path.join(webRoot, ".env.production.local.txt"),
    path.join(webRoot, ".env.local"),
    path.join(repoRoot, ".env.production"),
    path.join(repoRoot, ".env"),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
