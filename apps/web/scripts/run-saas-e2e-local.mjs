#!/usr/bin/env node
/**
 * Local SaaS E2E — mirrors CI playwright-saas.yml (prod build + server + suite).
 * Usage: pnpm test:e2e:saas:local
 *
 * Windows: uses installed Google Chrome (PLAYWRIGHT_CHANNEL=chrome) to skip flaky Chromium download.
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const jwt = process.env.JWT_SECRET ?? "test-secret-for-playwright-saas-e2e";

async function resolvePort() {
  if (process.env.PORT) return { port: process.env.PORT, reuse: false };
  const candidates = ["3010", "3011", "3012", "3020"];
  for (const candidate of candidates) {
    try {
      const res = await fetch(`http://localhost:${candidate}/api/health`, {
        signal: AbortSignal.timeout(800),
      });
      if (res.ok) return { port: candidate, reuse: true };
      // Port occupied by another process — try next candidate.
    } catch {
      // Connection refused / timeout — port appears free.
      return { port: candidate, reuse: false };
    }
  }
  return { port: "3010", reuse: false };
}

const SYSTEM_CHROME_PATHS = [
  join(process.env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
  join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
  join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
];

function hasSystemChrome() {
  return SYSTEM_CHROME_PATHS.some((p) => existsSync(p));
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      cwd: root,
      env: { ...process.env, ...opts.env },
      ...opts,
    });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function waitForHealth(baseUrl, maxAttempts = 90) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        console.log(`Server ready after ${i} attempt(s)`);
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Server failed to start");
}

async function ensureBrowser() {
  if (hasSystemChrome()) {
    console.log("→ Using installed Google Chrome (skip Playwright Chromium download)");
    process.env.PLAYWRIGHT_CHANNEL = "chrome";
    return;
  }
  const browsersPath =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".cache", "ms-playwright");
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  const lockPath = join(browsersPath, "__dirlock");
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (existsSync(lockPath)) rmSync(lockPath, { recursive: true, force: true });
      console.log(`→ Installing Playwright Chromium (attempt ${attempt}/3)…`);
      await run("pnpm", ["exec", "playwright", "install", "chromium"]);
      return;
    } catch {
      if (attempt === 3) throw new Error("Playwright Chromium install failed — install Google Chrome or run INSTALL-PLAYWRIGHT.bat");
      console.warn("Playwright install lock conflict — retrying in 5s…");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function main() {
  process.env.JWT_SECRET = jwt;
  await ensureBrowser();

  const buildId = join(root, ".next", "BUILD_ID");
  const forceBuild = process.env.E2E_FORCE_BUILD === "1";
  const skipBuild = process.env.E2E_SKIP_BUILD === "1";
  if (!skipBuild && (!existsSync(buildId) || forceBuild)) {
    console.log("→ Building Next.js (prod)…");
    await run("pnpm", ["build"], {
      env: { JWT_SECRET: jwt, NODE_ENV: "production" },
    });
  } else if (!skipBuild && existsSync(buildId)) {
    console.log("→ Build exists — set E2E_FORCE_BUILD=1 to rebuild after src changes");
  } else if (skipBuild) {
    console.log("→ E2E_SKIP_BUILD=1 — using existing .next build");
  }

  let port = process.env.PORT ?? "3010";
  let reuseServer = false;
  if (!forceBuild) {
    const resolved = await resolvePort();
    port = resolved.port;
    reuseServer = resolved.reuse;
  }
  const baseUrl = `http://localhost:${port}`;

  let server = null;
  const killServer = () => {
    if (server && !server.killed) server.kill("SIGTERM");
  };

  if (reuseServer) {
    console.log(`→ Reusing existing server on :${port}`);
  } else {
    console.log(`→ Starting prod server on :${port}…`);
    server = spawn("pnpm", ["start"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      cwd: root,
      env: {
        ...process.env,
        PORT: port,
        JWT_SECRET: jwt,
        NODE_ENV: "production",
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://noop:noop@localhost:5432/noop",
      },
    });

    process.on("SIGINT", () => {
      killServer();
      process.exit(130);
    });
    process.on("SIGTERM", killServer);
  }

  try {
    await waitForHealth(baseUrl);
    console.log("→ Running SaaS Playwright suite…");
    await run("pnpm", ["exec", "playwright", "test", "--config", "playwright.saas.config.ts"], {
      env: {
        CI: "true",
        JWT_SECRET: jwt,
        PLAYWRIGHT_BASE_URL: baseUrl,
        ...(process.env.PLAYWRIGHT_CHANNEL ? { PLAYWRIGHT_CHANNEL: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    });
    console.log("✅ SaaS E2E passed locally");
  } finally {
    killServer();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
