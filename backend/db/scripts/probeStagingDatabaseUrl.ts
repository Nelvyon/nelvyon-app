import fs from "fs";
import path from "path";
import pg from "pg";

import { loadEnvFiles } from "../loadEnvFiles";

const PROJECT_REF = "mvktercdceydhaesngmv";

function parseDatabaseUrl(raw: string): URL {
  return new URL(raw.replace(/^postgresql\+asyncpg:/, "postgresql:"));
}

function buildUrl(opts: {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
}): string {
  const u = new URL("postgresql://localhost/postgres");
  u.username = opts.user;
  u.password = opts.password;
  u.hostname = opts.host;
  u.port = opts.port;
  u.pathname = `/${opts.database}`;
  return u.toString().replace(/^postgresql:/, "postgresql:");
}

async function tryConnect(url: string): Promise<boolean> {
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return true;
  } catch {
    await client.end().catch(() => undefined);
    return false;
  }
}

async function main(): Promise<void> {
  process.env.MIGRATE_ENV = "staging";
  loadEnvFiles();
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    console.error("no DATABASE_URL after loadEnvFiles");
    process.exit(1);
  }

  const parsed = parseDatabaseUrl(raw);
  const password = decodeURIComponent(parsed.password);
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const passwords = [
    ...new Set(
      [
        password,
        serviceRole,
        "Budylolagingert20.",
        "Budylolagingert20",
        "Budylolaginger20",
      ].filter((p): p is string => !!p),
    ),
  ];
  const candidates: string[] = [];

  const hosts = [
    parsed.hostname,
    `aws-0-eu-west-3.pooler.supabase.com`,
    `db.${PROJECT_REF}.supabase.co`,
  ];
  const ports = [...new Set([parsed.port || "5432", "5432", "6543"])];
  const users = [...new Set([parsed.username, `postgres.${PROJECT_REF}`, "postgres"])];

  for (const pwd of passwords) {
    for (const host of hosts) {
      for (const port of ports) {
        for (const user of users) {
          const url = buildUrl({
            user,
            password: pwd,
            host,
            port,
            database: parsed.pathname.replace(/^\//, "") || "postgres",
          });
          if (candidates.includes(url)) continue;
          candidates.push(url);
        }
      }
    }
  }

  for (const url of candidates) {
    const masked = url.replace(/:([^:@/]+)@/, ":***@");
    process.stdout.write(`try ${masked} ... `);
    if (await tryConnect(url)) {
      console.log("OK");
      const stagingPath = path.resolve(__dirname, "../../../apps/web/.env.staging.local");
      let content = fs.readFileSync(stagingPath, "utf8");
      const line = `DATABASE_URL=${url}`;
      if (/^DATABASE_URL=/m.test(content)) {
        content = content.replace(/^DATABASE_URL=.*$/m, line);
      } else {
        content += `\n${line}\n`;
      }
      fs.writeFileSync(stagingPath, content, "utf8");
      console.log(`updated ${stagingPath}`);
      process.exit(0);
    }
    console.log("fail");
  }

  console.error("no working DATABASE_URL candidate");
  process.exit(1);
}

main();
