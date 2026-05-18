"use client";

import Link from "next/link";
import { useId, useState } from "react";

type AIDisclosureBadgeProps = {
  className?: string;
};

export function AIDisclosureBadge({ className = "" }: AIDisclosureBadgeProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500 ${className}`.trim()}
    >
      <span
        className="relative inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-zinc-400"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        role="note"
        aria-describedby={open ? tooltipId : undefined}
      >
        <span aria-hidden="true">✦</span>
        <span>Contenido generado por IA</span>
        {open ? (
          <span
            id={tooltipId}
            role="tooltip"
            className="absolute bottom-full left-0 z-20 mb-1 w-56 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[10px] leading-snug text-zinc-300 shadow-lg"
          >
            Este resultado fue generado por inteligencia artificial. Revísalo antes de usarlo.
          </span>
        ) : null}
      </span>
      <Link href="/legal/ai-disclosure" className="text-indigo-400/90 hover:text-indigo-300 hover:underline">
        Más info
      </Link>
    </div>
  );
}
