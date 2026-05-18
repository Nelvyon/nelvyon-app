import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  type NelvyonTheme,
  type ThemeColors,
  THEME_PRESETS,
  DEFAULT_COLORS,
  themeToCSSVars,
  saveTheme,
  loadTheme,
} from "@/lib/theme-engine";

interface ThemeContextType {
  currentTheme: NelvyonTheme;
  setTheme: (theme: NelvyonTheme) => void;
  setThemeById: (id: string) => void;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  resetTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

function applyCSS(colors: ThemeColors) {
  const vars = themeToCSSVars(colors);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<NelvyonTheme>(() => {
    const saved = loadTheme();
    return saved || THEME_PRESETS[0];
  });

  useEffect(() => {
    applyCSS(currentTheme.colors);
  }, [currentTheme]);

  const setTheme = useCallback((theme: NelvyonTheme) => {
    setCurrentTheme(theme);
    saveTheme(theme);
  }, []);

  const setThemeById = useCallback((id: string) => {
    const found = THEME_PRESETS.find((t) => t.id === id);
    if (found) {
      setCurrentTheme(found);
      saveTheme(found);
    }
  }, []);

  const updateColor = useCallback((key: keyof ThemeColors, value: string) => {
    setCurrentTheme((prev) => {
      const updated: NelvyonTheme = {
        ...prev,
        id: "custom",
        name: "Personalizado",
        description: "Tema personalizado",
        colors: { ...prev.colors, [key]: value },
      };
      saveTheme(updated);
      return updated;
    });
  }, []);

  const resetTheme = useCallback(() => {
    const defaultTheme = THEME_PRESETS[0];
    setCurrentTheme(defaultTheme);
    saveTheme(defaultTheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        setThemeById,
        updateColor,
        resetTheme,
        colors: currentTheme.colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};