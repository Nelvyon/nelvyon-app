"use client";

import { useEffect, useState } from "react";

function computeRemaining(expiresAt: string): { days: number; hours: number; minutes: number; seconds: number; done: boolean } {
  const end = new Date(expiresAt).getTime();
  const diff = Math.max(0, end - Date.now());
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, done: false };
}

export interface EarlyAdopterCountdownProps {
  expiresAt: string;
  className?: string;
}

export function EarlyAdopterCountdown({ expiresAt, className }: EarlyAdopterCountdownProps) {
  const [remaining, setRemaining] = useState(() => computeRemaining(expiresAt));

  useEffect(() => {
    setRemaining(computeRemaining(expiresAt));
    const id = window.setInterval(() => {
      setRemaining(computeRemaining(expiresAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (remaining.done) {
    return (
      <p className={className ?? "text-sm font-medium text-zinc-500"}>Oferta finalizada</p>
    );
  }

  return (
    <p className={className ?? "text-sm font-medium text-indigo-200"}>
      Oferta válida por:{" "}
      <span className="tabular-nums">
        {remaining.days}d {remaining.hours}h {remaining.minutes}m {remaining.seconds}s
      </span>
    </p>
  );
}
