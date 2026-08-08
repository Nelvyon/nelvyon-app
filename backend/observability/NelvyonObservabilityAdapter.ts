/**
 * NELVYON observability adapter — contracts over optional external monitors.
 * Does NOT vendor louislam/uptime-kuma or prometheus/prometheus source trees.
 * Prefer existing /api/health* + staging smokes + Railway; optional Uptime Kuma URL only.
 */

export type ObservabilityToolId = "uptime-kuma" | "prometheus";

export type ProbeTarget = {
  id: string;
  path: string;
  purpose: string;
  expectedStatus: number;
};

export type ObservabilityPlan = {
  id: ObservabilityToolId;
  enabled: boolean;
  decision: "integrado_parcial" | "sustituido";
  purpose: string;
  license: string;
  invoke: "ops_optional" | "platform" | "none";
  existingNelvyon: string[];
  rollback: string;
  resourceImpact: { ramMb: number; diskMb: number; services: number };
};

const FLAG = (name: string, def = "0") => (process.env[name] ?? def) !== "0";

/** Canonical HTTP probes already shipping in Nest/Next (no new process). */
export function getNelvyonProbeTargets(baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""): ProbeTarget[] {
  const base = baseUrl.replace(/\/$/, "");
  const prefix = base || "";
  return [
    { id: "health", path: `${prefix}/api/health`, purpose: "liveness lightweight", expectedStatus: 200 },
    { id: "live", path: `${prefix}/api/health/live`, purpose: "k8s/Railway live", expectedStatus: 200 },
    { id: "ready", path: `${prefix}/api/health/ready`, purpose: "readiness deps", expectedStatus: 200 },
    { id: "deep", path: `${prefix}/api/health/deep`, purpose: "deep dependency check", expectedStatus: 200 },
  ];
}

export function getObservabilityPlans(): ObservabilityPlan[] {
  return [
    {
      id: "uptime-kuma",
      enabled: FLAG("NELVYON_UPTIME_KUMA_ENABLED", "0"),
      decision: "integrado_parcial",
      purpose:
        "Optional external status-page host; Nelvyon exposes probe targets via adapter — no in-repo Kuma Docker stack",
      license: "MIT",
      invoke: "ops_optional",
      existingNelvyon: [
        "/api/health*",
        "scripts/run-staging-p0-smokes.mjs",
        "Railway healthchecks",
      ],
      rollback: "Set NELVYON_UPTIME_KUMA_ENABLED=0 and unset NELVYON_UPTIME_KUMA_URL",
      resourceImpact: { ramMb: 0, diskMb: 0, services: 0 },
    },
    {
      id: "prometheus",
      enabled: false,
      decision: "sustituido",
      purpose: "Full Prometheus TSDB not required — Railway metrics + health/deep + CI smokes cover ops",
      license: "Apache-2.0",
      invoke: "none",
      existingNelvyon: ["Railway metrics", "/api/health/deep", "GitHub Actions staging smokes"],
      rollback: "N/A — not deployed",
      resourceImpact: { ramMb: 0, diskMb: 0, services: 0 },
    },
  ];
}

export function getOptionalUptimeKumaUrl(): string | null {
  const url = (process.env.NELVYON_UPTIME_KUMA_URL ?? "").trim();
  if (!FLAG("NELVYON_UPTIME_KUMA_ENABLED", "0")) return null;
  return url || null;
}

/** Export monitor blueprint for ops to paste into Uptime Kuma UI (no vendor runtime). */
export function buildUptimeKumaMonitorBlueprint(baseUrl?: string): {
  monitors: Array<{ name: string; type: "http"; url: string; intervalSec: number }>;
  pushUrlConfigured: boolean;
} {
  const targets = getNelvyonProbeTargets(baseUrl);
  return {
    monitors: targets.map((t) => ({
      name: `nelvyon-${t.id}`,
      type: "http" as const,
      url: t.path,
      intervalSec: 60,
    })),
    pushUrlConfigured: Boolean(getOptionalUptimeKumaUrl()),
  };
}

export function assertObservabilityBlock2Contract(): { ok: boolean; violations: string[] } {
  const plans = getObservabilityPlans();
  const violations: string[] = [];
  if (!plans.some((p) => p.id === "uptime-kuma" && p.decision === "integrado_parcial")) {
    violations.push("uptime_kuma_must_be_parcial");
  }
  if (!plans.some((p) => p.id === "prometheus" && p.decision === "sustituido")) {
    violations.push("prometheus_must_be_sustituido");
  }
  for (const p of plans) {
    if (!p.license) violations.push(`${p.id}_missing_license`);
    if (!p.rollback) violations.push(`${p.id}_missing_rollback`);
  }
  const probes = getNelvyonProbeTargets("https://app.nelvyon.com");
  if (probes.length < 4) violations.push("missing_probe_coverage");
  return { ok: violations.length === 0, violations };
}
