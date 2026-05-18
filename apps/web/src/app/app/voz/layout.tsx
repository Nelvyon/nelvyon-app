"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";

export default function VozAppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isOverview = pathname === "/app/voz";
  const isInbound = pathname.startsWith("/app/voz/inbound");
  const isSynth = pathname.startsWith("/app/voz/outbound-synth");

  const cls = (active: boolean) =>
    `text-sm underline ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`;

  return (
    <ProtectedLayout module="voice">
      <div className="space-y-6">
        <nav aria-label="VOZ sections" className="flex flex-wrap gap-4 border-b border-border pb-3">
          <Link className={cls(isOverview)} href="/app/voz">
            Overview
          </Link>
          <Link className={cls(isInbound)} href="/app/voz/inbound">
            Inbound (v2)
          </Link>
          <Link className={cls(isSynth)} href="/app/voz/outbound-synth">
            Browser synth (v2)
          </Link>
        </nav>
        {children}
      </div>
    </ProtectedLayout>
  );
}
