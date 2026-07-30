"use client";

import type { ReactNode } from "react";

/**
 * Dashboard-specific presentational primitives for the SaaS executive dashboard.
 * Composition inspired by the audited W3CRM template (KPI band with icons,
 * consistent section headers, avatar-based activity rows) — rebuilt natively
 * on the existing NELVYON dark-glass token language (#020817 / #0084ff),
 * zero template source code involved. See docs/ops/W3CRM_MIGRATION_PLAN.md.
 */

/** Consistent eyebrow + title header for dashboard widget cards, with an optional action slot. */
export function SaasWidgetHeader({
  title,
  action,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/30">{title}</p>
      {action}
    </div>
  );
}

/** Deterministic color from a string, used for avatar bubbles — no randomness, stable across renders. */
const AVATAR_PALETTE = [
  "from-[#0084ff] to-[#0047ab]",
  "from-emerald-500 to-emerald-700",
  "from-violet-500 to-violet-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-cyan-500 to-cyan-700",
] as const;

function paletteForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initialsFromLabel(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "•";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0] ?? "").concat(words[1]![0] ?? "").toUpperCase();
}

/** Colored initials bubble for activity/event rows — richer visual anchor than a bare status dot. */
export function SaasAvatarBubble({ seed, label, className = "" }: { seed: string; label: string; className?: string }) {
  const gradient = paletteForSeed(seed);
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[11px] font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ${className}`}
    >
      {initialsFromLabel(label)}
    </span>
  );
}

/** KPI tile with icon glyph — denser, more "enterprise admin" than a bare number card. */
export function KpiTile({
  icon,
  label,
  value,
  accent = false,
  href,
}: {
  icon: string;
  label: string;
  value: string | number;
  accent?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
        accent
          ? "border-[#0084ff]/30 bg-gradient-to-br from-[#0084ff]/10 to-[#0047ab]/5 shadow-[0_0_20px_rgba(0,132,255,0.12)] hover:shadow-[0_0_28px_rgba(0,132,255,0.22)]"
          : "border-white/[0.07] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">{value}</p>
        </div>
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
            accent ? "bg-[#0084ff]/15 text-[#0084ff]" : "bg-white/[0.05] text-white/50"
          }`}
        >
          {icon}
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  return inner;
}
