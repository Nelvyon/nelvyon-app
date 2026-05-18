/**
 * NELVYON typography scale — pairs with Tailwind `text-page`, `text-section`, etc. where extended.
 */

export const nelvyonFontFamilies = {
  /** System stack tuned for crisp UI (Apple-like rendering on macOS/iOS). */
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  /** Reserved for future display / marketing lockups. */
  display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

export type NelvyonFontWeight = "400" | "500" | "600" | "700";

export const nelvyonFontWeights: Record<string, NelvyonFontWeight> = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export interface NelvyonTypeStep {
  id: string;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacing?: string;
  weight: NelvyonFontWeight;
  usage: string;
}

/** Editorial scale — dense headings, airy body (Linear-style information density). */
export const nelvyonTypeScale: readonly NelvyonTypeStep[] = [
  { id: "display", fontSizePx: 30, lineHeightPx: 36, letterSpacing: "-0.03em", weight: "600", usage: "Hero / OS reference titles" },
  { id: "title", fontSizePx: 22, lineHeightPx: 28, letterSpacing: "-0.02em", weight: "600", usage: "Page H1" },
  { id: "subtitle", fontSizePx: 17, lineHeightPx: 24, letterSpacing: "-0.01em", weight: "500", usage: "Lead sentences" },
  { id: "body", fontSizePx: 14, lineHeightPx: 22, weight: "400", usage: "Default UI copy" },
  { id: "small", fontSizePx: 13, lineHeightPx: 20, weight: "400", usage: "Secondary labels" },
  { id: "caption", fontSizePx: 12, lineHeightPx: 16, weight: "500", usage: "Captions, table headers" },
  { id: "micro", fontSizePx: 11, lineHeightPx: 14, letterSpacing: "0.04em", weight: "600", usage: "Uppercase metadata" },
] as const;
