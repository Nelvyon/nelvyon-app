"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PanelCard } from "@/core/ui/PanelCard";
import { PACK_FOCUS_COPY, resolvePackFocus } from "@/lib/saas/packFocusCopy";

function PackKickoffBannerInner() {
  const focus = resolvePackFocus(useSearchParams().get("focus"));
  if (!focus) return null;

  const copy = PACK_FOCUS_COPY[focus];
  return (
    <PanelCard className="border-primary/30 bg-primary/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{copy.title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{copy.hint}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Entraste desde <strong>{copy.catalogPackName}</strong> — pulsa{" "}
        <strong>Lanzar con plantilla demo (1 clic)</strong> para ver el flujo completo.
      </p>
    </PanelCard>
  );
}

export function PackKickoffBanner() {
  return (
    <Suspense fallback={null}>
      <PackKickoffBannerInner />
    </Suspense>
  );
}
