"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  applyDarkClassToDocument,
  readExplicitTheme,
  resolveIsDark,
  writeExplicitTheme,
} from "@/core/theme/themeStorage";

type ThemeContextValue = {
  /** User choice once they toggle; null until then means “follow OS”. */
  explicit: "light" | "dark" | null;
  resolvedDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [explicit, setExplicit] = useState<"light" | "dark" | null>(null);
  const [prefersDark, setPrefersDark] = useState(false);

  useLayoutEffect(() => {
    const ex = readExplicitTheme();
    const pd = readPrefersDark();
    setExplicit(ex);
    setPrefersDark(pd);
    applyDarkClassToDocument(resolveIsDark(ex, pd));
  }, []);

  const resolvedDark = resolveIsDark(explicit, prefersDark);

  useEffect(() => {
    applyDarkClassToDocument(resolvedDark);
  }, [resolvedDark]);

  useEffect(() => {
    if (explicit !== null) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setPrefersDark(mq.matches);
      applyDarkClassToDocument(resolveIsDark(null, mq.matches));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [explicit]);

  const toggleTheme = useCallback(() => {
    const nextExplicit: "light" | "dark" = resolvedDark ? "light" : "dark";
    writeExplicitTheme(nextExplicit);
    setExplicit(nextExplicit);
    applyDarkClassToDocument(nextExplicit === "dark");
  }, [resolvedDark]);

  const value = useMemo(
    () => ({ explicit, resolvedDark, toggleTheme }),
    [explicit, resolvedDark, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
