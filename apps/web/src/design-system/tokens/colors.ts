/**
 * NELVYON Design System v1 — color tokens (documentation + programmatic access).
 * Runtime UI maps to CSS variables in `globals.css` (Tailwind `primary`, `muted`, etc.).
 */

export type HslTriplet = `${number} ${number}% ${number}%`;

export interface NelvyonSemanticColors {
  background: HslTriplet;
  foreground: HslTriplet;
  card: HslTriplet;
  cardForeground: HslTriplet;
  muted: HslTriplet;
  mutedForeground: HslTriplet;
  border: HslTriplet;
  input: HslTriplet;
  ring: HslTriplet;
  primary: HslTriplet;
  primaryForeground: HslTriplet;
  secondary: HslTriplet;
  secondaryForeground: HslTriplet;
  accent: HslTriplet;
  accentForeground: HslTriplet;
  destructive: HslTriplet;
  destructiveForeground: HslTriplet;
  warning: HslTriplet;
  warningForeground: HslTriplet;
  success: HslTriplet;
  successForeground: HslTriplet;
  link: HslTriplet;
  linkHover: HslTriplet;
}

/** Light canvas — cool slate neutrals, crisp blue primary (Stripe-adjacent discipline). */
export const nelvyonColorsLight: NelvyonSemanticColors = {
  background: "210 20% 98%",
  foreground: "222 47% 11%",
  card: "0 0% 100%",
  cardForeground: "222 47% 11%",
  muted: "214 32% 94%",
  mutedForeground: "215 18% 36%",
  border: "214 24% 82%",
  input: "214 24% 82%",
  ring: "221 83% 53%",
  primary: "221 83% 45%",
  primaryForeground: "210 40% 98%",
  secondary: "214 32% 92%",
  secondaryForeground: "222 47% 11%",
  accent: "214 32% 93%",
  accentForeground: "222 47% 11%",
  destructive: "0 72% 51%",
  destructiveForeground: "0 0% 100%",
  warning: "38 92% 50%",
  warningForeground: "26 88% 12%",
  success: "142 76% 32%",
  successForeground: "144 65% 12%",
  link: "221 83% 40%",
  linkHover: "224 76% 38%",
};

/** Dark canvas — Linear-like depth, elevated cards, readable secondary text. */
export const nelvyonColorsDark: NelvyonSemanticColors = {
  background: "224 71% 4%",
  foreground: "213 31% 91%",
  card: "222 42% 10%",
  cardForeground: "213 31% 91%",
  muted: "217 33% 14%",
  mutedForeground: "215 18% 72%",
  border: "217 22% 24%",
  input: "217 22% 24%",
  ring: "217 91% 60%",
  primary: "217 91% 60%",
  primaryForeground: "222 47% 11%",
  secondary: "217 33% 16%",
  secondaryForeground: "213 31% 91%",
  accent: "217 33% 17%",
  accentForeground: "213 31% 91%",
  destructive: "0 62% 45%",
  destructiveForeground: "0 0% 98%",
  warning: "38 92% 50%",
  warningForeground: "43 96% 93%",
  success: "142 70% 45%",
  successForeground: "144 55% 94%",
  link: "213 94% 68%",
  linkHover: "217 91% 75%",
};

/** Brand accents for charts, badges, and future marketing surfaces (not all wired to CSS yet). */
export const nelvyonBrandPrimitives = {
  iris: "258 86% 58%",
  irisMuted: "258 32% 92%",
  tealSignal: "173 58% 39%",
  paper: "40 35% 97%",
} as const;

export const nelvyonColors = {
  light: nelvyonColorsLight,
  dark: nelvyonColorsDark,
  brand: nelvyonBrandPrimitives,
} as const;
