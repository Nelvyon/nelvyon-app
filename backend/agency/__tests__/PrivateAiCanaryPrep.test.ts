import { afterEach, describe, expect, it } from "vitest";
import {
  PRIVATE_AI_CANARY_ROLLBACK_FLAGS,
  assertPrivateAiCanaryPrepIntegrity,
  buildStagingCanaryDrillEvidenceMarkdown,
  checkOllamaHostForCanaryDrill,
  evaluatePrivateAiCanaryChecklist,
  getPrivateAiCanaryExitCriteria,
  getPrivateAiCanaryLoadTestCriteria,
  isCanaryKillSwitchEngaged,
  isProductionCanaryAuthorized,
  runStagingCanaryDrill,
  type PrivateAiCanaryChecklistInput,
} from "../PrivateAiCanaryPrep";

const OLLAMA_HOST_ALIASES = ["OLLAMA_HOST", "OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "LOCAL_AI_BASE_URL"];
function clearOllamaHostAliases(): void {
  for (const k of OLLAMA_HOST_ALIASES) delete process.env[k];
}

const ALL_TRUE_CHECKLIST: PrivateAiCanaryChecklistInput = {
  localModelsOnly: true,
  routerQualityRoutingConfigured: true,
  failClosedVerified: true,
  zeroApiBudgetConfirmed: true,
  privateModeEnforced: true,
  tailscaleMeshVerified: true,
  ragEvidenceGateVerified: true,
  auditLogImplemented: true,
  rollbackUnder5MinDocumented: true,
  killSwitchImplemented: true,
  loadTestCriteriaDefined: true,
  exitCriteriaDefined: true,
};

const ALL_FALSE_CHECKLIST: PrivateAiCanaryChecklistInput = {
  localModelsOnly: false,
  routerQualityRoutingConfigured: false,
  failClosedVerified: false,
  zeroApiBudgetConfirmed: false,
  privateModeEnforced: false,
  tailscaleMeshVerified: false,
  ragEvidenceGateVerified: false,
  auditLogImplemented: false,
  rollbackUnder5MinDocumented: false,
  killSwitchImplemented: false,
  loadTestCriteriaDefined: false,
  exitCriteriaDefined: false,
};

const DANGEROUS_FLAGS = [
  "AUTONOMOUS_ALLOW_OPENAI",
  "NELVYON_CEO_PARTNER_PAYOUTS",
  "NELVYON_MCP_PRODUCTIVE_ENABLED",
  "NELVYON_SHARED_MEMORY_ENABLED",
  "NELVYON_OPENCLAW_BRIDGE_ENABLED",
  "NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED",
  "NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH",
];

function clearDangerousFlags(): void {
  for (const f of DANGEROUS_FLAGS) delete process.env[f];
  clearOllamaHostAliases();
}

describe("PrivateAiCanaryPrep — isProductionCanaryAuthorized is always false", () => {
  afterEach(clearDangerousFlags);

  it("returns false with no environment variables set", () => {
    clearDangerousFlags();
    expect(isProductionCanaryAuthorized()).toBe(false);
  });

  it("returns false even when every prod-dangerous flag is set to 1", () => {
    for (const f of DANGEROUS_FLAGS) process.env[f] = "1";
    expect(isProductionCanaryAuthorized()).toBe(false);
  });

  it("returns false even under a hypothetical future flag name — no plumbing reads any env var here", () => {
    process.env.NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED = "1";
    process.env.NELVYON_AI_ENABLED = "1";
    expect(isProductionCanaryAuthorized()).toBe(false);
    delete process.env.NELVYON_AI_ENABLED;
  });
});

describe("PrivateAiCanaryPrep — checklist evaluation", () => {
  it("all-true input passes with zero blockers", () => {
    const result = evaluatePrivateAiCanaryChecklist(ALL_TRUE_CHECKLIST);
    expect(result.allPass).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.items.length).toBe(12);
  });

  it("all-false input fails with all 12 items as blockers", () => {
    const result = evaluatePrivateAiCanaryChecklist(ALL_FALSE_CHECKLIST);
    expect(result.allPass).toBe(false);
    expect(result.blockers.length).toBe(12);
  });

  it("a single false item is reported as the sole blocker", () => {
    const result = evaluatePrivateAiCanaryChecklist({ ...ALL_TRUE_CHECKLIST, killSwitchImplemented: false });
    expect(result.allPass).toBe(false);
    expect(result.blockers).toEqual(["kill_switch"]);
  });

  it("covers all 12 required categories from the spec", () => {
    const result = evaluatePrivateAiCanaryChecklist(ALL_TRUE_CHECKLIST);
    const ids = result.items.map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "local_models_only",
        "router_3b_8b_quality_routing",
        "fail_closed_default",
        "zero_api_budget",
        "privacy_private_mode",
        "tailscale_private_mesh",
        "rag_evidence_required",
        "audit_log",
        "rollback_under_5min",
        "kill_switch",
        "load_test_criteria",
        "exit_criteria_defined",
      ]),
    );
  });
});

describe("PrivateAiCanaryPrep — staging drill validates prod-dangerous flags OFF", () => {
  afterEach(clearDangerousFlags);

  it("passes when checklist is all-true and no dangerous flag is set", () => {
    clearDangerousFlags();
    const result = runStagingCanaryDrill(ALL_TRUE_CHECKLIST);
    expect(result.ok).toBe(true);
    expect(result.prodDangerousFlagsOff).toBe(true);
    expect(result.offendingFlags).toEqual([]);
    expect(result.productionCanaryAuthorized).toBe(false);
    expect(result.killSwitchEngaged).toBe(false);
  });

  it("fails when checklist is incomplete even if flags are clean", () => {
    clearDangerousFlags();
    const result = runStagingCanaryDrill(ALL_FALSE_CHECKLIST);
    expect(result.ok).toBe(false);
    expect(result.checklist.allPass).toBe(false);
  });

  it("detects each individual prod-dangerous flag when set", () => {
    for (const flag of [
      "AUTONOMOUS_ALLOW_OPENAI",
      "NELVYON_CEO_PARTNER_PAYOUTS",
      "NELVYON_MCP_PRODUCTIVE_ENABLED",
      "NELVYON_SHARED_MEMORY_ENABLED",
      "NELVYON_OPENCLAW_BRIDGE_ENABLED",
    ]) {
      clearDangerousFlags();
      process.env[flag] = "1";
      const result = runStagingCanaryDrill(ALL_TRUE_CHECKLIST);
      expect(result.ok).toBe(false);
      expect(result.offendingFlags).toContain(flag);
    }
  });

  it("kill switch engagement blocks ok=true even with a perfect checklist", () => {
    clearDangerousFlags();
    process.env.NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH = "1";
    const result = runStagingCanaryDrill(ALL_TRUE_CHECKLIST);
    expect(isCanaryKillSwitchEngaged()).toBe(true);
    expect(result.killSwitchEngaged).toBe(true);
    expect(result.ok).toBe(false);
  });

  it("evidence markdown includes checklist, blockers, and rollback flags", () => {
    clearDangerousFlags();
    const result = runStagingCanaryDrill(ALL_TRUE_CHECKLIST);
    const md = buildStagingCanaryDrillEvidenceMarkdown(result);
    expect(md).toContain("Private AI production canary PREP drill");
    expect(md).toContain("productionCanaryAuthorized: false");
    expect(md).toContain("## Rollback");
    expect(md).toContain("ollamaHostCheck:");
  });
});

describe("PrivateAiCanaryPrep — checkOllamaHostForCanaryDrill (live env check)", () => {
  afterEach(clearOllamaHostAliases);

  it("is not applicable and passes when OLLAMA_HOST (and aliases) are unset — today's staging state", () => {
    clearOllamaHostAliases();
    const result = checkOllamaHostForCanaryDrill();
    expect(result.applicable).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.host).toBeNull();
  });

  it("fails when OLLAMA_HOST is a public address (never trust a self-reported checklist claim)", () => {
    clearOllamaHostAliases();
    process.env.OLLAMA_HOST = "http://198.51.100.7:11434";
    const result = checkOllamaHostForCanaryDrill();
    expect(result.applicable).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("OLLAMA_HOST_not_tailscale_mesh");
  });

  it("passes when OLLAMA_HOST is a Tailscale MagicDNS host (*.ts.net)", () => {
    clearOllamaHostAliases();
    process.env.OLLAMA_HOST = "http://nelvyon-box.ts.net:11434";
    const result = checkOllamaHostForCanaryDrill();
    expect(result.applicable).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("passes when OLLAMA_HOST is a Tailscale CGNAT IPv4 (100.64.0.0/10)", () => {
    clearOllamaHostAliases();
    process.env.OLLAMA_HOST = "http://100.101.102.103:11434";
    const result = checkOllamaHostForCanaryDrill();
    expect(result.applicable).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("fails for loopback even in a dev-like environment — the drill is deliberately stricter than default dev rules", () => {
    clearOllamaHostAliases();
    process.env.OLLAMA_HOST = "http://localhost:11434";
    const result = checkOllamaHostForCanaryDrill();
    expect(result.applicable).toBe(true);
    expect(result.ok).toBe(false);
  });
});

describe("PrivateAiCanaryPrep — staging drill is gated by the live Ollama host check", () => {
  afterEach(() => {
    clearDangerousFlags();
  });

  it("a perfect checklist still fails the drill if OLLAMA_HOST points to a public host", () => {
    clearDangerousFlags();
    process.env.OLLAMA_HOST = "http://198.51.100.7:11434";
    const result = runStagingCanaryDrill(ALL_TRUE_CHECKLIST);
    expect(result.ollamaHostCheck.applicable).toBe(true);
    expect(result.ollamaHostCheck.ok).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("a perfect checklist with no OLLAMA_HOST set still passes (today's real staging state)", () => {
    clearDangerousFlags();
    const result = runStagingCanaryDrill(ALL_TRUE_CHECKLIST);
    expect(result.ollamaHostCheck.applicable).toBe(false);
    expect(result.ollamaHostCheck.ok).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("a perfect checklist with a Tailscale MagicDNS OLLAMA_HOST passes", () => {
    clearDangerousFlags();
    process.env.OLLAMA_HOST = "http://nelvyon-box.ts.net:11434";
    const result = runStagingCanaryDrill(ALL_TRUE_CHECKLIST);
    expect(result.ollamaHostCheck.ok).toBe(true);
    expect(result.ok).toBe(true);
  });
});

describe("PrivateAiCanaryPrep — load test criteria, exit criteria, rollback", () => {
  it("exposes sane load test thresholds", () => {
    const criteria = getPrivateAiCanaryLoadTestCriteria();
    expect(criteria.maxP95LatencyMs).toBeGreaterThan(0);
    expect(criteria.maxErrorRatePct).toBeGreaterThan(0);
    expect(criteria.minSustainedConcurrency).toBeGreaterThan(0);
  });

  it("exposes a non-empty exit-criteria list", () => {
    expect(getPrivateAiCanaryExitCriteria().length).toBeGreaterThan(0);
  });

  it("rollback flags list is non-empty and never references Pepito", () => {
    expect(PRIVATE_AI_CANARY_ROLLBACK_FLAGS.length).toBeGreaterThan(0);
    expect(PRIVATE_AI_CANARY_ROLLBACK_FLAGS.some((f) => f.toLowerCase().includes("pepito"))).toBe(false);
    expect(PRIVATE_AI_CANARY_ROLLBACK_FLAGS.some((f) => f.includes("NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH"))).toBe(
      true,
    );
  });
});

describe("PrivateAiCanaryPrep — integrity self-assertion", () => {
  afterEach(clearDangerousFlags);

  it("passes assertPrivateAiCanaryPrepIntegrity()", () => {
    expect(assertPrivateAiCanaryPrepIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
