import type { AiMode, GlobalPrivateAiConfig } from "./types";
import { isPrivateMode } from "./privateMode";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";

function parseAiMode(raw: string | undefined): AiMode {
  const v = raw?.trim().toLowerCase();
  if (
    v === "unconfigured" ||
    v === "stub" ||
    v === "mock" ||
    v === "local" ||
    v === "openai" ||
    v === "anthropic" ||
    v === "auto"
  ) {
    if (v === "mock") return "stub";
    return v;
  }
  return "unconfigured";
}

/** Master switch — when false, no provider probes or external LLM calls. */
export function isNelvyonAiEnabled(): boolean {
  const v = process.env.NELVYON_AI_ENABLED ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}

/** Set to 1 only after Ollama (or compatible runtime) is installed and reachable. */
export function isLocalRuntimeConfigured(): boolean {
  const v = process.env.OLLAMA_CONFIGURED ?? process.env.NELVYON_LOCAL_AI_CONFIGURED ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}

export function isPrivateAiOnlyEnv(): boolean {
  if (isPrivateMode()) return true;
  const v = process.env.PRIVATE_AI_ONLY ?? process.env.NELVYON_PRIVATE_AI_ONLY ?? "";
  return v === "1" || v.toLowerCase() === "true";
}

export function isLocalRouterEnabled(): boolean {
  // Fail-closed: require explicit opt-in AND configured local runtime (ADR canary prep).
  const v = process.env.NELVYON_LOCAL_ROUTER_ENABLED ?? "0";
  if (v !== "1" && v.toLowerCase() !== "true") return false;
  return isLocalRuntimeConfigured();
}

export function isOpenClawBridgeEnabled(): boolean {
  const v = process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}

export function getGlobalPrivateAiConfig(): GlobalPrivateAiConfig {
  return {
    enabled: isNelvyonAiEnabled(),
    aiMode: parseAiMode(process.env.NELVYON_AI_MODE),
    privateAiOnly: isPrivateAiOnlyEnv(),
    localRuntimeConfigured: isLocalRuntimeConfigured(),
    ollamaBaseUrl: (
      process.env.OLLAMA_HOST?.trim() ||
      process.env.OLLAMA_BASE_URL?.trim() ||
      process.env.NELVYON_LOCAL_AI_URL?.trim() ||
      DEFAULT_OLLAMA_URL
    ).replace(/\/$/, ""),
    ollamaModel: process.env.OLLAMA_MODEL ?? process.env.NELVYON_OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
    openaiModel: process.env.NELVYON_OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    anthropicModel: process.env.NELVYON_ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
    openaiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || null,
    openClawBridgeUrl: process.env.NELVYON_OPENCLAW_BRIDGE_URL?.trim() || null,
  };
}

export function resetGlobalPrivateAiConfigForTests(): void {
  delete process.env.NELVYON_AI_ENABLED;
  delete process.env.NELVYON_AI_MODE;
  delete process.env.PRIVATE_MODE;
  delete process.env.NELVYON_PRIVATE_MODE;
  delete process.env.PRIVATE_MODE_INTERNET_UNTIL;
  delete process.env.PRIVATE_AI_ONLY;
  delete process.env.NELVYON_PRIVATE_AI_ONLY;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  delete process.env.OLLAMA_CONFIGURED;
  delete process.env.NELVYON_LOCAL_AI_CONFIGURED;
  delete process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED;
}
