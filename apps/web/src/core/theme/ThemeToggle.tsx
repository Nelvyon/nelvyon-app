"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedDark, toggleTheme } = useTheme();

  return (
    <Button
      aria-label={resolvedDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn("shrink-0", className)}
      onClick={toggleTheme}
      size="sm"
      type="button"
      variant="outline"
    >
      {resolvedDark ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
    </Button>
  );
}
