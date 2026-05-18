"use client";

import Link from "next/link";

import { LanguageSelector } from "@/components/LanguageSelector";

export function MarketingSubnav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/50 bg-[#080808]/90 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link className="text-sm font-bold tracking-wide text-indigo-500" href="/">
          NELVYON
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-zinc-400 md:gap-5">
          <Link className="hidden hover:text-zinc-100 sm:inline" href="/#servicios">
            Servicios
          </Link>
          <Link className="hover:text-zinc-100" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-zinc-100" href="/partners">
            Partners
          </Link>
          <Link className="hover:text-zinc-100" href="/auth/login">
            Acceder
          </Link>
          <LanguageSelector />
        </div>
      </nav>
    </header>
  );
}
