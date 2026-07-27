import crypto from "node:crypto";

import { getPoolStats, healthCheckPool, getLocalAiPool } from "../db";
import { assertLocalAiDatabaseUrlReady, assertLocalAiRagSchemaPresent } from "../railwayRagPrep";
import { getLocalRagRetriever } from "../LocalRagRetriever";
import type { RagRetrievalResult } from "../LocalRagRetriever";
import { getLocalMemoryStore } from "../LocalMemoryStore";
import { runLocalAiHealthCheck } from "../LocalAiHealth";
import { getOllamaClient } from "../OllamaClient";
import { evaluateSecurityGuard } from "../specialization/SecurityGuard";
import { buildSpecializationPrompt } from "../specialization/PromptBuilder";
import { getInferenceGate } from "./InferenceGate";
import { acquireExecutionSlot } from "./ExecutionLimiter";
import { isOllamaInferenceFailure, isTaskCancelled } from "./routerErrors";
import { getModelRegistry, profileForSlot } from "./ModelRegistry";
import { estimateResources, getSystemSnapshot } from "./ResourceBudget";
import { getRouterQueue } from "./RouterQueue";
import { assessRisk } from "./RiskAssessor";
import { classifyTask, inferRagDomain } from "./TaskClassifier";
import { planMemory, planRag, selectModelForTask } from "./RoutingPolicy";
import { buildBlockedMeta, validateRouterResponse } from "./RouterValidator";
import { classifyLatencyBucket } from "./latencyMetrics";
import type {
  ModelSelection,
  QueuedTaskRecord,
  ResourceEstimate,
  RouterDecision,
  RouterExecutionMeta,
  RouterHealth,
  RouterTaskInput,
  RouterTaskResult,
  TaskType,
} from "./types";

const auditLog: RouterExecutionMeta[] = [];

const EMPTY_RETRIEVAL: RagRetrievalResult = {
  query: "",
  expandedQuery: "",
  citations: [],
  contextBlock: "",
  confidence: 0,
  topK: 0,
};

export function classifyTaskPublic(input: RouterTaskInput) {
  return classifyTask(input);
}

export function estimateResourcesPublic(profileSlot: "fast" | "strategy"): ResourceEstimate {
  const gate = getInferenceGate();
  const q = getRouterQueue();
  return estimateResources(profileForSlot(profileSlot), q.depth(), gate.getLoadedModel());
}

export function selectModelPublic(taskType: TaskType, opts?: { requireJson?: boolean; requirePlan?: boolean; forceFallback?: boolean }): ModelSelection {
  return selectModelForTask(taskType, opts);
}

/** Full routing decision without execution. */
export function routeTask(input: RouterTaskInput): RouterDecision {
  const taskId = crypto.randomUUID();
  const guard = evaluateSecurityGuard(input.query);
  if (guard.blocked) {
    const taskType = classifyTask(input);
    const model = selectModelForTask(taskType);
    return {
      taskId,
      taskType,
      risk: "medium",
      blocked: true,
      blockReason: guard.category,
      requiresApproval: false,
      model,
      rag: { enabled: false, topK: 0, maxContextChars: 0 },
      memory: { read: false, write: false, limit: 0 },
      securityBlocked: true,
      securityCategory: guard.category,
    };
  }

  const taskType = classifyTask(input);
  const risk = assessRisk(input, taskType);
  if (risk.blocked) {
    const model = selectModelForTask(taskType);
    return {
      taskId,
      taskType,
      risk: risk.level,
      blocked: true,
      blockReason: risk.reasons.join("|"),
      requiresApproval: risk.requiresApproval,
      model,
      rag: planRag(taskType, Boolean(input.domain)),
      memory: planMemory(taskType),
      securityBlocked: false,
    };
  }

  const model = selectModelForTask(taskType, {
    requireJson: input.hints?.requireJson,
    requirePlan: input.hints?.requirePlan,
  });
  const domain = inferRagDomain(input, taskType);
  const ragPlan = planRag(taskType, Boolean(domain));
  const memPlan = planMemory(taskType);

  return {
    taskId,
    taskType,
    risk: risk.level,
    blocked: false,
    requiresApproval: risk.requiresApproval,
    model,
    rag: { ...ragPlan, domain },
    memory: memPlan,
    securityBlocked: false,
  };
}

export async function executeTask(input: RouterTaskInput, requestId?: string): Promise<RouterTaskResult> {
  // Fail-closed before any RAG/DB/inference work (ADR-069) — never hit localhost Postgres in prod.
  assertLocalAiDatabaseUrlReady();
  await assertLocalAiRagSchemaPresent(getLocalAiPool());

  const queue = getRouterQueue();
  const queued = queue.enqueue(input, requestId);
  const taskId = queued.taskId;
  const abortSignal = queue.getAbortSignal(taskId);
  const t0 = Date.now();
  let execRelease: (() => void) | null = null;
  let queueWaitMs = 0;
  const gate = getInferenceGate();
  const circuitOpenAtStart = gate.isCircuitOpen();

  const cancelledResult = (): RouterTaskResult | null => {
    if (!abortSignal?.aborted && !queue.isCancelled(taskId)) return null;
    const meta = buildBlockedMeta(taskId, input.tenantId, {
      taskType: classifyTask(input),
      durationMs: Date.now() - t0,
      modelReason: "task_cancelled",
      validationPass: false,
      validationViolations: ["task_cancelled"],
      securityBlocked: false,
    });
    return { taskId, status: "cancelled", content: "Tarea cancelada.", blocked: false, requiresApproval: false, meta };
  };

  try {
    const execSlot = await acquireExecutionSlot(abortSignal);
    queueWaitMs = execSlot.queueWaitMs;
    execRelease = execSlot.release;
    const routeStart = Date.now();
    queue.setStatus(taskId, "running", { taskType: classifyTask(input) });

    const decision = routeTask(input);
    const routingMs = Date.now() - routeStart;
    if (decision.blocked) {
      const guardResult = evaluateSecurityGuard(input.query);
      const content = decision.securityBlocked && guardResult.blocked
        ? guardResult.response
        : `Acción bloqueada: requiere aprobación del propietario (${decision.blockReason}).`;

      const meta = buildBlockedMeta(taskId, input.tenantId, {
        taskType: decision.taskType,
        risk: decision.risk,
        initialModel: "none",
        finalModel: "none",
        modelReason: decision.blockReason ?? "blocked",
        durationMs: Date.now() - t0,
        securityBlocked: decision.securityBlocked,
      });
      queue.setStatus(taskId, "blocked", { model: "none", durationMs: meta.durationMs });
      return { taskId, status: "blocked", content, blocked: true, requiresApproval: decision.requiresApproval, blockReason: decision.blockReason, meta };
    }

    const profile = profileForSlot(decision.model.slot);
    const resource = estimateResources(profile, queue.depth(), getInferenceGate().getLoadedModel());
    if (!resource.ok) {
      throw new Error(resource.reason ?? "insufficient_resources");
    }

    if (abortSignal?.aborted) {
      const cr = cancelledResult();
      if (cr) {
        queue.setStatus(taskId, "cancelled", { durationMs: Date.now() - t0 });
        return cr;
      }
    }

    let retrieval = null as Awaited<ReturnType<ReturnType<typeof getLocalRagRetriever>["retrieve"]>> | null;
    const ragSources: string[] = [];
    let ragMs = 0;
    let memoryMs = 0;

    if (decision.rag.enabled && decision.rag.domain) {
      const ragStart = Date.now();
      retrieval = await getLocalRagRetriever().retrieve(input.tenantId, input.query, {
        domain: decision.rag.domain,
        limit: decision.rag.topK,
        clientId: input.clientId,
      });
      ragMs = Date.now() - ragStart;
      ragSources.push(...retrieval.citations.map((c) => c.sourceId));
    }

    let memoryContext = "";
    if (decision.memory.read) {
      try {
        const memStart = Date.now();
        const mem = await getLocalMemoryStore().search(input.tenantId, input.query, decision.memory.limit, input.clientId);
        memoryMs = Date.now() - memStart;
        if (mem.length) memoryContext = mem.map((m) => m.content).join("\n");
      } catch {
        /* postgres down — continue without memory */
      }
    }

    const prompt = buildSpecializationPrompt(input.query, retrieval ?? EMPTY_RETRIEVAL, {
      domain: decision.rag.domain,
      requireJson: input.hints?.requireJson,
      requirePlan: input.hints?.requirePlan,
      requireCitations: input.hints?.requireCitations ?? decision.rag.enabled,
      gateCategory: decision.taskType === "strategy" ? "strategy" : decision.taskType === "planning" ? "planning" : undefined,
    });

    const system = input.systemPrompt ?? prompt.system;
    const user = memoryContext ? `${memoryContext}\n\n${prompt.user}` : prompt.user;
    const messages = input.messages ?? [
      { role: "system" as const, content: system },
      { role: "user" as const, content: user },
    ];

    const inferenceGate = getInferenceGate();
    let gateRelease: (() => void) | null = null;
    let finalModel = decision.model.model;
    let fallbackUsed = false;
    let fallbackReasons: string[] = [];
    let content = "";
    let evalCount: number | undefined;
    let gateWaitMs = 0;
    let modelLoadMs = 0;
    let coldStart = false;
    let modelLoadedBefore: string | null = null;
    let inferenceMs = 0;

    try {
      const slot = await inferenceGate.acquire(profile, abortSignal);
      gateRelease = slot.release;
      gateWaitMs = slot.gateWaitMs;
      modelLoadMs = slot.modelLoadMs;
      coldStart = slot.coldStart;
      modelLoadedBefore = slot.modelLoadedBefore;
      const client = getOllamaClient();
      const chatOpts = {
        model: decision.model.model,
        temperature: decision.model.temperature,
        numPredict: decision.model.numPredict,
        numCtx: decision.model.numCtx,
        numGpu: decision.model.numGpu,
        format: decision.model.format,
        seed: 42,
        signal: abortSignal,
      };

      const inferStart = Date.now();
      const res = await client.chat(messages, chatOpts);
      inferenceMs += Date.now() - inferStart;
      content = res.content;
      evalCount = res.evalCount;
      finalModel = res.model;

      const validation = validateRouterResponse({
        content,
        query: input.query,
        requireJson: input.hints?.requireJson,
        requireCitations: input.hints?.requireCitations ?? decision.rag.enabled,
        citations: retrieval?.citations,
        hasContext: Boolean(retrieval?.citations?.length),
      });

      if (!validation.pass && decision.model.allowFallback) {
        const fallback = selectModelForTask(decision.taskType, { forceFallback: true, requireJson: input.hints?.requireJson, requirePlan: input.hints?.requirePlan });
        const fbProfile = profileForSlot("strategy");
        const fbResource = estimateResources(fbProfile, queue.depth(), inferenceGate.getLoadedModel());
        if (!fbResource.ok) throw new Error(fbResource.reason ?? "insufficient_resources_fallback");

        gateRelease();
        gateRelease = null;
        const fbSlot = await inferenceGate.acquire(fbProfile, abortSignal);
        gateRelease = fbSlot.release;
        gateWaitMs += fbSlot.gateWaitMs;
        modelLoadMs += fbSlot.modelLoadMs;
        if (fbSlot.coldStart) coldStart = true;
        try {
          const fbInferStart = Date.now();
          const fbRes = await client.chat(messages, {
            model: fallback.model,
            temperature: fallback.temperature,
            numPredict: fallback.numPredict,
            numCtx: fallback.numCtx,
            numGpu: fallback.numGpu,
            format: fallback.format,
            seed: 42,
            signal: abortSignal,
          });
          inferenceMs += Date.now() - fbInferStart;
          content = fbRes.content;
          evalCount = (evalCount ?? 0) + (fbRes.evalCount ?? 0);
          finalModel = fbRes.model;
          fallbackUsed = true;
          fallbackReasons = validation.fallbackReasons;
        } finally {
          gateRelease?.();
          gateRelease = null;
        }
      }
    } finally {
      gateRelease?.();
    }

    const cr = cancelledResult();
    if (cr) {
      queue.setStatus(taskId, "cancelled", { durationMs: Date.now() - t0 });
      return cr;
    }

    const snap = getSystemSnapshot();
    const validationStart = Date.now();
    const finalValidation = validateRouterResponse({
      content,
      query: input.query,
      requireJson: input.hints?.requireJson,
      requireCitations: input.hints?.requireCitations ?? decision.rag.enabled,
      citations: retrieval?.citations,
      hasContext: Boolean(retrieval?.citations?.length),
    });
    const validationMs = Date.now() - validationStart;
    const totalMs = Date.now() - t0;
    const modelSlot = decision.model.slot;

    const timing = {
      queueWaitMs,
      routingMs,
      ragMs,
      memoryMs,
      gateWaitMs,
      modelLoadMs,
      inferenceMs,
      validationMs,
      totalMs,
      coldStart,
      modelLoadedBefore,
      modelSlot,
      circuitOpenAtStart,
    };

    const meta: RouterExecutionMeta = {
      taskId,
      tenantId: input.tenantId,
      taskType: decision.taskType,
      risk: decision.risk,
      initialModel: decision.model.model,
      finalModel,
      modelReason: decision.model.reason,
      fallbackUsed,
      fallbackReasons,
      durationMs: totalMs,
      evalCount,
      temperature: decision.model.temperature,
      vramUsedMiB: snap.vramUsedMiB,
      ramUsedMiB: snap.ramTotalMiB - snap.ramFreeMiB,
      ragSources,
      validationPass: finalValidation.pass,
      validationViolations: finalValidation.violations,
      securityBlocked: false,
      timing,
      latencyBucket: undefined,
    };
    meta.latencyBucket = classifyLatencyBucket(meta);

    auditLog.push(meta);
    if (auditLog.length > 500) auditLog.shift();

    queue.setStatus(taskId, "completed", { model: finalModel, durationMs: meta.durationMs, taskType: decision.taskType });
    return {
      taskId,
      status: "completed",
      content,
      blocked: false,
      requiresApproval: decision.requiresApproval,
      meta,
      citations: retrieval?.citations,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    if (isTaskCancelled(err)) {
      const meta = buildBlockedMeta(taskId, input.tenantId, {
        taskType: classifyTask(input),
        durationMs: Date.now() - t0,
        modelReason: "task_cancelled",
        validationPass: false,
        validationViolations: ["task_cancelled"],
        securityBlocked: false,
      });
      queue.setStatus(taskId, "cancelled", { durationMs: meta.durationMs });
      return { taskId, status: "cancelled", content: "Tarea cancelada.", blocked: false, requiresApproval: false, meta };
    }

    if (isOllamaInferenceFailure(err)) getInferenceGate().recordFailure();
    queue.setStatus(taskId, "failed", { error: err, durationMs: Date.now() - t0 });
    const meta = buildBlockedMeta(taskId, input.tenantId, {
      taskType: classifyTask(input),
      durationMs: Date.now() - t0,
      modelReason: err,
      validationPass: false,
      validationViolations: [err],
      securityBlocked: false,
    });
    auditLog.push(meta);
    if (auditLog.length > 500) auditLog.shift();
    return { taskId, status: "failed", content: `ERROR: ${err}`, blocked: false, requiresApproval: false, meta };
  } finally {
    execRelease?.();
  }
}

export function validateResponse(input: Parameters<typeof validateRouterResponse>[0]) {
  return validateRouterResponse(input);
}

export function cancelTask(taskId: string): boolean {
  return getRouterQueue().cancel(taskId);
}

export function getTaskStatus(taskId: string): QueuedTaskRecord | null {
  return getRouterQueue().get(taskId);
}

export async function getRouterHealth(): Promise<RouterHealth> {
  const health = await runLocalAiHealthCheck();
  const client = getOllamaClient();
  const registry = getModelRegistry();
  const pool = await healthCheckPool();
  const gate = getInferenceGate();
  const q = getRouterQueue();

  return {
    ok: health.ok && pool.ok && !gate.isCircuitOpen(),
    privateMode: health.privateMode.privateMode,
    postgres: health.postgres.ok,
    ollama: health.ollama.ok,
    fastModelAvailable: await client.isModelAvailable(registry.fast.model),
    strategyModelAvailable: await client.isModelAvailable(registry.strategy.model),
    loadedModel: gate.getLoadedModel(),
    queueDepth: q.depth(),
    runningTasks: q.runningCount(),
    circuitOpen: gate.isCircuitOpen(),
    poolStats: getPoolStats(),
  };
}

export function getRouterAuditLog(limit = 50): RouterExecutionMeta[] {
  return auditLog.slice(-limit);
}

export function resetLocalModelRouterForTests(): void {
  auditLog.length = 0;
}
