/**
 * Frente 58 — Encrypted agent prompt vault (runtime fetch from backend DB).
 * Agent TS files reference agent IDs only; plaintext prompts never live in repo after migration.
 */

export type AgentPromptBundle = {
  elite_role: string;
  mission: string;
  few_shot: string;
};

const cache = new Map<string, AgentPromptBundle>();

function backendBase(): string {
  return (
    process.env.PYTHON_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
}

export async function resolveAgentPrompts(agentId: string): Promise<AgentPromptBundle> {
  const id = agentId.trim().toLowerCase();
  const hit = cache.get(id);
  if (hit) return hit;

  const secret = process.env.INTERNAL_AGENT_PROMPT_SECRET?.trim();
  const headers: Record<string, string> = {};
  if (secret) headers["X-Internal-Secret"] = secret;

  try {
    const res = await fetch(`${backendBase()}/api/internal/agent-prompts/${encodeURIComponent(id)}`, {
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as AgentPromptBundle;
      cache.set(id, data);
      return data;
    }
  } catch {
    /* vault unavailable — test fallback */
  }

  const fallback: AgentPromptBundle = {
    elite_role: "NELVYON OS Agent",
    mission: "Execute the sector task with elite quality standards.",
    few_shot: '{"content":"…","score":90,"highlights":[],"metrics":[]}',
  };
  cache.set(id, fallback);
  return fallback;
}

export function clearAgentPromptCache(): void {
  cache.clear();
}
