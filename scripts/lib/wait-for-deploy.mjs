/** Poll staging until /api/health/live reports the expected git SHA (or health is up). */
import { execSync } from "node:child_process";

import { smokeFetch } from "./smoke-fetch.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function resolveExpectedGitSha() {
  const fromCi = process.env.GITHUB_SHA?.trim();
  if (fromCi) return fromCi;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return process.env.EXPECTED_GIT_SHA?.trim() ?? null;
  }
}

function shaMatches(deployed, expected) {
  if (!deployed || !expected) return false;
  const a = deployed.toLowerCase();
  const b = expected.toLowerCase();
  return a === b || a.startsWith(b.slice(0, 7)) || b.startsWith(a.slice(0, 7));
}

/**
 * @param {string} baseUrl
 * @param {{ skipWait?: boolean; maxAttempts?: number; intervalMs?: number; expectedSha?: string | null; label?: string }} opts
 */
export async function waitForStagingDeploy(baseUrl, opts = {}) {
  const envMax = Number.parseInt(process.env.DEPLOY_WAIT_MAX_ATTEMPTS ?? "", 10);
  const envInterval = Number.parseInt(process.env.DEPLOY_WAIT_INTERVAL_MS ?? "", 10);
  const {
    skipWait = false,
    maxAttempts = Number.isFinite(envMax) && envMax > 0 ? envMax : 56,
    intervalMs = Number.isFinite(envInterval) && envInterval > 0 ? envInterval : 15_000,
    expectedSha = resolveExpectedGitSha(),
    label = "deploy",
  } = opts;

  if (skipWait) {
    console.log(`SKIP ${label} wait`);
    return { ready: true, skipped: true };
  }

  console.log(`Waiting for ${label} on ${baseUrl} (expected sha ${expectedSha?.slice(0, 7) ?? "n/a"})…`);

  const softOnHealth = process.env.DEPLOY_WAIT_SOFT === "true" || process.env.DEPLOY_WAIT_SOFT === "1";
  let lastHealthy = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await smokeFetch(`${baseUrl}/api/health/live`, { cache: "no-store" }, 20_000);
      const body = res.ok ? await res.json().catch(() => ({})) : {};
      const deployedSha = typeof body.git_sha === "string" ? body.git_sha : null;
      const matched = shaMatches(deployedSha, expectedSha);
      console.log(
        JSON.stringify({
          attempt,
          health: res.status,
          deployed_sha: deployedSha,
          expected_sha: expectedSha?.slice(0, 7) ?? null,
          matched,
        }),
      );
      if (res.status === 200) {
        lastHealthy = { deployedSha, matched };
        if (!expectedSha) {
          console.log("DEPLOY_READY");
          return { ready: true, deployedSha, matched: false };
        }
        if (deployedSha && shaMatches(deployedSha, expectedSha)) {
          console.log("DEPLOY_SHA_READY");
          return { ready: true, deployedSha, matched: true };
        }
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt, error: String(e) }));
    }
    await sleep(intervalMs);
  }

  if (softOnHealth && lastHealthy?.deployedSha) {
    console.log(
      `DEPLOY_SOFT_READY — health OK on ${lastHealthy.deployedSha.slice(0, 7)}; expected ${expectedSha?.slice(0, 7) ?? "n/a"} (Railway may skip rebuild on scripts-only push)`,
    );
    return { ready: true, deployedSha: lastHealthy.deployedSha, matched: false, softTimeout: true };
  }

  return { ready: false, timeout: true, lastHealthy };
}
