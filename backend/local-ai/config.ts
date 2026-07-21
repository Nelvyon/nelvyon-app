/**
 * Local AI stack configuration — owner machine only.
 */
export type LocalAiConfig = {
  databaseUrl: string;
  embeddingDim: number;
  ollamaBaseUrl: string;
  ollamaModel: string;
  /** Optional heavier model for strategy/planning generation only (hybrid pipeline). */
  strategyModel?: string;
  strategyNumGpu?: number;
  embeddingModel: string;
  storageDir: string;
  backupDir: string;
  dockerContainer: string;
};

const DEFAULT_DB =
  "postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai";

export function getLocalAiConfig(): LocalAiConfig {
  const strategyModel =
    process.env.OLLAMA_STRATEGY_MODEL?.trim() ||
    process.env.BENCHMARK_STRATEGY_MODEL?.trim() ||
    undefined;
  const strategyNumGpuRaw = process.env.OLLAMA_STRATEGY_NUM_GPU ?? process.env.OLLAMA_NUM_GPU;
  return {
    databaseUrl: process.env.LOCAL_AI_DATABASE_URL?.trim() || DEFAULT_DB,
    embeddingDim: Number(process.env.LOCAL_AI_EMBEDDING_DIM ?? 768),
    ollamaBaseUrl: (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/$/, ""),
    ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.2:3b-instruct-q4_K_M",
    strategyModel,
    strategyNumGpu: strategyNumGpuRaw ? Number(strategyNumGpuRaw) : strategyModel ? 22 : undefined,
    embeddingModel: process.env.LOCAL_AI_EMBEDDING_MODEL ?? "nomic-embed-text",
    storageDir: process.env.LOCAL_AI_STORAGE_DIR ?? "./backend/local-ai/storage",
    backupDir: process.env.LOCAL_AI_BACKUP_DIR ?? "./backend/local-ai/backups",
    dockerContainer: process.env.LOCAL_AI_DOCKER_CONTAINER ?? "nelvyon-local-ai-postgres",
  };
}

export function resetLocalAiConfigForTests(): void {
  delete process.env.LOCAL_AI_DATABASE_URL;
  delete process.env.LOCAL_AI_EMBEDDING_DIM;
  delete process.env.LOCAL_AI_EMBEDDING_MODEL;
}
