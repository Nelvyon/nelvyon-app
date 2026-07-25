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

import { assertOllamaHostSafeForRuntime } from "../local-ai/OllamaRuntimePrep";

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

export type OllamaHostCheckResult = {
  /** True only when OLLAMA_HOST (or an alias — see OllamaRuntimePrep.readOllamaBaseUrl) is actually set. */
  applicable: boolean;
  /** True when not applicable, OR when the configured host is loopback (allowed in non-prod) or a real Tailscale CGNAT/MagicDNS host. Never true for a public host. */
  ok: boolean;
  reason: string;
  host: string | null;
};

/**
 * Real, live check of `OLLAMA_HOST` (or its aliases) against
 * `OllamaRuntimePrep.assertOllamaHostSafeForRuntime()` — the same Tailscale
 * CGNAT/MagicDNS allowlist used by the mesh Option A staging path. Staging
 * today runs with no `OLLAMA_HOST` set (see `CEO_IA_STAGING_APPROVAL_REQUEST.md`
 * — "sin OLLAMA_HOST"), so `applicable=false` is the expected, passing state.
 * If a future staging/production run ever sets `OLLAMA_HOST` to a public host,
 * this fails the drill (`ok=false`) instead of silently trusting the
 * self-reported `tailscaleMeshVerified` checklist boolean.
 */
export function checkOllamaHostForCanaryDrill(): OllamaHostCheckResult {
  // Deliberately explicit (not relying on NODE_ENV/RAILWAY_ENVIRONMENT defaults) —
  // a staging canary drill must always be strict about the mesh requirement,
  // regardless of what environment the drill itself happens to run in (e.g. a
  // developer's laptop running the test suite with NODE_ENV=test).
  const safety = assertOllamaHostSafeForRuntime({ requirePrivateMesh: true, allowLoopback: false });
  if (safety.reason === "OLLAMA_HOST_unset") {
    return { applicable: false, ok: true, reason: safety.reason, host: null };
  }
  return { applicable: true, ok: safety.ok, reason: safety.reason, host: safety.host };
}

export type StagingCanaryDrillResult = {
  ok: boolean;
  prodDangerousFlagsOff: boolean;
  offendingFlags: string[];
  killSwitchEngaged: boolean;
  checklist: PrivateAiCanaryChecklistResult;
  productionCanaryAuthorized: false;
  ollamaHostCheck: OllamaHostCheckResult;
  loadTestCriteria: typeof LOAD_TEST_MIN_CRITERIA;
  exitCriteria: readonly string[];
  rollbackFlags: readonly string[];
};

/**
 * Staging drill: evaluates the readiness checklist AND independently verifies that
 * every prod-dangerous flag is OFF in the current environment, plus (live, not
 * self-reported) that any configured `OLLAMA_HOST` is a private Tailscale mesh
 * host. `ok` requires the full checklist to pass, no dangerous flag to be set,
 * the kill switch to be disengaged, the live Ollama host check to pass, and —
 * always, structurally — `isProductionCanaryAuthorized() === false`.
 */
export function runStagingCanaryDrill(
  checklistInput: PrivateAiCanaryChecklistInput,
): StagingCanaryDrillResult {
  const checklist = evaluatePrivateAiCanaryChecklist(checklistInput);
  const offendingFlags = PROD_DANGEROUS_FLAGS.filter((f) => envFlagOn(f));
  const prodDangerousFlagsOff = offendingFlags.length === 0;
  const killSwitchEngaged = isCanaryKillSwitchEngaged();
  const productionCanaryAuthorized = isProductionCanaryAuthorized();
  const ollamaHostCheck = checkOllamaHostForCanaryDrill();

  return {
    ok:
      checklist.allPass &&
      prodDangerousFlagsOff &&
      !killSwitchEngaged &&
      !productionCanaryAuthorized &&
      ollamaHostCheck.ok,
    prodDangerousFlagsOff,
    offendingFlags,
    killSwitchEngaged,
    checklist,
    productionCanaryAuthorized,
    ollamaHostCheck,
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
    `- ollamaHostCheck: applicable=${result.ollamaHostCheck.applicable} ok=${result.ollamaHostCheck.ok} reason=${result.ollamaHostCheck.reason}`,
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

  // Live OLLAMA_HOST check — save/restore every alias so this integrity check
  // never leaks state into other tests/processes.
  const OLLAMA_HOST_ALIASES = ["OLLAMA_HOST", "OLLAMA_BASE_URL", "NELVYON_LOCAL_AI_URL", "LOCAL_AI_BASE_URL"];
  const savedOllama: Record<string, string | undefined> = {};
  for (const k of OLLAMA_HOST_ALIASES) savedOllama[k] = process.env[k];
  for (const k of OLLAMA_HOST_ALIASES) delete process.env[k];

  const unsetCheck = checkOllamaHostForCanaryDrill();
  if (unsetCheck.applicable !== false || unsetCheck.ok !== true) {
    violations.push("ollama_host_unset_must_be_applicable_false_and_ok_true");
  }

  process.env.OLLAMA_HOST = "http://198.51.100.7:11434"; // public TEST-NET-2 address, never a real host
  const publicHostCheck = checkOllamaHostForCanaryDrill();
  if (publicHostCheck.applicable !== true || publicHostCheck.ok !== false) {
    violations.push("public_ollama_host_must_be_applicable_true_and_ok_false");
  }

  process.env.OLLAMA_HOST = "http://foo.ts.net:11434";
  const meshHostCheck = checkOllamaHostForCanaryDrill();
  if (meshHostCheck.applicable !== true || meshHostCheck.ok !== true) {
    violations.push("tailscale_magicdns_ollama_host_must_pass");
  }

  for (const k of OLLAMA_HOST_ALIASES) {
    if (savedOllama[k] === undefined) delete process.env[k];
    else process.env[k] = savedOllama[k];
  }

  // A staging drill with a public OLLAMA_HOST must never report ok=true, even
  // if every other checklist item is perfect — the live host check must gate it.
  process.env.OLLAMA_HOST = "http://198.51.100.7:11434";
  const drillWithPublicHost = runStagingCanaryDrill({
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
  delete process.env.OLLAMA_HOST;
  if (drillWithPublicHost.ok !== false) {
    violations.push("staging_drill_must_fail_when_ollama_host_is_public_even_if_checklist_is_perfect");
  }

  return { ok: violations.length === 0, violations };
}
