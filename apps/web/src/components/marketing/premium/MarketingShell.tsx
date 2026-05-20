"use client";

import type { ReactNode } from "react";

import { GradientBg } from "./GradientBg";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNavbar } from "./MarketingNavbar";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 antialiased">
      <GradientBg />
      <MarketingNavbar />
      <main className="pt-16 md:pt-[4.5rem]">{children}</main>
      <MarketingFooter />
    </div>
  );
}
