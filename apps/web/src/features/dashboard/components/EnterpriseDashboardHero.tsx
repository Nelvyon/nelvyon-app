"use client";

import Link from "next/link";
import { Layers, Package, Sparkles } from "lucide-react";

import { useAuth } from "@/core/auth/AuthContext";

export function EnterpriseDashboardHero() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "equipo";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#0084ff]/20 bg-gradient-to-br from-[#07122a] via-[#0b1428] to-[#07122a] p-6 text-white shadow-[0_24px_64px_rgba(7,18,42,0.35)] md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#0084ff]/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <span className="nv-enterprise-badge mb-4 inline-flex border-[#0084ff]/40 bg-[#0084ff]/15 text-[#66a3ff]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Centro de operaciones
          </span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Bienvenido, {name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 md:text-base">
            Tu workspace ejecuta packs autónomos y el OS interno de Nelvyon en una sola consola — la misma
            infraestructura que usan equipos de crecimiento a escala.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold transition hover:border-[#0084ff]/40 hover:bg-[#0084ff]/10"
            href="/packs"
          >
            <Package className="h-4 w-4 text-[#66a3ff]" aria-hidden />
            Activar pack
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0084ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_32px_rgba(0,132,255,0.35)] transition hover:bg-[#0066ff]"
            href="/automatizacion"
          >
            <Layers className="h-4 w-4" aria-hidden />
            Ver automatizaciones
          </Link>
        </div>
      </div>
    </section>
  );
}
