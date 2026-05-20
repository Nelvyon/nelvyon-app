"use client";

import Link from "next/link";

import { useUsage } from "@/hooks/useUsage";

export function UsagePanel() {
  const { usage, loading } = useUsage();

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:p-6 animate-pulse">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
        <div className="h-2 w-full bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!usage) return null;

  const barColor =
    usage.percentUsed >= 90 ? "bg-red-500" : usage.percentUsed >= 70 ? "bg-yellow-500" : "bg-indigo-500";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="line-clamp-2 text-sm md:text-base font-semibold text-zinc-100">Uso mensual</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase">{usage.plan}</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${usage.percentUsed}%` }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{usage.usedThisMonth} llamadas usadas</span>
        <span>{usage.remainingThisMonth} restantes</span>
      </div>
      {usage.percentUsed >= 90 ? (
        <p className="mt-3 text-xs text-red-400">
          Estás cerca del límite.{" "}
          <Link href="/pricing" className="inline-flex min-h-[44px] items-center text-indigo-400 underline">
            Actualiza tu plan →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
