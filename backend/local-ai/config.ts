/**
 * Local AI stack configuration — owner machine only.
 */
export type LocalAiConfig = {
  databaseUrl: string;
  embeddingDim: number;
  ollamaBaseUrl: string;
  embeddingModel: string;
  storageDir: string;
  backupDir: string;
  dockerContainer: string;
};

const DEFAULT_DB =
  "postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai";

export function getLocalAiConfig(): LocalAiConfig {
  return {
    databaseUrl: process.env.LOCAL_AI_DATABASE_URL?.trim() || DEFAULT_DB,
    embeddingDim: Number(process.env.LOCAL_AI_EMBEDDING_DIM ?? 768),
    ollamaBaseUrl: (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/$/, ""),
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
