/**
 * Escape untrusted strings for HTML text/attribute contexts.
 * Prevents stored XSS when interpolating DB/user fields into HTML artefacts.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Minimal rich-HTML sanitizer (no new dependency).
 * Strips scripts/iframes, inline event handlers, and javascript:/data HTML URLs.
 */
export function sanitizeRichHtml(html: string): string {
  let out = html;
  out = out.replace(/<\s*(script|iframe|object|embed|link|meta|base|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  out = out.replace(/<\s*(script|iframe|object|embed|link|meta|base|form)[^>]*\/?\s*>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=$2#$2");
  out = out.replace(/(href|src)\s*=\s*(["'])\s*data:text\/html[^"']*\2/gi, "$1=$2#$2");
  return out;
}
