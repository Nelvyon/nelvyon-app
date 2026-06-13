import { cn } from "@/core/ui/utils";
import type { ReactNode } from "react";

type PanelCardProps = {
  children: ReactNode;
  className?: string;
  /** Optional accent gradient class on the card shell */
  accent?: string;
};

/** Reusable elevated surface — swap themes via CSS variables in globals.css */
export function PanelCard({ children, className, accent }: PanelCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-card sm:p-6",
        accent && `bg-gradient-to-br ${accent}`,
        className,
      )}
    >
      {children}
    </div>
  );
}
