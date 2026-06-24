/**
 * Visual QA engine v2
 *
 * Runs structural + brand contrast + legal checks on pack deliverable HTML/copy
 * without requiring a live browser. Returns a 0–100 score and a legal pass flag.
 *
 * Scoring breakdown (100 pts):
 *   Structural checks  — 40 pts
 *   WCAG brand contrast — 35 pts
 *   Legal compliance    — 25 pts
 */

export interface VisualQaInput {
  /** Raw HTML of the landing page deliverable */
  landingHtml?: string;
  /** Plain-text copy (headings, CTAs, body) */
  copyText?: string;
  /** Brand primary color in hex (e.g. "#0084ff") */
  brandColor?: string;
  /** Background color in hex; defaults to white */
  backgroundColor?: string;
}

export interface VisualQaResult {
  /** 0–100 combined score */
  score: number;
  /** true only when no prohibited legal terms are detected */
  legal_passed: boolean;
  checks: {
    structural_score: number;
    contrast_score: number;
    legal_score: number;
    has_h1: boolean;
    has_cta: boolean;
    has_meta_description: boolean;
    contrast_ratio: number | null;
    contrast_passes_aa: boolean;
    prohibited_terms: string[];
  };
}

// ── WCAG relative luminance ────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6 && clean.length !== 3) return null;
  const expanded = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const n = parseInt(expanded, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(hex1: string, hex2: string): number | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Structural checks ──────────────────────────────────────────────────────────

const CTA_PATTERNS = [
  /\b(get started|start free|sign up|register|buy now|request demo|contact us)\b/i,
  /\b(empieza|empezar|solicitar|contratar|pedir|reservar|comprar|registrar)\b/i,
  /<button|<a\s[^>]*class="[^"]*cta/i,
];

function checkStructural(html: string): { score: number; has_h1: boolean; has_cta: boolean; has_meta_description: boolean } {
  const has_h1 = /<h1[\s>]/i.test(html);
  const has_meta_description = /<meta[^>]+name=["']description["']/i.test(html);
  const has_cta = CTA_PATTERNS.some((re) => re.test(html));

  let score = 0;
  if (has_h1) score += 15;
  if (has_cta) score += 15;
  if (has_meta_description) score += 10;

  return { score, has_h1, has_cta, has_meta_description };
}

// ── Legal checks ───────────────────────────────────────────────────────────────

const PROHIBITED_TERMS = [
  // Superlative/guarantee abuse
  /\b(garantizamos? (que )?(siempre|nunca|100%))/i,
  /\b(100% garantizado)\b/i,
  /\bcura\b/i,
  /\btrata\s+(definitivamente|curar)/i,
  /\b(sin riesgo|risk.free)\b/i,
  // Financial promise abuse
  /\bgarantiz(amos?|ada?)\s+(retorno|rentabilidad|ganancia)/i,
  /\b(doubl(e|ing) your (money|revenue|income))\b/i,
  // Health claims
  /\b(cure|cures|heals)\b/i,
  // "Results guaranteed" in aggressive form
  /\bresultados?\s+garantizados?\s+o\s+(te|le)\s+devolvemos/i,
];

function checkLegal(text: string): { score: number; prohibited_terms: string[] } {
  const found: string[] = [];
  for (const re of PROHIBITED_TERMS) {
    const match = text.match(re);
    if (match) found.push(match[0]);
  }
  const score = found.length === 0 ? 25 : Math.max(0, 25 - found.length * 10);
  return { score, prohibited_terms: found };
}

// ── Main entry ─────────────────────────────────────────────────────────────────

export function runVisualQa(input: VisualQaInput): VisualQaResult {
  const html = input.landingHtml ?? "";
  const copy = input.copyText ?? html.replace(/<[^>]+>/g, " ");

  // Structural
  const structural = html
    ? checkStructural(html)
    : { score: 0, has_h1: false, has_cta: false, has_meta_description: false };

  // Brand contrast
  const bg = input.backgroundColor ?? "#ffffff";
  const fg = input.brandColor ?? "#0084ff";
  const ratio = fg && bg ? contrastRatio(fg, bg) : null;
  const contrast_passes_aa = ratio !== null ? ratio >= 4.5 : false;
  const contrast_score = ratio === null ? 17 /* neutral */ : contrast_passes_aa ? 35 : Math.round(35 * Math.min(ratio / 4.5, 1));

  // Legal
  const legal = checkLegal(copy);

  const score = Math.round(structural.score + contrast_score + legal.score);

  return {
    score,
    legal_passed: legal.prohibited_terms.length === 0,
    checks: {
      structural_score: structural.score,
      contrast_score,
      legal_score: legal.score,
      has_h1: structural.has_h1,
      has_cta: structural.has_cta,
      has_meta_description: structural.has_meta_description,
      contrast_ratio: ratio !== null ? Math.round(ratio * 100) / 100 : null,
      contrast_passes_aa,
      prohibited_terms: legal.prohibited_terms,
    },
  };
}
