/* ─── NELVYON Theme Engine — Personalización Ilimitada ─── */

export interface NelvyonTheme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  preview: string[]; // 4 preview colors
}

export interface ThemeColors {
  // Core
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;

  // Backgrounds
  background: string;
  backgroundAlt: string;
  card: string;
  cardHover: string;

  // Sidebar
  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarTextActive: string;
  sidebarActiveBg: string;

  // Header
  headerBg: string;
  headerBorder: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderHover: string;

  // Status
  success: string;
  warning: string;
  error: string;
  info: string;

  // Gradients (start, end)
  gradientStart: string;
  gradientEnd: string;
  logoGradientStart: string;
  logoGradientEnd: string;
}

export const DEFAULT_COLORS: ThemeColors = {
  primary: "#7C3AED",
  primaryForeground: "#FFFFFF",
  secondary: "#3B82F6",
  secondaryForeground: "#FFFFFF",
  accent: "#06B6D4",
  accentForeground: "#FFFFFF",
  background: "#09090B",
  backgroundAlt: "#0F1419",
  card: "#111113",
  cardHover: "#1A1A1E",
  sidebarBg: "#0A0B0E",
  sidebarBorder: "rgba(124,58,237,0.06)",
  sidebarText: "#64748B",
  sidebarTextActive: "#7C3AED",
  sidebarActiveBg: "rgba(124,58,237,0.1)",
  headerBg: "rgba(9,9,11,0.8)",
  headerBorder: "rgba(255,255,255,0.04)",
  textPrimary: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#52525B",
  border: "rgba(255,255,255,0.04)",
  borderHover: "rgba(255,255,255,0.08)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  gradientStart: "#7C3AED",
  gradientEnd: "#3B82F6",
  logoGradientStart: "#7C3AED",
  logoGradientEnd: "#6D28D9",
};

export const THEME_PRESETS: NelvyonTheme[] = [
  {
    id: "dark-elite",
    name: "Dark Elite",
    description: "El tema por defecto de Nelvyon — Violeta premium sobre negro profundo",
    preview: ["#7C3AED", "#3B82F6", "#09090B", "#111113"],
    colors: { ...DEFAULT_COLORS },
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    description: "Azules profundos del océano — Profesional y sereno",
    preview: ["#0EA5E9", "#06B6D4", "#0A1628", "#0F1D2E"],
    colors: {
      ...DEFAULT_COLORS,
      primary: "#0EA5E9",
      secondary: "#06B6D4",
      accent: "#22D3EE",
      sidebarBg: "#0A1628",
      sidebarBorder: "rgba(14,165,233,0.06)",
      sidebarTextActive: "#0EA5E9",
      sidebarActiveBg: "rgba(14,165,233,0.1)",
      background: "#0A1628",
      backgroundAlt: "#0F1D2E",
      card: "#0D1B2A",
      cardHover: "#132D46",
      gradientStart: "#0EA5E9",
      gradientEnd: "#06B6D4",
      logoGradientStart: "#0EA5E9",
      logoGradientEnd: "#0284C7",
    },
  },
  {
    id: "emerald-forest",
    name: "Emerald Forest",
    description: "Verdes esmeralda — Naturaleza y crecimiento",
    preview: ["#10B981", "#059669", "#0A1A14", "#0F2419"],
    colors: {
      ...DEFAULT_COLORS,
      primary: "#10B981",
      secondary: "#059669",
      accent: "#34D399",
      sidebarBg: "#0A1A14",
      sidebarBorder: "rgba(16,185,129,0.06)",
      sidebarTextActive: "#10B981",
      sidebarActiveBg: "rgba(16,185,129,0.1)",
      background: "#0A1A14",
      backgroundAlt: "#0F2419",
      card: "#0D1F17",
      cardHover: "#153326",
      gradientStart: "#10B981",
      gradientEnd: "#059669",
      logoGradientStart: "#10B981",
      logoGradientEnd: "#047857",
    },
  },
  {
    id: "sunset-fire",
    name: "Sunset Fire",
    description: "Naranjas y rojos cálidos — Energía y pasión",
    preview: ["#F97316", "#EF4444", "#1A0F0A", "#241510"],
    colors: {
      ...DEFAULT_COLORS,
      primary: "#F97316",
      secondary: "#EF4444",
      accent: "#FBBF24",
      sidebarBg: "#1A0F0A",
      sidebarBorder: "rgba(249,115,22,0.06)",
      sidebarTextActive: "#F97316",
      sidebarActiveBg: "rgba(249,115,22,0.1)",
      background: "#1A0F0A",
      backgroundAlt: "#241510",
      card: "#1F120D",
      cardHover: "#2D1B14",
      gradientStart: "#F97316",
      gradientEnd: "#EF4444",
      logoGradientStart: "#F97316",
      logoGradientEnd: "#EA580C",
    },
  },
  {
    id: "royal-gold",
    name: "Royal Gold",
    description: "Dorado y púrpura — Lujo y exclusividad",
    preview: ["#F59E0B", "#A855F7", "#140F0A", "#1E1710"],
    colors: {
      ...DEFAULT_COLORS,
      primary: "#F59E0B",
      secondary: "#A855F7",
      accent: "#FBBF24",
      sidebarBg: "#140F0A",
      sidebarBorder: "rgba(245,158,11,0.06)",
      sidebarTextActive: "#F59E0B",
      sidebarActiveBg: "rgba(245,158,11,0.1)",
      background: "#140F0A",
      backgroundAlt: "#1E1710",
      card: "#19130D",
      cardHover: "#261D14",
      gradientStart: "#F59E0B",
      gradientEnd: "#A855F7",
      logoGradientStart: "#F59E0B",
      logoGradientEnd: "#D97706",
    },
  },
  {
    id: "neon-cyber",
    name: "Neon Cyber",
    description: "Cyberpunk neón — Futurista y vibrante",
    preview: ["#E879F9", "#22D3EE", "#0A0A14", "#10101E"],
    colors: {
      ...DEFAULT_COLORS,
      primary: "#E879F9",
      secondary: "#22D3EE",
      accent: "#A78BFA",
      sidebarBg: "#0A0A14",
      sidebarBorder: "rgba(232,121,249,0.06)",
      sidebarTextActive: "#E879F9",
      sidebarActiveBg: "rgba(232,121,249,0.1)",
      background: "#0A0A14",
      backgroundAlt: "#10101E",
      card: "#0D0D18",
      cardHover: "#161624",
      gradientStart: "#E879F9",
      gradientEnd: "#22D3EE",
      logoGradientStart: "#E879F9",
      logoGradientEnd: "#C026D3",
    },
  },
  {
    id: "arctic-ice",
    name: "Arctic Ice",
    description: "Blancos y azules helados — Limpio y minimalista",
    preview: ["#60A5FA", "#93C5FD", "#0B1120", "#101828"],
    colors: {
      ...DEFAULT_COLORS,
      primary: "#60A5FA",
      secondary: "#93C5FD",
      accent: "#38BDF8",
      sidebarBg: "#0B1120",
      sidebarBorder: "rgba(96,165,250,0.06)",
      sidebarTextActive: "#60A5FA",
      sidebarActiveBg: "rgba(96,165,250,0.1)",
      background: "#0B1120",
      backgroundAlt: "#101828",
      card: "#0D1424",
      cardHover: "#152036",
      gradientStart: "#60A5FA",
      gradientEnd: "#93C5FD",
      logoGradientStart: "#60A5FA",
      logoGradientEnd: "#3B82F6",
    },
  },
  {
    id: "rose-blush",
    name: "Rose Blush",
    description: "Rosas suaves — Elegante y femenino",
    preview: ["#F472B6", "#FB7185", "#1A0A14", "#240F1A"],
    colors: {
      ...DEFAULT_COLORS,
      primary: "#F472B6",
      secondary: "#FB7185",
      accent: "#F9A8D4",
      sidebarBg: "#1A0A14",
      sidebarBorder: "rgba(244,114,182,0.06)",
      sidebarTextActive: "#F472B6",
      sidebarActiveBg: "rgba(244,114,182,0.1)",
      background: "#1A0A14",
      backgroundAlt: "#240F1A",
      card: "#1F0D17",
      cardHover: "#2D1422",
      gradientStart: "#F472B6",
      gradientEnd: "#FB7185",
      logoGradientStart: "#F472B6",
      logoGradientEnd: "#EC4899",
    },
  },
];

/** Convert ThemeColors to CSS custom properties */
export function themeToCSSVars(colors: ThemeColors): Record<string, string> {
  return {
    "--nv-primary": colors.primary,
    "--nv-primary-fg": colors.primaryForeground,
    "--nv-secondary": colors.secondary,
    "--nv-secondary-fg": colors.secondaryForeground,
    "--nv-accent": colors.accent,
    "--nv-accent-fg": colors.accentForeground,
    "--nv-bg": colors.background,
    "--nv-bg-alt": colors.backgroundAlt,
    "--nv-card": colors.card,
    "--nv-card-hover": colors.cardHover,
    "--nv-sidebar-bg": colors.sidebarBg,
    "--nv-sidebar-border": colors.sidebarBorder,
    "--nv-sidebar-text": colors.sidebarText,
    "--nv-sidebar-text-active": colors.sidebarTextActive,
    "--nv-sidebar-active-bg": colors.sidebarActiveBg,
    "--nv-header-bg": colors.headerBg,
    "--nv-header-border": colors.headerBorder,
    "--nv-text": colors.textPrimary,
    "--nv-text-secondary": colors.textSecondary,
    "--nv-text-muted": colors.textMuted,
    "--nv-border": colors.border,
    "--nv-border-hover": colors.borderHover,
    "--nv-success": colors.success,
    "--nv-warning": colors.warning,
    "--nv-error": colors.error,
    "--nv-info": colors.info,
    "--nv-gradient-start": colors.gradientStart,
    "--nv-gradient-end": colors.gradientEnd,
    "--nv-logo-start": colors.logoGradientStart,
    "--nv-logo-end": colors.logoGradientEnd,
  };
}

/** Hex to rgba */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Get a theme by ID */
export function getThemeById(id: string): NelvyonTheme | undefined {
  return THEME_PRESETS.find((t) => t.id === id);
}

/** Storage key */
const STORAGE_KEY = "nelvyon_theme";

/** Save theme to localStorage */
export function saveTheme(theme: NelvyonTheme): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
}

/** Load theme from localStorage */
export function loadTheme(): NelvyonTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NelvyonTheme;
  } catch (err) {
    return null;
  }
}

/** Color categories for the settings UI */
export const COLOR_CATEGORIES = [
  {
    label: "Colores Principales",
    keys: ["primary", "secondary", "accent"] as (keyof ThemeColors)[],
  },
  {
    label: "Fondos",
    keys: ["background", "backgroundAlt", "card", "cardHover"] as (keyof ThemeColors)[],
  },
  {
    label: "Sidebar",
    keys: ["sidebarBg", "sidebarText", "sidebarTextActive", "sidebarActiveBg"] as (keyof ThemeColors)[],
  },
  {
    label: "Texto",
    keys: ["textPrimary", "textSecondary", "textMuted"] as (keyof ThemeColors)[],
  },
  {
    label: "Gradientes & Logo",
    keys: ["gradientStart", "gradientEnd", "logoGradientStart", "logoGradientEnd"] as (keyof ThemeColors)[],
  },
  {
    label: "Estados",
    keys: ["success", "warning", "error", "info"] as (keyof ThemeColors)[],
  },
];

/** Friendly labels for color keys */
export const COLOR_LABELS: Record<string, string> = {
  primary: "Primario",
  primaryForeground: "Texto Primario",
  secondary: "Secundario",
  secondaryForeground: "Texto Secundario",
  accent: "Acento",
  accentForeground: "Texto Acento",
  background: "Fondo Principal",
  backgroundAlt: "Fondo Alternativo",
  card: "Tarjeta",
  cardHover: "Tarjeta Hover",
  sidebarBg: "Fondo Sidebar",
  sidebarBorder: "Borde Sidebar",
  sidebarText: "Texto Sidebar",
  sidebarTextActive: "Texto Activo Sidebar",
  sidebarActiveBg: "Fondo Activo Sidebar",
  headerBg: "Fondo Header",
  headerBorder: "Borde Header",
  textPrimary: "Texto Principal",
  textSecondary: "Texto Secundario",
  textMuted: "Texto Muted",
  border: "Borde",
  borderHover: "Borde Hover",
  success: "Éxito",
  warning: "Advertencia",
  error: "Error",
  info: "Información",
  gradientStart: "Gradiente Inicio",
  gradientEnd: "Gradiente Fin",
  logoGradientStart: "Logo Gradiente Inicio",
  logoGradientEnd: "Logo Gradiente Fin",
};