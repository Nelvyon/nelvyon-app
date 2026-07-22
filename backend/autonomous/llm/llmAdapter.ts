/**
 * LLM Adapter — mock | real (Ollama-first, OpenAI fallback) with automatic mock fallback.
 * No sensitive prompt logging — only agent id, mode, token count.
 */

import { getOllamaClient } from "../../local-ai/OllamaClient";
import { parseJsonFromLlm } from "./parseJson";
import type { AgentRole } from "./promptTemplates";
import { buildUserPrompt, getSystemPrompt } from "./promptTemplates";

export type LlmMode = "mock" | "real";

export interface LlmRequest {
  agentId: AgentRole;
  payload: Record<string, unknown>;
  /** Offline mock generator when LLM unavailable or fails */
  mockGenerator: () => unknown;
}

export interface LlmResponse {
  mode: LlmMode;
  agentId: AgentRole;
  model: string;
  parsed: unknown;
  tokens: number;
  fallbackReason?: string;
  duration_ms: number;
}

export type LlmInvokeFn = (req: LlmRequest) => Promise<LlmResponse>;

let customInvoke: LlmInvokeFn | null = null;

export function setLlmInvokeForTests(fn: LlmInvokeFn | null): void {
  customInvoke = fn;
}

/** True when autonomous pack pipeline can use local Ollama (primary real path). */
export function isAutonomousOllamaConfigured(): boolean {
  if (process.env.OLLAMA_CONFIGURED?.trim() === "1") return true;
  return Boolean(
    process.env.OLLAMA_HOST?.trim() ||
      process.env.OLLAMA_BASE_URL?.trim() ||
      process.env.NELVYON_LOCAL_AI_URL?.trim() ||
      process.env.LOCAL_AI_BASE_URL?.trim(),
  );
}

export function resolveLlmMode(): LlmMode {
  if (process.env.AUTONOMOUS_LLM_MODE === "mock") return "mock";
  if (process.env.AUTONOMOUS_LLM_MODE === "real") return "real";
  if (isAutonomousOllamaConfigured()) return "real";
  const key = process.env.OPENAI_API_KEY?.trim();
  return key ? "real" : "mock";
}

function logLlmEvent(event: {
  agentId: string;
  mode: LlmMode;
  model: string;
  ok: boolean;
  tokens: number;
  fallbackReason?: string;
  duration_ms: number;
}): void {
  const msg = [
    `[autonomous-llm] agent=${event.agentId}`,
    `mode=${event.mode}`,
    `model=${event.model}`,
    `ok=${event.ok}`,
    `tokens=${event.tokens}`,
    `ms=${event.duration_ms}`,
    event.fallbackReason ? `fallback=${event.fallbackReason}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  console.error(msg);
}

async function callOllama(
  system: string,
  user: string,
): Promise<{ content: string; tokens: number; model: string }> {
  const result = await getOllamaClient().chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { format: "json" },
  );
  const content = result.content?.trim() ?? "";
  if (!content) throw new Error("Ollama empty content");
  return {
    content,
    tokens: (result.evalCount ?? 0) + (result.promptEvalCount ?? 0),
    model: result.model || "ollama",
  };
}

async function callOpenAi(system: string, user: string): Promise<{ content: string; tokens: number; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const model = process.env.AUTONOMOUS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
      model?: string;
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("OpenAI empty content");

    return {
      content,
      tokens: data.usage?.total_tokens ?? 0,
      model: data.model ?? model,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function mockFallback(
  req: LlmRequest,
  started: number,
  reason: string,
): LlmResponse {
  const parsed = req.mockGenerator();
  const response: LlmResponse = {
    mode: "mock",
    agentId: req.agentId,
    model: "mock-rules-v1",
    parsed,
    tokens: 0,
    fallbackReason: reason,
    duration_ms: Date.now() - started,
  };
  logLlmEvent({
    agentId: req.agentId,
    mode: "mock",
    model: response.model,
    ok: true,
    tokens: 0,
    fallbackReason: response.fallbackReason,
    duration_ms: response.duration_ms,
  });
  return response;
}

export async function invokeLlm(req: LlmRequest): Promise<LlmResponse> {
  if (customInvoke) return customInvoke(req);

  const started = Date.now();
  const preferred = resolveLlmMode();
  const system = getSystemPrompt(req.agentId);
  const user = buildUserPrompt(req.agentId, req.payload);

  if (preferred === "mock") {
    return mockFallback(
      req,
      started,
      "AUTONOMOUS_LLM_MODE=mock or no Ollama/OpenAI configured",
    );
  }

  const failures: string[] = [];

  if (isAutonomousOllamaConfigured()) {
    try {
      const { content, tokens, model } = await callOllama(system, user);
      const parsed = parseJsonFromLlm(content);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Ollama response is not valid JSON object");
      }
      const response: LlmResponse = {
        mode: "real",
        agentId: req.agentId,
        model,
        parsed,
        tokens,
        duration_ms: Date.now() - started,
      };
      logLlmEvent({
        agentId: req.agentId,
        mode: "real",
        model,
        ok: true,
        tokens,
        duration_ms: response.duration_ms,
      });
      return response;
    } catch (err) {
      failures.push(`ollama: ${err instanceof Error ? err.message : "unknown_error"}`);
    }
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const { content, tokens, model } = await callOpenAi(system, user);
      const parsed = parseJsonFromLlm(content);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("LLM response is not valid JSON object");
      }
      const response: LlmResponse = {
        mode: "real",
        agentId: req.agentId,
        model,
        parsed,
        tokens,
        duration_ms: Date.now() - started,
        fallbackReason: failures.length ? failures.join("; ") : undefined,
      };
      logLlmEvent({
        agentId: req.agentId,
        mode: "real",
        model,
        ok: true,
        tokens,
        fallbackReason: response.fallbackReason,
        duration_ms: response.duration_ms,
      });
      return response;
    } catch (err) {
      failures.push(`openai: ${err instanceof Error ? err.message : "unknown_error"}`);
    }
  }

  return mockFallback(
    req,
    started,
    failures.length > 0 ? failures.join("; ") : "no_llm_provider_available",
  );
}
