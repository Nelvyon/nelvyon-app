/** Extract JSON from LLM text responses */

export function parseJsonFromLlm<T = unknown>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates: string[] = [trimmed];

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());

  const startObj = trimmed.indexOf("{");
  const endObj = trimmed.lastIndexOf("}");
  if (startObj >= 0 && endObj > startObj) {
    candidates.push(trimmed.slice(startObj, endObj + 1));
  }

  const startArr = trimmed.indexOf("[");
  const endArr = trimmed.lastIndexOf("]");
  if (startArr >= 0 && endArr > startArr) {
    candidates.push(trimmed.slice(startArr, endArr + 1));
  }

  for (const raw of candidates) {
    const attempts = [raw, raw.replace(/,\s*([}\]])/g, "$1")];
    for (const candidate of attempts) {
      try {
        const parsed = JSON.parse(candidate) as T;
        if (parsed !== null && typeof parsed === "object") return parsed;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}
