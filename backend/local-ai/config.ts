/**
 * Local AI stack configuration.
 * Production: never falls back to owner-machine localhost Postgres/Ollama (ADR-069).
 */
import { resolveDeployEnvironment } from "../db/prodMigrateGate";
import {
  LOCAL_AI_OWNER_DEFAULT_DATABASE_URL,
  isLoopbackOrLocalDatabaseUrl,
  resolveLocalAiDatabaseUrl,
} from "./railwayRagPrep";

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

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0";
}

/**
 * `OLLAMA_HOST` es, en la convención OFICIAL de Ollama, un `host:port` SIN
 * esquema —`127.0.0.1:11434`, `100.64.0.1:11434`—, no una URL. Aquí se
 * consumía tal cual como base de `fetch`, así que un valor perfectamente
 * válido para el CLI de Ollama producía `Failed to parse URL from
 * <host>:11434/api/tags` y el sistema lo reportaba como `ollama_unreachable`,
 * indistinguible de "el servidor no está levantado".
 *
 * Peor en producción: el guardia anti-loopback hace `new URL(raw)`, que LANZA
 * con un valor sin esquema y cae en el `catch` que devuelve "". Es decir, un
 * `OLLAMA_HOST` escrito según la convención de Ollama desactivaba la IA local
 * en silencio.
 *
 * Se normaliza: si no trae esquema, se antepone `http://`. Ambas formas quedan
 * soportadas, `OLLAMA_BASE_URL` y `NELVYON_LOCAL_AI_URL` siguen aceptando URL
 * completa como hasta ahora, y el guardia anti-loopback pasa a evaluarse sobre
 * un valor siempre parseable. No se codifica ninguna dirección concreta.
 */
function normalizarBaseUrl(valor: string): string {
  if (!valor) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(valor) ? valor : `http://${valor}`;
}

function resolveOllamaBaseUrl(env: NodeJS.ProcessEnv): string {
  const raw = normalizarBaseUrl(
    (
      env.OLLAMA_HOST?.trim() ||
      env.OLLAMA_BASE_URL?.trim() ||
      env.NELVYON_LOCAL_AI_URL?.trim() ||
      ""
    ).replace(/\/$/, ""),
  );
  const { isProduction } = resolveDeployEnvironment(env);
  if (!raw) {
    // Owner machine only — production must set OLLAMA_HOST (Tailscale mesh).
    return isProduction ? "" : "http://127.0.0.1:11434";
  }
  if (isProduction) {
    try {
      const host = new URL(raw).hostname;
      if (isLoopbackHostname(host)) {
        return "";
      }
    } catch {
      return "";
    }
  }
  return raw;
}

export function getLocalAiConfig(env: NodeJS.ProcessEnv = process.env): LocalAiConfig {
  const strategyModel =
    env.OLLAMA_STRATEGY_MODEL?.trim() ||
    env.BENCHMARK_STRATEGY_MODEL?.trim() ||
    undefined;
  const strategyNumGpuRaw = env.OLLAMA_STRATEGY_NUM_GPU ?? env.OLLAMA_NUM_GPU;

  const { isProduction } = resolveDeployEnvironment(env);
  const resolved = resolveLocalAiDatabaseUrl(env);
  let databaseUrl = resolved.url ?? "";
  if (!databaseUrl && !isProduction) {
    databaseUrl = LOCAL_AI_OWNER_DEFAULT_DATABASE_URL;
  }
  // Defense in depth: never return loopback DB URL under production env.
  if (isProduction && isLoopbackOrLocalDatabaseUrl(databaseUrl)) {
    databaseUrl = "";
  }

  return {
    databaseUrl,
    embeddingDim: Number(env.LOCAL_AI_EMBEDDING_DIM ?? 768),
    ollamaBaseUrl: resolveOllamaBaseUrl(env),
    ollamaModel: env.OLLAMA_MODEL ?? "llama3.2:3b-instruct-q4_K_M",
    strategyModel,
    strategyNumGpu: strategyNumGpuRaw ? Number(strategyNumGpuRaw) : strategyModel ? 22 : undefined,
    embeddingModel: env.LOCAL_AI_EMBEDDING_MODEL ?? "nomic-embed-text",
    storageDir: env.LOCAL_AI_STORAGE_DIR ?? "./backend/local-ai/storage",
    backupDir: env.LOCAL_AI_BACKUP_DIR ?? "./backend/local-ai/backups",
    dockerContainer: env.LOCAL_AI_DOCKER_CONTAINER ?? "nelvyon-local-ai-postgres",
  };
}

export function resetLocalAiConfigForTests(): void {
  delete process.env.LOCAL_AI_DATABASE_URL;
  delete process.env.LOCAL_AI_EMBEDDING_DIM;
  delete process.env.LOCAL_AI_EMBEDDING_MODEL;
  delete process.env.NELVYON_LOCAL_AI_USE_MAIN_DB;
  delete process.env.NELVYON_DEPLOY_ENV;
  delete process.env.RAILWAY_ENVIRONMENT_NAME;
  delete process.env.RAILWAY_ENVIRONMENT;
}
