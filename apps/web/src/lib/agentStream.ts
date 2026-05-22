import { apiClient } from "@/core/api";

export type AgentStreamMessage = {
  role: string;
  content: string;
};

export type StreamAgentChatParams = {
  messages: AgentStreamMessage[];
  serviceId?: string;
  clientId?: string;
  clientContext?: Record<string, unknown>;
  model?: string;
  onChunk: (delta: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

function parseSsePayload(raw: string): { content?: string; error?: string } | null {
  const payload = raw.trim();
  if (!payload || payload === "[DONE]") {
    return null;
  }
  try {
    return JSON.parse(payload) as { content?: string; error?: string };
  } catch {
    return null;
  }
}

/**
 * Consume POST /api/agents/stream (FastAPI SSE) and invoke onChunk for each token delta.
 */
export async function streamAgentChat(params: StreamAgentChatParams): Promise<void> {
  let response: Response;
  try {
    response = await apiClient.postStream(
      "/api/agents/stream",
      {
        messages: params.messages,
        service_id: params.serviceId ?? null,
        client_id: params.clientId ?? null,
        client_context: params.clientContext ?? null,
        model: params.model ?? null,
      },
      { tenantScoped: true, signal: params.signal },
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Stream request failed");
    params.onError?.(error);
    throw error;
  }

  if (!response.body) {
    const error = new Error("Stream response has no body");
    params.onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const eventBlock = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of eventBlock.split("\n")) {
          if (!line.startsWith("data:")) {
            continue;
          }
          const dataValue = line.slice(5).trimStart();
          if (dataValue === "[DONE]") {
            params.onDone?.();
            return;
          }
          const parsed = parseSsePayload(dataValue);
          if (parsed?.error) {
            throw new Error(parsed.error);
          }
          if (parsed?.content) {
            params.onChunk(parsed.content);
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.split("\n")) {
        if (!line.startsWith("data:")) {
          continue;
        }
        const dataValue = line.slice(5).trimStart();
        if (dataValue === "[DONE]") {
          params.onDone?.();
          return;
        }
        const parsed = parseSsePayload(dataValue);
        if (parsed?.error) {
          throw new Error(parsed.error);
        }
        if (parsed?.content) {
          params.onChunk(parsed.content);
        }
      }
    }

    params.onDone?.();
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Stream read failed");
    params.onError?.(error);
    throw error;
  }
}
