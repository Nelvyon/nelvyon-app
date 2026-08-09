/**
 * Decisión de veredicto de la certificación autónoma de workforce.
 *
 * Extraída de `run-workforce-cert.mjs` SIN cambiar su comportamiento: el script
 * ejecuta typecheck, build y soak, así que la política no era testeable de
 * forma unitaria. Aquí vive solo la decisión, como función pura, para poder
 * blindarla con tests de regresión.
 *
 * INVARIANTES QUE PROTEGE
 * -----------------------
 *   - `certified: true` exige evidencia live REAL: `ollama_live.ok === true` y
 *     `rag_live.ok === true`. Da igual cómo esté marcado `required`: declarar un
 *     entorno sin IA local NO puede convertir "8 de 8 requeridos" en un PASS.
 *   - `NELVYON_WORKFORCE_FORCE_PASS=1` se rechaza siempre y nunca certifica.
 *   - Un `required` fallido nunca produce PASS.
 *   - Un skip nunca produce certificación.
 *   - Declarar los pasos live como no requeridos no convierte `ok:false` en
 *     `ok:true` ni en skip: los pasos se registran igual y el blocker
 *     `live_evidence_missing_cert_not_claimed` queda anotado.
 */

/** Pasos cuya evidencia live es condición necesaria de la certificación. */
export const LIVE_EVIDENCE_STEP_IDS = ["ollama_live", "rag_live"];

export const LIVE_EVIDENCE_MISSING_BLOCKER = "live_evidence_missing_cert_not_claimed";
export const FORCE_PASS_BLOCKER = "force_pass_rejected";

/**
 * @param {{
 *   steps: Array<{ id: string, required: boolean, ok: boolean, detail?: string }>,
 *   skipped: Array<{ id: string, reason?: string }>,
 *   forcePass: boolean,
 * }} input
 * @returns {{
 *   verdict: "PASS" | "CONDITIONAL_PASS" | "FAIL",
 *   certified: boolean,
 *   rationale: string,
 *   blockers: string[],
 *   requiredOk: boolean,
 *   liveEvidenceOk: boolean,
 *   internalBlockers: string[],
 *   exitCode: 0 | 1,
 * }}
 */
export function decideWorkforceVerdict({ steps = [], skipped = [], forcePass = false }) {
  const blockers = [];
  if (forcePass) blockers.push(FORCE_PASS_BLOCKER);

  const required = steps.filter((s) => s.required);
  const requiredOk = required.every((s) => s.ok);
  const internalBlockers = required.filter((s) => !s.ok).map((s) => s.id);
  if (internalBlockers.length) blockers.push(...internalBlockers);

  /**
   * Se evalúa sobre `ok`, NUNCA sobre `required`. Ese es el punto: en CI los
   * pasos live pueden declararse no requeridos, pero su `ok:false` sigue
   * impidiendo la certificación.
   */
  const liveEvidenceOk = LIVE_EVIDENCE_STEP_IDS.every(
    (id) => steps.find((s) => s.id === id)?.ok === true,
  );
  if (!liveEvidenceOk) blockers.push(LIVE_EVIDENCE_MISSING_BLOCKER);

  let verdict = "FAIL";
  let certified = false;
  let rationale = "Required workforce gates failed.";

  if (forcePass) {
    verdict = "FAIL";
    rationale = "NELVYON_WORKFORCE_FORCE_PASS is forbidden; cert must be earned.";
  } else if (requiredOk && liveEvidenceOk && skipped.length === 0 && internalBlockers.length === 0) {
    verdict = "PASS";
    certified = true;
    rationale =
      "All required internal gates passed with live Ollama/RAG evidence, OpenClaw mock certified, production build, soak, workflow audit, and residual evals. External notes are Phase-1/ops residuals not blocking workforce cert.";
  } else if (requiredOk && skipped.length > 0) {
    verdict = "CONDITIONAL_PASS";
    certified = false;
    rationale = `Required steps OK but skipped=${skipped.length} (e.g. SKIP_BUILD). PASS requires skipped=0.`;
    blockers.push(...skipped.map((s) => `skipped:${s.id}`));
  } else if (required.some((s) => s.ok)) {
    verdict = "CONDITIONAL_PASS";
    certified = false;
    rationale = "Partial: some required steps failed or live evidence incomplete.";
  }

  const exitCode = certified || (requiredOk && verdict === "CONDITIONAL_PASS") ? 0 : 1;

  return {
    verdict,
    certified,
    rationale,
    blockers,
    requiredOk,
    liveEvidenceOk,
    internalBlockers,
    exitCode,
  };
}
