import { THEME_STORAGE_KEY } from "@/core/theme/themeStorage";

/**
 * Inline script for <head> — runs before paint to avoid theme flash.
 * Logic mirrors `resolveIsDark(readExplicitTheme(), prefersDark)`.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var v=localStorage.getItem(k);var prefers=matchMedia("(prefers-color-scheme: dark)").matches;var dark=v==="dark"||(v!=="light"&&prefers);if(dark)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;
