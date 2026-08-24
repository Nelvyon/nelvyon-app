/**
 * Frente 58 — Encrypted agent prompt vault (runtime fetch from backend DB).
 * Agent TS files reference agent IDs only; plaintext prompts never live in repo after migration.
 */

export type AgentPromptBundle = {
  elite_role: string;
  mission: string;
  few_shot: string;
  /**
   * De donde salio este prompt.
   *
   * `"vault"` es el prompt real del agente. `"fallback"` es un sustituto
   * generico que se usa cuando el almacen no responde.
   *
   * Existe porque sin el la degradacion era INVISIBLE: quien llamaba recibia un
   * objeto con la misma forma y no podia saber si estaba trabajando con el
   * estandar del agente o con tres frases de relleno. Un agente Premium
   * ejecutando con el prompt generico produce algo que parece un entregable y
   * no lo es.
   */
  fuente: "vault" | "fallback";
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
      const data = (await res.json()) as Omit<AgentPromptBundle, "fuente">;
      const bundle: AgentPromptBundle = { ...data, fuente: "vault" };
      cache.set(id, bundle);
      return bundle;
    }
  } catch {
    /* almacen no disponible: se usa el sustituto, declarado como tal */
  }

  // EL SUSTITUTO NO SE CACHEA.
  //
  // Antes si, y eso convertia un corte de red de un segundo en una degradacion
  // PERMANENTE: el primer intento fallaba, el generico entraba en la cache, y
  // todas las llamadas siguientes lo devolvian sin volver a preguntar. El
  // agente quedaba trabajando con tres frases de relleno durante toda la vida
  // del proceso, y nadie se enteraba porque la forma del objeto era la misma.
  //
  // Sin cachearlo, el siguiente intento vuelve a probar el almacen. Cuesta una
  // peticion fallida de mas; recuperarse solo lo vale.
  return {
    elite_role: "NELVYON OS Agent",
    mission: "Execute the sector task with elite quality standards.",
    few_shot: '{"content":"…","score":90,"highlights":[],"metrics":[]}',
    fuente: "fallback",
  };
}

export function clearAgentPromptCache(): void {
  cache.clear();
}
