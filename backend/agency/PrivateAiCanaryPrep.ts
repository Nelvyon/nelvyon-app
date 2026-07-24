/**
 * Private AI productive canary — PREP ONLY (Block 25). Do NOT activate.
 *
 * This module never turns anything on. It defines the checklist a real production
 * canary would need to pass, a staging drill that verifies prod-dangerous flags stay
 * OFF, and a hardcoded `isProductionCanaryAuthorized()` that always returns `false`.
 *
 * `NELVYON_AI_ENABLED` is never set here, and this file must never be wired into a
 * code path that flips it on production. See `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md`
 * (status `PENDING_CEO`) — distinct from the already-approved staging-only request in
 * `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md`.
 *
 * No OpenAI. No production activation. No Pepito data anywhere in this file.
 */

export type PrivateAiCanaryChecklistItemId =
  | "local_models_only"
  | "router_3b_8b_quality_routing"
  | "fail_closed_default"
  | "zero_api_budget"
  | "privacy_private_mode"
  | "tailscale_private_mesh"
  | "rag_evidence_required"
  | "audit_log"
  | "rollback_under_5min"
  | "kill_switch"
  | "load_test_criteria"
  | "exit_criteria_defined";

export type PrivateAiCanaryChecklistInput = {
  /** No OpenAI/paid API in the inference path — only Ollama-served local models. */
  localModelsOnly: boolean;
  /** 3b/8b quality-routing configured and certified (see router_certification_final.json). */
  routerQualityRoutingConfigured: boolean;
  /** Deterministic pre-LLM SecurityGuard + refuse-on-error verified fail-closed. */
  failClosedVerified: boolean;
  /** AUTONOMOUS_ALLOW_OPENAI=0 confirmed and no billing/spend key wired into the canary path. */
  zeroApiBudgetConfirmed: boolean;
  /** PRIVATE_MODE egress restriction (localhost/private LAN/allowlist only) verified. */
  privateModeEnforced: boolean;
  /** Ollama host resolves to Tailscale CGNAT/MagicDNS (or loopback in dev), never public. */
  tailscaleMeshVerified: boolean;
  /** PrivateVectorRagCore refuse-on-no-evidence contract verified (Block 24). */
  ragEvidenceGateVerified: boolean;
  /** Every canary action (request, decision, refusal) is written to an audit log. */
  auditLogImplemented: boolean;
  /** A documented, tested rollback procedure completes in under 5 minutes. */
  rollbackUnder5MinDocumented: boolean;
  /** A single env flag flip disables the entire canary path immediately. */
  killSwitchImplemented: boolean;
  /** Load test pass/fail thresholds (latency, error rate, concurrency) are defined. */
  loadTestCriteriaDefined: boolean;
  /** Explicit exit criteria (promote / hold / rollback) are written down in advance. */
  exitCriteriaDefined: boolean;
};

export type PrivateAiCanaryChecklistItemResult = {
  id: PrivateAiCanaryChecklistItemId;
  label: string;
  pass: boolean;
};

export type PrivateAiCanaryChecklistResult = {
  items: PrivateAiCanaryChecklistItemResult[];
  allPass: boolean;
  blockers: string[];
};

const CHECKLIST_LABELS: Record<PrivateAiCanaryChecklistItemId, string> = {
  local_models_only: "Local models only (no OpenAI, no paid API)",
  router_3b_8b_quality_routing: "Router 3b/8b quality routing certified",
  fail_closed_default: "Fail-closed by default (SecurityGuard + refuse-on-error)",
  zero_api_budget: "Zero API budget (AUTONOMOUS_ALLOW_OPENAI=0, no spend key wired)",
  privacy_private_mode: "PRIVATE_MODE egress restriction enforced",
  tailscale_private_mesh: "Tailscale private mesh only (no public Ollama endpoint)",
  rag_evidence_required: "RAG refuse-on-no-evidence gate verified",
  audit_log: "Full audit log of canary actions",
  rollback_under_5min: "Documented rollback completes in <5 minutes",
  kill_switch: "Single-flag kill switch implemented",
  load_test_criteria: "Load test pass/fail criteria defined",
  exit_criteria_defined: "Exit criteria (promote/hold/rollback) defined in advance",
};

/** Evaluates the 12-item production-canary readiness checklist from real, caller-provided evidence. */
export function evaluatePrivateAiCanaryChecklist(
  input: PrivateAiCanaryChecklistInput,
): PrivateAiCanaryChecklistResult {
  const entries: Array<[PrivateAiCanaryChecklistItemId, boolean]> = [
    ["local_models_only", input.localModelsOnly],
    ["router_3b_8b_quality_routing", input.routerQualityRoutingConfigured],
    ["fail_closed_default", input.failClosedVerified],
    ["zero_api_budget", input.zeroApiBudgetConfirmed],
    ["privacy_private_mode", input.privateModeEnforced],
    ["tailscale_private_mesh", input.tailscaleMeshVerified],
    ["rag_evidence_required", input.ragEvidenceGateVerified],
    ["audit_log", input.auditLogImplemented],
    ["rollback_under_5min", input.rollbackUnder5MinDocumented],
    ["kill_switch", input.killSwitchImplemented],
    ["load_test_criteria", input.loadTestCriteriaDefined],
    ["exit_criteria_defined", input.exitCriteriaDefined],
  ];

  const items: PrivateAiCanaryChecklistItemResult[] = entries.map(([id, pass]) => ({
    id,
    label: CHECKLIST_LABELS[id],
    pass,
  }));
  const blockers = items.filter((i) => !i.pass).map((i) => i.id);

  return { items, allPass: blockers.length === 0, blockers };
}

/**
 * ALWAYS false in this codebase. A future production canary requires BOTH:
 *  (1) an explicit, not-yet-defined production flag (does not exist in this repo today), AND
 *  (2) `docs/ops/CEO_IA_PROD_CANARY_REQUEST.md` status manually flipped from `PENDING_CEO`
 *      to an approved state by Daniel, followed by a manual code change to this function.
 * No input parameter, environment variable, or runtime flag can make this return `true`
 * today — there is intentionally no plumbing that reads any env var here.
 */
export function isProductionCanaryAuthorized(): false {
  return false;
}

const LOAD_TEST_MIN_CRITERIA = {
  maxP95LatencyMs: 8_000,
  maxErrorRatePct: 1,
  minSustainedConcurrency: 1,
} as const;

/** Reference load-test thresholds a canary would need to clear — informational, not enforced live. */
export function getPrivateAiCanaryLoadTestCriteria(): typeof LOAD_TEST_MIN_CRITERIA {
  return LOAD_TEST_MIN_CRITERIA;
}

const EXIT_CRITERIA = [
  "0 incidentes de fuga de datos entre tenants durante toda la ventana del canary.",
  "0 respuestas IA sin evidencia RAG citada cuando la pregunta requería contexto privado.",
  "P95 de latencia y tasa de error dentro de los umbrales de load test definidos.",
  "Recuperación exitosa ante al menos 1 fallo inyectado real (no solo simulado en tests).",
  "Rollback ensayado y completado en menos de 5 minutos durante un simulacro.",
  "Daniel revisa el audit trail exportado y confirma por escrito continuar o revertir.",
] as const;

export function getPrivateAiCanaryExitCriteria(): readonly string[] {
  return EXIT_CRITERIA;
}

function envFlagOn(name: string): boolean {
  const v = process.env[name]?.trim();
  return v === "1" || v?.toUpperCase() === "ON" || v?.toLowerCase() === "true";
}

/** Env flag that, if ever set, immediately disables any canary-adjacent code path. */
export function isCanaryKillSwitchEngaged(): boolean {
  return envFlagOn("NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH");
}

/**
 * Flags that must remain OFF/unset in every environment (including staging) until a
 * separate, explicit CEO-authorized production canary is approved and its own new
 * flag is introduced. None of these is set by this module.
 */
const PROD_DANGEROUS_FLAGS = [
  "AUTONOMOUS_ALLOW_OPENAI",
  "NELVYON_CEO_PARTNER_PAYOUTS",
  "NELVYON_MCP_PRODUCTIVE_ENABLED",
  "NELVYON_SHARED_MEMORY_ENABLED",
  "NELVYON_OPENCLAW_BRIDGE_ENABLED",
  "NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED",
] as const;

export const PRIVATE_AI_CANARY_ROLLBACK_FLAGS: readonly string[] = [
  "NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1  # immediate hard stop, any environment",
  "NELVYON_AI_ENABLED=0  # never set to 1 on production by this module",
  "AUTONOMOUS_ALLOW_OPENAI=0",
  "NELVYON_MCP_PRODUCTIVE_ENABLED=0",
  "NELVYON_SHARED_MEMORY_ENABLED=0",
  "NELVYON_OPENCLAW_BRIDGE_ENABLED=0",
  "NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0  # this flag does not exist in code yet — reserved name only",
];

export type StagingCanaryDrillResult = {
  ok: boolean;
  prodDangerousFlagsOff: boolean;
  offendingFlags: string[];
  killSwitchEngaged: boolean;
  checklist: PrivateAiCanaryChecklistResult;
  productionCanaryAuthorized: false;
  loadTestCriteria: typeof LOAD_TEST_MIN_CRITERIA;
  exitCriteria: readonly string[];
  rollbackFlags: readonly string[];
};

/**
 * Staging drill: evaluates the readiness checklist AND independently verifies that
 * every prod-dangerous flag is OFF in the current environment. `ok` requires the full
 * checklist to pass, no dangerous flag to be set, the kill switch to be disengaged,
 * and — always, structurally — `isProductionCanaryAuthorized() === false`.
 */
export function runStagingCanaryDrill(
  checklistInput: PrivateAiCanaryChecklistInput,
): StagingCanaryDrillResult {
  const checklist = evaluatePrivateAiCanaryChecklist(checklistInput);
  const offendingFlags = PROD_DANGEROUS_FLAGS.filter((f) => envFlagOn(f));
  const prodDangerousFlagsOff = offendingFlags.length === 0;
  const killSwitchEngaged = isCanaryKillSwitchEngaged();
  const productionCanaryAuthorized = isProductionCanaryAuthorized();

  return {
    ok: checklist.allPass && prodDangerousFlagsOff && !killSwitchEngaged && !productionCanaryAuthorized,
    prodDangerousFlagsOff,
    offendingFlags,
    killSwitchEngaged,
    checklist,
    productionCanaryAuthorized,
    loadTestCriteria: LOAD_TEST_MIN_CRITERIA,
    exitCriteria: EXIT_CRITERIA,
    rollbackFlags: PRIVATE_AI_CANARY_ROLLBACK_FLAGS,
  };
}

export function buildStagingCanaryDrillEvidenceMarkdown(result: StagingCanaryDrillResult): string {
  const lines: string[] = [
    "# Evidence — Private AI production canary PREP drill (staging, no activation)",
    "",
    `- ok: ${result.ok}`,
    `- productionCanaryAuthorized: ${result.productionCanaryAuthorized} (must always be false today)`,
    `- prodDangerousFlagsOff: ${result.prodDangerousFlagsOff}`,
    `- offendingFlags: ${result.offendingFlags.length ? result.offendingFlags.join(", ") : "none"}`,
    `- killSwitchEngaged: ${result.killSwitchEngaged}`,
    `- checklist allPass: ${result.checklist.allPass}`,
    "",
    "## Checklist",
    ...result.checklist.items.map((i) => `- [${i.pass ? "x" : " "}] ${i.label}`),
    "",
    "## Blockers",
    result.checklist.blockers.length ? result.checklist.blockers.map((b) => `- ${b}`).join("\n") : "- none",
    "",
    "## Rollback (any environment)",
    ...result.rollbackFlags.map((f) => `- ${f}`),
    "",
  ];
  return lines.join("\n");
}

export function assertPrivateAiCanaryPrepIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  if ((isProductionCanaryAuthorized() as unknown) !== false) {
    violations.push("production_canary_must_always_be_false");
  }

  const savedFlags: Record<string, string | undefined> = {};
  for (const f of PROD_DANGEROUS_FLAGS) {
    savedFlags[f] = process.env[f];
    process.env[f] = "1";
  }
  const stillFalse = isProductionCanaryAuthorized();
  for (const f of PROD_DANGEROUS_FLAGS) {
    if (savedFlags[f] === undefined) delete process.env[f];
    else process.env[f] = savedFlags[f];
  }
  if ((stillFalse as unknown) !== false) {
    violations.push("production_canary_must_stay_false_even_if_dangerous_flags_are_set");
  }

  const bestCase = evaluatePrivateAiCanaryChecklist({
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
  });
  if (!bestCase.allPass) violations.push("best_case_checklist_should_pass");
  if (bestCase.items.length !== 12) violations.push("expected_12_checklist_items");

  if (getPrivateAiCanaryExitCriteria().length === 0) violations.push("exit_criteria_must_be_defined");
  if (PRIVATE_AI_CANARY_ROLLBACK_FLAGS.length === 0) violations.push("rollback_flags_must_be_defined");
  if (LOAD_TEST_MIN_CRITERIA.maxP95LatencyMs <= 0) violations.push("load_test_criteria_must_be_sane");

  if (PRIVATE_AI_CANARY_ROLLBACK_FLAGS.some((f) => f.toLowerCase().includes("pepito"))) {
    violations.push("rollback_flags_must_never_reference_pepito");
  }

  return { ok: violations.length === 0, violations };
}
