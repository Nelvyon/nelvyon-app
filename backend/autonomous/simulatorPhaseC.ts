/** Phase C simulator — LLM + offline QA + output bundle + Phase L template learning */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLlmMode } from "./llm/llmAdapter";
import {
  LLM_BUDGET_DEGRADED_MODEL,
  configuredLlmBudgetMs,
  hasBudgetForAnotherAttempt,
  llmBudgetDegradationReason,
  markLlmBudgetExhausted,
  runWithLlmBudget,
  wasLlmBudgetExhausted,
} from "./llm/llmBudget";
import { executePipelinePhaseC, initPhaseCProject } from "./pipelines/runPipelinePhaseC";
import { buildOsPublishPayload } from "./publish/osPublishPayload";
import { isAutonomousProductionPublish } from "./publish/productionDeliverableUrls";
import { requiresOperatorEscalation } from "./sectors/sectorQa";
import { pickPipelineTemplate, skuToTemplateContext } from "./templates/pipelineTemplateSelector";
import { recordPostQaOutcome } from "./templates/recordPostQaOutcome";
import type {
  AutonomousSector,
  AutonomousSku,
  AutonomousTier,
  PhaseCOutputBundle,
  PhaseCResult,
  QaResult,
  RetryHistoryEntry,
} from "./types";

export interface PhaseCOptions {
  sku: AutonomousSku;
  tier?: AutonomousTier;
  brief: Record<string, unknown>;
  /** Phase E — explicit sector or inferred from brief.sector */
  sector?: AutonomousSector | string | null;
  os_refs?: {
    client_id: string;
    project_slug: string;
    workspace_id: string;
  };
  output_dir?: string;
  /** Phase L — path to rankings.json override */
  rankings_path?: string;
}

const DEFAULT_OS_REFS = {
  client_id: "os_client_sim_0001",
  project_slug: "PHASE-C-AUTONOMOUS",
  workspace_id: "ws_sim_0001",
};

const QA_PASS_THRESHOLD = 85;

/** Prefijo de los checks que se calculan solo sobre el brief de entrada. */
const BRIEF_CONTRACT_CHECK_PREFIX = "BRIEF-";

/**
 * `true` si el fallo viene del contrato del brief, no de la generación.
 *
 * Un `BRIEF-*` bloqueante es determinista: el brief no cambia entre intentos,
 * así que ningún reintento puede corregirlo. Cualquier otro fallo se considera
 * transitorio y conserva su política de reintento.
 */
export function tieneFalloDeContratoDeEntrada(qa: QaResult | null | undefined): boolean {
  const checks = qa?.checks ?? [];
  return checks.some(
    (c) => c.blocking === true && !c.passed && String(c.id).startsWith(BRIEF_CONTRACT_CHECK_PREFIX),
  );
}

export async function simulatePhaseC(options: PhaseCOptions): Promise<PhaseCResult> {
  const tier = options.tier ?? "professional";
  const llmMode = resolveLlmMode();
  const osRefs = { ...DEFAULT_OS_REFS, ...options.os_refs };

  const project = initPhaseCProject(
    options.sku,
    tier,
    options.brief,
    osRefs,
    llmMode,
    options.sector,
  );
  project.status = "PLANNING";

  const retryHistory: RetryHistoryEntry[] = [];
  const usedTemplateIds: string[] = [];
  const ctx = skuToTemplateContext(project.sku);
  const sector = project.sector ?? String(project.brief.sector ?? "general");

  async function runAttempt(): Promise<QaResult> {
    const pick = await pickPipelineTemplate({
      sector,
      service: ctx.service,
      category: ctx.category,
      level: tier,
      usedTemplateIds,
      rankingsPath: options.rankings_path,
    });

    usedTemplateIds.push(pick.template_id);
    project.template_pipeline = {
      selected_template_id: pick.template_id,
      final_template_score: pick.final_template_score,
      source: pick.source,
      used_template_ids: [...usedTemplateIds],
      skipped_low_score: pick.skipped_low_score,
    };
    project.brief = { ...project.brief, _selected_template_id: pick.template_id };

    const qa = await executePipelinePhaseC(project);

    await recordPostQaOutcome({
      project,
      qa,
      templateId: pick.template_id,
      extra: { phase: "C" },
    });

    return qa;
  }

  /**
   * Presupuesto agregado. Sin él, el peor caso (4 intentos x 3 agentes x pase de
   * reparación x timeout por llamada) llegaba a 48-120 min frente a los 35 min
   * del job. El primer intento SIEMPRE se ejecuta: recortar antes de tener un
   * resultado dejaría la ejecución sin artefactos.
   */
  const budgetMs = configuredLlmBudgetMs();
  const attemptDurationsMs: number[] = [];

  return runWithLlmBudget(budgetMs, async () => {
    const firstStarted = Date.now();
    let qa = await runAttempt();
    attemptDurationsMs.push(Date.now() - firstStarted);
    project.qa = qa;
    retryHistory.push(historyEntry(1, qa, project));

    while (
      !qa.passed &&
      qa.score < QA_PASS_THRESHOLD &&
      project.retry_count < project.max_retries
    ) {
      /**
       * Se comprueba ANTES de empezar el intento, usando la duración observada
       * como estimación. Así nunca se arranca trabajo que no cabe, y no se
       * repiten los side effects del intento anterior (`recordPostQaOutcome`
       * ya se ejecutó y queda tal cual).
       */
      /**
       * Fallo DETERMINISTA de contrato de entrada: no se reintenta.
       *
       * Los checks `BRIEF-*` se calculan únicamente sobre el brief —
       * `bot_name`, `website_url`, `openai_cost_bearer`, `seed_keywords`...— y
       * el brief es idéntico en todos los intentos. Reintentar no puede
       * cambiar el resultado: solo gasta llamadas LLM y presupuesto.
       *
       * Ojo con el alcance: SOLO cuenta un `BRIEF-*` BLOQUEANTE. Un fallo de
       * calidad del LLM, un JSON inválido o un artefacto no generado SÍ son
       * transitorios y siguen reintentándose como hasta ahora.
       */
      if (tieneFalloDeContratoDeEntrada(qa)) {
        project.status = "INTAKE_VALIDATING";
        break;
      }

      const estimate = Math.max(...attemptDurationsMs);
      if (!hasBudgetForAnotherAttempt(estimate)) {
        markLlmBudgetExhausted(
          `reintento ${project.retry_count + 2} omitido: no cabe en el presupuesto restante`,
        );
        break;
      }
      project.retry_count += 1;
      project.status = "RETRYING";
      const started = Date.now();
      qa = await runAttempt();
      attemptDurationsMs.push(Date.now() - started);
      project.qa = qa;
      retryHistory.push(historyEntry(project.retry_count + 1, qa, project));
    }

    project.retry_history = retryHistory;

    /**
     * Degradación explícita. Si se recortó cualquier trabajo por presupuesto, la
     * ejecución NO puede leerse como un resultado LLM normal: queda una entrada
     * dedicada en `agent_log` y el estado se refleja en el bundle de salida.
     */
    if (wasLlmBudgetExhausted()) {
      const reason = llmBudgetDegradationReason() ?? "presupuesto agotado";
      const now = new Date().toISOString();
      project.agent_log.push({
        agent: "llm_budget_guard",
        started_at: now,
        ended_at: now,
        input_artifact_versions: {},
        output_artifact: `budget_degraded:${reason}`,
        output_version: retryHistory.length,
        model: LLM_BUDGET_DEGRADED_MODEL,
        tokens: 0,
        status: "failed",
        llm_mode: "real",
      });
      project.llm_budget_degraded = true;
      project.llm_budget_reason = reason;
    }

    return finalizePhaseC(project, qa, retryHistory, llmMode, options);
  });
}

/** Cierre de la ejecución: publicación OS, escalado y bundle de salida. */
function finalizePhaseC(
  project: ReturnType<typeof initPhaseCProject>,
  qa: QaResult,
  retryHistory: RetryHistoryEntry[],
  llmMode: "mock" | "real",
  options: PhaseCOptions,
): PhaseCResult {
  let os_publish = null;
  let escalated = false;

  if (qa.passed) {
    const sectorEscalate =
      project.sector != null && requiresOperatorEscalation(project.sector);
    project.sector_escalation = sectorEscalate ?? false;
    if (sectorEscalate) {
      project.status = "ESCALATE_OPERATOR";
      escalated = true;
      os_publish = buildOsPublishPayload(project, { dry_run: true, production: isAutonomousProductionPublish() });
    } else {
      project.status = "OS_PUBLISH_READY";
      os_publish = buildOsPublishPayload(project, {
        dry_run: !isAutonomousProductionPublish(),
        production: isAutonomousProductionPublish(),
      });
    }
  } else {
    project.status = "ESCALATE_OPERATOR";
    escalated = true;
  }

  const output_bundle: PhaseCOutputBundle = {
    artifacts: project.artifacts,
    qaResult: qa,
    retryHistory,
    osPublishPayload: os_publish,
    llm_mode: llmMode,
    phase: "C",
  };

  if (options.output_dir) {
    writePhaseCOutput(options.output_dir, options.sku, project, output_bundle);
  }

  return { project, os_publish, escalated, output_bundle, llm_mode: llmMode };
}

function historyEntry(
  attempt: number,
  qa: QaResult,
  project: PhaseCResult["project"],
): RetryHistoryEntry {
  return {
    attempt,
    score: qa.score,
    passed: qa.passed,
    failed_agents: qa.failed_agents,
    target_agent: qa.retry_recommendation?.target_agent ?? null,
    reason: qa.retry_recommendation?.reason ?? null,
    at: qa.evaluated_at,
    template_id: project.template_pipeline?.selected_template_id ?? null,
    final_template_score: project.template_pipeline?.final_template_score ?? null,
    template_source: project.template_pipeline?.source ?? null,
  };
}

export function writePhaseCOutput(
  baseDir: string,
  sku: AutonomousSku,
  project: PhaseCResult["project"],
  bundle: PhaseCOutputBundle,
): void {
  const slug = sku.replace("NELVYON-", "").toLowerCase();
  const dir = join(baseDir, "phase-c", slug);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, "artifacts.json"), JSON.stringify(bundle.artifacts, null, 2));
  writeFileSync(join(dir, "qaResult.json"), JSON.stringify(bundle.qaResult, null, 2));
  writeFileSync(join(dir, "retryHistory.json"), JSON.stringify(bundle.retryHistory, null, 2));
  if (bundle.osPublishPayload) {
    writeFileSync(join(dir, "osPublishPayload.json"), JSON.stringify(bundle.osPublishPayload, null, 2));
  }
  writeFileSync(join(dir, "project.json"), JSON.stringify(project, null, 2));
}
