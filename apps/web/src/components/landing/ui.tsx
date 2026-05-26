import Link from "next/link";
import type { ReactNode } from "react";

import { LINKS } from "./constants";
import { BRAND } from "./shared";

export function SectionHeading({
  title,
  subtitle,
  light = false,
  center = true,
}: {
  title: string;
  subtitle?: string;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <h2
        className={`text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl ${
          light ? "text-white" : "text-zinc-900"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`mt-4 text-lg md:text-xl ${
            light ? "text-zinc-400" : "text-zinc-600"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li className="flex items-start gap-3 text-sm text-zinc-300 md:text-base" key={item}>
          <span className="mt-0.5 shrink-0 font-bold" style={{ color: BRAND.blue }}>
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PrimaryButton({
  href = LINKS.register,
  children,
  className = "",
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 ${className}`}
      href={href}
      style={{ backgroundColor: BRAND.blue }}
    >
      {children}
    </Link>
  );
}

export function GhostButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={`inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5 ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function NelvyonCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 md:p-8 ${className}`}
      style={{
        backgroundColor: BRAND.card,
        borderColor: BRAND.cardBorder,
      }}
    >
      {children}
    </div>
  );
}
