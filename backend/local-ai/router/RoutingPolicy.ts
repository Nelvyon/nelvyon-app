import type { ModelSelection, TaskType } from "./types";
import { profileForSlot } from "./ModelRegistry";
import type { ModelSlot } from "./types";

const FAST_TYPES = new Set<TaskType>([
  "simple",
  "extraction",
  "classification",
  "json",
  "knowledge",
  "rag_query",
  "coding",
]);

const STRATEGY_TYPES = new Set<TaskType>(["strategy", "planning", "analysis"]);

export function selectModelForTask(
  taskType: TaskType,
  opts?: { requireJson?: boolean; requirePlan?: boolean; forceFallback?: boolean },
): ModelSelection {
  if (opts?.forceFallback) {
    const p = profileForSlot("strategy");
    return {
      slot: "strategy",
      model: p.model,
      numGpu: p.numGpu,
      numCtx: opts.requirePlan ? 12288 : p.defaultNumCtx,
      numPredict: opts.requirePlan ? 6144 : opts.requireJson ? 1536 : p.defaultNumPredict,
      temperature: p.temperature,
      format: opts.requireJson ? "json" : undefined,
      reason: "quality_fallback_8b",
      allowFallback: false,
    };
  }

  let slot: ModelSlot = "fast";
  let reason = "default_fast_3b";

  if (STRATEGY_TYPES.has(taskType)) {
    slot = "strategy";
    reason = taskType === "strategy" ? "strategy_task_8b" : "planning_task_8b";
  } else if (taskType === "security_sensitive") {
    slot = "fast";
    reason = "security_sensitive_3b_guarded";
  } else if (FAST_TYPES.has(taskType)) {
    slot = "fast";
    reason = `${taskType}_3b`;
  } else {
    slot = "fast";
    reason = "general_3b";
  }

  const p = profileForSlot(slot);
  const requireJson = opts?.requireJson ?? taskType === "json";
  const requirePlan = opts?.requirePlan ?? taskType === "planning";

  return {
    slot,
    model: p.model,
    numGpu: p.numGpu,
    numCtx: requirePlan ? Math.min(p.maxNumCtx, 12288) : p.defaultNumCtx,
    numPredict: requirePlan ? 6144 : requireJson ? 1536 : p.defaultNumPredict,
    temperature: p.temperature,
    format: requireJson ? "json" : undefined,
    reason,
    allowFallback: slot === "fast",
  };
}

export function planRag(taskType: TaskType, hasDomain: boolean): { enabled: boolean; topK: number; maxContextChars: number } {
  const noRag = new Set<TaskType>(["simple", "classification", "destructive", "human_approval_required"]);
  if (noRag.has(taskType)) return { enabled: false, topK: 0, maxContextChars: 0 };
  return {
    enabled: true,
    topK: taskType === "knowledge" || taskType === "rag_query" ? 6 : 4,
    maxContextChars: taskType === "planning" || taskType === "strategy" ? 24_000 : 16_000,
  };
}

export function planMemory(taskType: TaskType): { read: boolean; write: boolean; limit: number } {
  const readTypes = new Set<TaskType>(["strategy", "planning", "analysis", "knowledge", "rag_query"]);
  return {
    read: readTypes.has(taskType),
    write: false,
    limit: 3,
  };
}
