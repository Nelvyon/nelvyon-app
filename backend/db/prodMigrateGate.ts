/**
 * Production SQL migration governance gate (ADR-064).
 *
 * Staging/dev: unrestricted apply path.
 * Production: apply only when CEO-auditable approval env vars are set;
 * otherwise refuse to apply and fail the deploy if any migration is pending.
 */

export type ProdMigrateApproval = {
  approved: boolean;
  approvedBy: string | null;
  commitPin: string | null;
  reason: string;
};

export function resolveDeployEnvironment(env: NodeJS.ProcessEnv = process.env): {
  isProduction: boolean;
  label: string;
} {
  const explicit = (env.NELVYON_DEPLOY_ENV ?? "").trim().toLowerCase();
  if (explicit === "production" || explicit === "prod") {
    return { isProduction: true, label: "production(explicit)" };
  }
  if (
    explicit === "staging" ||
    explicit === "development" ||
    explicit === "dev" ||
    explicit === "test"
  ) {
    return { isProduction: false, label: explicit || "non-production(explicit)" };
  }

  const railway = (
    env.RAILWAY_ENVIRONMENT_NAME ??
    env.RAILWAY_ENVIRONMENT ??
    ""
  )
    .trim()
    .toLowerCase();
  if (railway === "production" || railway === "prod") {
    return { isProduction: true, label: `production(railway:${railway})` };
  }
  if (railway) {
    return { isProduction: false, label: railway };
  }

  // Fail closed when NODE_ENV=production without an explicit non-prod deploy label.
  if ((env.NODE_ENV ?? "").trim().toLowerCase() === "production") {
    return { isProduction: true, label: "production(node_env)" };
  }
  return { isProduction: false, label: "local/dev" };
}

export function readProdMigrateApproval(env: NodeJS.ProcessEnv = process.env): ProdMigrateApproval {
  const flag = (env.NELVYON_PROD_MIGRATE_APPROVED ?? "").trim();
  const approvedBy = (env.NELVYON_PROD_MIGRATE_APPROVED_BY ?? "").trim();
  const commitPin = (env.NELVYON_PROD_MIGRATE_COMMIT_SHA ?? "").trim() || null;
  const liveSha = (
    env.RAILWAY_GIT_COMMIT_SHA ??
    env.GIT_COMMIT_SHA ??
    env.VERCEL_GIT_COMMIT_SHA ??
    ""
  ).trim();

  if (flag !== "1") {
    return {
      approved: false,
      approvedBy: approvedBy || null,
      commitPin,
      reason: "NELVYON_PROD_MIGRATE_APPROVED must be exactly '1'",
    };
  }
  if (approvedBy.length < 2) {
    return {
      approved: false,
      approvedBy: null,
      commitPin,
      reason: "NELVYON_PROD_MIGRATE_APPROVED_BY is required (≥2 chars)",
    };
  }
  if (commitPin && liveSha) {
    const pin = commitPin.toLowerCase();
    const live = liveSha.toLowerCase();
    if (!(live.startsWith(pin) || pin.startsWith(live.slice(0, Math.min(pin.length, 12))))) {
      return {
        approved: false,
        approvedBy,
        commitPin,
        reason: `commit pin mismatch: approved_sha=${commitPin} deploy_sha=${liveSha.slice(0, 12)}`,
      };
    }
  }

  return {
    approved: true,
    approvedBy,
    commitPin,
    reason: `approved_by=${approvedBy}${commitPin ? ` pin=${commitPin}` : ""}`,
  };
}

/**
 * Decide whether migrate:prod may apply SQL.
 * - Non-prod: always allow.
 * - Prod + approval: allow.
 * - Prod + no approval + pending>0: block (caller should exit 1).
 * - Prod + no approval + pending=0: allow no-op success (skip apply).
 */
export function evaluateProdMigrateGate(input: {
  isProduction: boolean;
  approval: ProdMigrateApproval;
  pendingCount: number;
}): { allowApply: boolean; exitCode: number; message: string } {
  if (!input.isProduction) {
    return {
      allowApply: true,
      exitCode: 0,
      message: "non-production: migrate apply allowed",
    };
  }
  if (input.approval.approved) {
    return {
      allowApply: true,
      exitCode: 0,
      message: `production: migrate apply allowed (${input.approval.reason})`,
    };
  }
  if (input.pendingCount > 0) {
    return {
      allowApply: false,
      exitCode: 1,
      message:
        `production: BLOCKED ${input.pendingCount} pending migration(s) without CEO approval. ` +
        `Set NELVYON_PROD_MIGRATE_APPROVED=1 + NELVYON_PROD_MIGRATE_APPROVED_BY=<name> ` +
        `(optional NELVYON_PROD_MIGRATE_COMMIT_SHA=<tip>) for a single deploy window, then unset. ` +
        `Denial: ${input.approval.reason}`,
    };
  }
  return {
    allowApply: false,
    exitCode: 0,
    message:
      "production: no pending migrations; skip apply (gate active, no CEO approval required for no-op)",
  };
}
