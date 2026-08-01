"use client";

import type { ReactNode } from "react";

import { PublicShell } from "@/features/public-web";

/** Chrome unificado del sitio público NELVYON. */
export function MarketingChrome({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
