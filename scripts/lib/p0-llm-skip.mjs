/**
 * Honest P0 gate helper: when prod/staging IA is intentionally OFF,
 * pack kickoff returns 503 LLM_NOT_CONFIGURED. That is SKIP — not FAIL.
 * Exit 78 (EX_CONFIG). Orchestrator treats it as SKIP unless P0_REQUIRE_PACK_E2E=1.
 */
export const P0_SKIP_IA_OFF_EXIT = 78;

/**
 * @param {number} status
 * @param {string} body
 * @returns {boolean}
 */
export function isLlmNotConfiguredResponse(status, body) {
  if (status !== 503 && status !== 422) return false;
  const text = String(body || "");
  return text.includes("LLM_NOT_CONFIGURED") || text.includes("Pack LLM no configurado");
}

/**
 * Log + exit when LLM is intentionally absent (IA OFF / no mesh).
 * @param {string} smokeName
 * @param {number} status
 * @param {string} body
 * @returns {never}
 */
export function exitSkipIaOff(smokeName, status, body) {
  console.log(
    `SKIP_IA_OFF [${smokeName}] HTTP ${status} LLM_NOT_CONFIGURED — pack E2E deferred until CEO IA canary (no OpenAI/OpenClaw activation)`,
  );
  if (body) console.log(`detail=${String(body).slice(0, 180)}`);
  process.exit(P0_SKIP_IA_OFF_EXIT);
}
