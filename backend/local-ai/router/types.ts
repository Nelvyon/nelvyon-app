import type { KnowledgeDomainId } from "../specialization/ontology";
import type { OllamaChatMessage } from "../OllamaClient";
import type { RagCitation } from "../LocalRagRetriever";

/** Deterministic task categories — no LLM classification. */
export type TaskType =
  | "simple"
  | "knowledge"
  | "rag_query"
  | "extraction"
  | "classification"
  | "json"
  | "planning"
  | "strategy"
  | "analysis"
  | "coding"
  | "security_sensitive"
  | "destructive"
  | "human_approval_required";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ModelSlot = "fast" | "strategy";

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "blocked";

export type RouterTaskInput = {
  /** Caller-supplied tenant UUID — mandatory. */
  tenantId: string;
  query: string;
  clientId?: string | null;
  agentId?: string;
  domain?: KnowledgeDomainId;
  /** Explicit hints override heuristics when set. */
  hints?: {
    taskType?: TaskType;
    requireJson?: boolean;
    requirePlan?: boolean;
    requireCitations?: boolean;
    structuredOutput?: boolean;
    ownerApproved?: boolean;
  };
  messages?: OllamaChatMessage[];
  systemPrompt?: string;
  priority?: number;
};

export type ResourceEstimate = {
  ok: boolean;
  estimatedCtx: number;
  estimatedVramMiB: number;
  estimatedRamMiB: number;
  vramAvailableMiB?: number;
  ramAvailableMiB?: number;
  modelLoaded?: string | null;
  queueDepth: number;
  reason?: string;
};

export type ModelSelection = {
  slot: ModelSlot;
  model: string;
  numGpu?: number;
  numCtx: number;
  numPredict: number;
  temperature: number;
  format?: "json";
  reason: string;
  allowFallback: boolean;
};

export type RagPlan = {
  enabled: boolean;
  domain?: KnowledgeDomainId;
  topK: number;
  maxContextChars: number;
};

export type MemoryPlan = {
  read: boolean;
  write: boolean;
  limit: number;
};

export type RouterDecision = {
  taskId: string;
  taskType: TaskType;
  risk: RiskLevel;
  blocked: boolean;
  blockReason?: string;
  requiresApproval: boolean;
  model: ModelSelection;
  rag: RagPlan;
  memory: MemoryPlan;
  securityBlocked: boolean;
  securityCategory?: string;
};

/** Per-class latency buckets for soak gates — avoids mixing 3B fast with 8B strategy. */
export type LatencyBucket = "fast_simple" | "fast_rag" | "strategy" | "fallback" | "queue";

export type RouterTimingBreakdown = {
  queueWaitMs: number;
  routingMs: number;
  ragMs: number;
  memoryMs: number;
  gateWaitMs: number;
  modelLoadMs: number;
  inferenceMs: number;
  validationMs: number;
  totalMs: number;
  coldStart: boolean;
  modelLoadedBefore: string | null;
  modelSlot: ModelSlot;
  circuitOpenAtStart: boolean;
  gpuTempC?: number;
};

export type RouterExecutionMeta = {
  taskId: string;
  tenantId: string;
  taskType: TaskType;
  risk: RiskLevel;
  initialModel: string;
  finalModel: string;
  modelReason: string;
  fallbackUsed: boolean;
  fallbackReasons: string[];
  durationMs: number;
  evalCount?: number;
  temperature: number;
  vramUsedMiB?: number;
  ramUsedMiB?: number;
  ragSources: string[];
  validationPass: boolean;
  validationViolations: string[];
  securityBlocked: boolean;
  /** Phase timings — populated on executeTask completion. */
  timing?: RouterTimingBreakdown;
  latencyBucket?: LatencyBucket;
};

export type RouterTaskResult = {
  taskId: string;
  status: TaskStatus;
  content: string;
  blocked: boolean;
  requiresApproval: boolean;
  blockReason?: string;
  meta: RouterExecutionMeta;
  citations?: RagCitation[];
};

export type RouterHealth = {
  ok: boolean;
  privateMode: boolean;
  postgres: boolean;
  ollama: boolean;
  fastModelAvailable: boolean;
  strategyModelAvailable: boolean;
  loadedModel: string | null;
  queueDepth: number;
  runningTasks: number;
  circuitOpen: boolean;
  poolStats?: { total: number; idle: number; waiting: number };
};

export type QueuedTaskRecord = {
  taskId: string;
  requestId: string;
  tenantId: string;
  agentId?: string;
  status: TaskStatus;
  priority: number;
  taskType?: TaskType;
  model?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
};
