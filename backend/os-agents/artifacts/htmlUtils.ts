/** Shared HTML helpers for deterministic OS artifact builders (MIG 303/304). */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Tolerates LLM JSON with single quotes or trailing commas. */
export function parseLooseJson<T extends Record<string, unknown>>(raw: string, fallback: T): T {
  const trimmed = raw.trim();
  if (!trimmed) return { ...fallback };
  const attempts = [trimmed, trimmed.replace(/'/g, '"').replace(/,\s*([}\]])/g, "$1")];
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate) as T;
      if (parsed && typeof parsed === "object") return { ...fallback, ...parsed };
    } catch {
      /* try next */
    }
  }
  return { ...fallback };
}

export function isValidHtmlDocument(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("<!doctype") &&
    lower.includes("<html") &&
    lower.includes("<head") &&
    lower.includes("<body")
  );
}

export function pickColor(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const v = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  if (v.startsWith("rgb")) return v;
  return fallback;
}
