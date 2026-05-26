/** NELVYON marketing brand tokens — electric blue, not GHL blue */
export const BRAND = {
  blue: "#0066FF",
  cyan: "#00CFFF",
  bg: "#000000",
  bgSoft: "#0A0A0A",
  bgAlt: "#050510",
  bgLight: "#F9FAFB",
  white: "#FFFFFF",
  footer: "#0A0A0A",
  card: "#0A0F1E",
  cardBorder: "rgba(0, 102, 255, 0.125)",
  borderLight: "#E5E7EB",
  textMuted: "#E0E0E0",
  textDim: "#9CA3AF",
  textOnWhite: "#111827",
  textGray: "#6B7280",
  heroGradEnd: "#001533",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/saas", label: "SaaS" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
] as const;

export type NavActive = "/" | "/servicios" | "/saas" | "/nosotros" | "/contacto";
