import Link from "next/link";
import type { ReactNode } from "react";

import { LINKS } from "./constants";
import { BRAND } from "./shared";

export function SectionHeading({
  title,
  subtitle,
  light = false,
  center = true,
  variant,
}: {
  title: string;
  subtitle?: string;
  light?: boolean;
  center?: boolean;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark" || (variant !== "light" && light);
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <h2
        className={`text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl ${
          isDark ? "nelvyon-title-glow text-white" : "text-[#111827]"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={`mt-4 text-lg md:text-xl ${isDark ? "text-zinc-400" : "text-[#374151]"}`}>
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
      className={`nelvyon-glow-btn inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:scale-[1.03] ${className}`}
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
      className={`nelvyon-glass nelvyon-card-hover rounded-2xl p-6 md:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
