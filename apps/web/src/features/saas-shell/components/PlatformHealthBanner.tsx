"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type HealthReport = {
  score: number;
  status: "healthy" | "degraded" | "critical";
  summary: { missingCount: number };
};

export function PlatformHealthBanner() {
  const pathname = usePathname();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (pathname === "/saas/setup" || pathname?.startsWith("/saas/onboarding")) return;
    fetch("/api/saas/platform-health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HealthReport | null) => { if (d) setReport(d); })
      .catch(() => {});
  }, [pathname]);

  if (dismissed || !report || report.status === "healthy" || pathname === "/saas/setup") {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
      data-testid="platform-health-banner"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-amber-50">
            Salud de la cuenta: {report.score}% — {report.summary.missingCount} pendiente{report.summary.missingCount === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 text-xs text-amber-200/80">
            Completa la configuración para desbloquear el 100% de Nelvyon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/saas/setup"
            className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-500/30 transition"
          >
            Ir a configuración →
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-amber-200/60 hover:text-amber-100"
          >
            Ocultar
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccountHealthScore({ className = "" }: { className?: string }) {
  const [report, setReport] = useState<HealthReport | null>(null);

  useEffect(() => {
    fetch("/api/saas/platform-health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HealthReport | null) => { if (d) setReport(d); })
      .catch(() => {});
  }, []);

  if (!report) return null;

  const tone =
    report.status === "healthy"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : report.status === "degraded"
        ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
        : "text-red-300 border-red-500/30 bg-red-500/10";

  return (
    <Link
      href="/saas/setup"
      className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2 transition hover:brightness-110 ${tone} ${className}`}
    >
      <span className="text-2xl font-bold tabular-nums">{report.score}%</span>
      <span className="text-xs leading-tight">
        Salud Nelvyon
        <br />
        <span className="opacity-70">Ver configuración →</span>
      </span>
    </Link>
  );
}
