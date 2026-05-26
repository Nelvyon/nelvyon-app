/** NELVYON v10 — dark theme tokens */
export const BRAND = {
  blue: "#0066FF",
  cyan: "#00CFFF",
  bg: "#050816",
  bgSection: "#0a0f1e",
  bgHero: "#000000",
  card: "#0a0f1e",
  cardBorder: "#1e293b",
  textPrimary: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#E0E0E0",
  textDim: "#94A3B8",
  footer: "#0a0f1e",
  heroGradEnd: "#001533",
  /** Legacy aliases — map to dark */
  white: "#050816",
  bgSoft: "#0a0f1e",
  bgAlt: "#0a0f1e",
  bgLight: "#0a0f1e",
  borderLight: "#1e293b",
  textOnWhite: "#FFFFFF",
  textGray: "#94A3B8",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/saas", label: "SaaS" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
] as const;

export type NavActive = "/" | "/servicios" | "/saas" | "/nosotros" | "/contacto";

export function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}
