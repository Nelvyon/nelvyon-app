import type { ReactNode } from "react";

import { LandingFooter } from "./LandingFooter";
import { MarketingNavbar } from "./MarketingNavbar";
import { BRAND } from "./shared";

export function MarketingLegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: BRAND.white, color: BRAND.textOnWhite, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <MarketingNavbar />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">{title}</h1>
        <div className="prose prose-zinc mt-10 max-w-none prose-headings:font-bold prose-a:text-[#0066FF] prose-p:text-zinc-600">
          {children}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
