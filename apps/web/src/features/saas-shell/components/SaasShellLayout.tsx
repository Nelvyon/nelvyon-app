"use client";

import type { ReactNode } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

/**
 * Premium dark shell wrapper for all real SaaS pages.
 * Provides the dark mesh background + 2-col grid.
 * Do NOT use in mock/hub pages.
 */
export function SaasShellLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <DashboardLayout>
      <div
        className="min-h-screen bg-[#020817] text-white"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 40% at 20% 0%, rgba(0,132,255,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 30% at 80% 100%, rgba(0,132,255,0.06) 0%, transparent 60%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3Cpattern id='g' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='rgba(255,255,255,0.03)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='40' height='40' fill='url(%23g)'/%3E%3C/svg%3E")
          `,
        }}
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {sidebar}
          <main className="space-y-6 min-w-0">{children}</main>
        </div>
      </div>
    </DashboardLayout>
  );
}

/** Premium dark glass card — replaces NelvyonDsCard inside dark shell */
export function DarkCard({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-4 ${glow ? "shadow-[0_0_24px_rgba(0,132,255,0.15)]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** Gradient text for section headings */
export function GradientText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
}

/** KPI stat card with optional glow accent */
export function StatCard({
  label,
  value,
  accent = false,
  href,
}: {
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
      <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
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
