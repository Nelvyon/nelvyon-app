"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { NelvyonChatbot } from "./NelvyonChatbot";
import { NelvyonFooter } from "./NelvyonFooter";
import { NelvyonNavbar } from "./NelvyonNavbar";

const ElectricHeroCanvas = dynamic(
  () => import("./ElectricHeroCanvas").then((m) => ({ default: m.ElectricHeroCanvas })),
  { ssr: false },
);

export function NelvyonShell({
  children,
  hero3d = false,
}: {
  children: ReactNode;
  hero3d?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-zinc-100 antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,102,255,0.12),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {hero3d ? <ElectricHeroCanvas /> : null}
      <NelvyonNavbar />
      <main className="relative pt-16 md:pt-[4.5rem]">{children}</main>
      <NelvyonFooter />
      <NelvyonChatbot />
    </div>
  );
}
