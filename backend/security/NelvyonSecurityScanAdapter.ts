/**
 * NELVYON security scanner adapter — contracts over external tools (Gitleaks, Trivy).
 * Does NOT vendor aquasecurity/trivy or gitleaks source trees.
 * Tools run in CI or as optional local CLI; feature flags control enablement.
 */

export type SecurityScannerId = "gitleaks" | "trivy";

export type SecurityScanPlan = {
  id: SecurityScannerId;
  enabled: boolean;
  purpose: string;
  license: string;
  invoke: "ci" | "cli" | "both";
  ciJob: string;
  localCommand: string;
  rollback: string;
  alreadyInNelvyon: boolean;
};

const FLAG = (name: string, def = "1") => (process.env[name] ?? def) !== "0";

/** Declarative scan plan — single source of truth for Labs block 1. */
export function getSecurityScanPlans(): SecurityScanPlan[] {
  return [
    {
      id: "gitleaks",
      enabled: FLAG("NELVYON_GITLEAKS_ENABLED", "1"),
      purpose: "Detect secrets in git history and working tree before merge",
      license: "MIT",
      invoke: "both",
      ciJob: "secret-scan (gitleaks/gitleaks-action@v2)",
      localCommand: "gitleaks detect --source . --verbose",
      rollback: "Set NELVYON_GITLEAKS_ENABLED=0 and/or disable secret-scan job",
      alreadyInNelvyon: true,
    },
    {
      id: "trivy",
      enabled: FLAG("NELVYON_TRIVY_ENABLED", "1"),
      purpose: "Filesystem/dependency vulnerability scan (CRITICAL/HIGH) for apps/web",
      license: "Apache-2.0",
      invoke: "both",
      ciJob: "trivy-fs (aquasecurity/trivy-action)",
      localCommand: "trivy fs --severity CRITICAL,HIGH --exit-code 1 apps/web",
      rollback: "Set NELVYON_TRIVY_ENABLED=0 and/or disable trivy-fs job",
      alreadyInNelvyon: false,
    },
  ];
}

export function getEnabledSecurityScanners(): SecurityScannerId[] {
  return getSecurityScanPlans().filter((p) => p.enabled).map((p) => p.id);
}

export function assertSecurityBlock1Contract(): { ok: boolean; violations: string[] } {
  const plans = getSecurityScanPlans();
  const violations: string[] = [];
  if (!plans.some((p) => p.id === "gitleaks")) violations.push("missing_gitleaks_plan");
  if (!plans.some((p) => p.id === "trivy")) violations.push("missing_trivy_plan");
  for (const p of plans) {
    if (!p.license) violations.push(`${p.id}_missing_license`);
    if (!p.ciJob) violations.push(`${p.id}_missing_ci`);
    if (!p.rollback) violations.push(`${p.id}_missing_rollback`);
  }
  return { ok: violations.length === 0, violations };
}
