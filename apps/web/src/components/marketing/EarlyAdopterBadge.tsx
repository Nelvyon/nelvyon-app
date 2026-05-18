"use client";

import { useEffect, useState } from "react";

import { EarlyAdopterCountdown } from "./EarlyAdopterCountdown";

type EarlyAdopterStatus = {
  active: boolean;
  slotsLeft: number;
  expiresAt: string;
  maxSlots: number;
  discountPct: number;
};

export interface EarlyAdopterBadgeProps {
  className?: string;
  showCountdown?: boolean;
}

export function EarlyAdopterBadge({ className, showCountdown = true }: EarlyAdopterBadgeProps) {
  const [status, setStatus] = useState<EarlyAdopterStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/early-adopter/status", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as EarlyAdopterStatus;
        if (!cancelled) setStatus(body);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.active) {
    return null;
  }

  return (
    <div
      className={
        className ??
        "mx-auto max-w-2xl rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-4 text-center"
      }
    >
      <p className="text-sm font-semibold text-indigo-200">
        🚀 Early Adopter — {status.discountPct}% descuento permanente
      </p>
      <p className="mt-1 text-xs text-indigo-300/90">
        {status.slotsLeft} plazas restantes de {status.maxSlots}
      </p>
      {showCountdown ? (
        <EarlyAdopterCountdown expiresAt={status.expiresAt} className="mt-2 text-xs text-indigo-200/90" />
      ) : null}
    </div>
  );
}
