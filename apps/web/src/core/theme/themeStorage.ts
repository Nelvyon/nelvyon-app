/** localStorage key for explicit light/dark choice (null = follow OS until user toggles). */
export const THEME_STORAGE_KEY = "nelvyon.theme";

export type ExplicitTheme = "light" | "dark";

export function readExplicitTheme(): ExplicitTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeExplicitTheme(theme: ExplicitTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Whether dark mode should be active for the given preference + OS. */
export function resolveIsDark(explicit: ExplicitTheme | null, prefersDark: boolean): boolean {
  if (explicit === "dark") return true;
  if (explicit === "light") return false;
  return prefersDark;
}

export function applyDarkClassToDocument(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
}
