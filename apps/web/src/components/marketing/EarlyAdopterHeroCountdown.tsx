"use client";

import { useEffect, useState } from "react";

import { EarlyAdopterCountdown } from "./EarlyAdopterCountdown";

type EarlyAdopterStatus = {
  active: boolean;
  expiresAt: string;
};

export function EarlyAdopterHeroCountdown() {
  const [status, setStatus] = useState<EarlyAdopterStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/early-adopter/status");
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

  if (!status?.active) return null;

  return (
    <EarlyAdopterCountdown
      expiresAt={status.expiresAt}
      className="mx-auto mt-3 max-w-2xl text-sm text-indigo-200/90"
    />
  );
}
