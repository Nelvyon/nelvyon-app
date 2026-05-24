"use client";

import type { ReactNode } from "react";

import { FadeUp } from "./FadeUp";
import { NelvyonShell } from "./NelvyonShell";

export function LegalDocLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <NelvyonShell>
      <article className="px-4 py-16 md:px-6 md:py-24">
        <FadeUp className="prose prose-invert prose-zinc mx-auto max-w-3xl prose-headings:text-white prose-a:text-[#0066FF]">
          <h1>{title}</h1>
          {children}
        </FadeUp>
      </article>
    </NelvyonShell>
  );
}
