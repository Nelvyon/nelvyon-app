"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { NELVYON } from "./brand";
import { NelvyonChatbot } from "./NelvyonChatbot";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#050505] text-zinc-100 lg:flex-row">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,102,255,0.2),transparent_50%)]"
      />
      <div className="relative hidden flex-1 flex-col justify-between border-r border-white/[0.06] p-12 lg:flex">
        <Link className="text-xl font-bold text-white" href="/">
          {NELVYON.name}
        </Link>
        <div>
          <p className="max-w-md text-3xl font-bold leading-tight text-white">{NELVYON.slogan}</p>
          <p className="mt-4 max-w-sm text-zinc-500">{NELVYON.tagline}</p>
        </div>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} NELVYON</p>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0c0c0e]/80 p-8 shadow-[0_0_80px_rgba(0,102,255,0.08)] backdrop-blur-xl">
          <Link className="mb-8 inline-block text-lg font-bold text-white lg:hidden" href="/">
            {NELVYON.name}
          </Link>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <NelvyonChatbot />
    </div>
  );
}
