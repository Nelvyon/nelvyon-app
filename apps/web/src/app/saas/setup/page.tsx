"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { ActivationChecklist } from "@/features/saas-shell/components/ActivationChecklist";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type HealthItem = {
  id: string;
  label: string;
  category: string;
  status: "ok" | "warning" | "missing";
  configured: boolean;
  href: string;
  detail: string;
  actionable: boolean;
};

type HealthReport = {
  score: number;
  status: "healthy" | "degraded" | "critical";
  items: HealthItem[];
  activation: { done: number; total: number; percent: number };
  summary: { platformReady: boolean; productReady: boolean; missingCount: number };
};

const CATEGORY_LABELS: Record<string, string> = {
  platform: "Plataforma",
  payments: "Pagos",
  comms: "Comunicación",
  integrations: "Integraciones",
  product: "Uso del producto",
};

const STATUS_ICON: Record<HealthItem["status"], string> = {
  ok: "✓",
  warning: "◐",
  missing: "○",
};

const STATUS_CLS: Record<HealthItem["status"], string> = {
  ok: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  warning: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  missing: "text-red-300 border-red-500/30 bg-red-500/10",
};

export default function SaasSetupPage() {
  const router = useRouter();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [packLoading, setPackLoading] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/platform-health", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/auth/login?next=/saas/setup");
        return;
      }
      if (res.ok) setReport((await res.json()) as HealthReport);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function installStarterPack() {
    setPackLoading(true);
    setPackMsg(null);
    try {
      const res = await fetch("/api/saas/starter-pack", { method: "POST" });
      const d = (await res.json()) as { error?: string; totalWorkflows?: number; totalSequences?: number };
      if (!res.ok) {
        setPackMsg(d.error ?? "Error al instalar");
        return;
      }
      setPackMsg(`✅ Kit instalado: ${d.totalWorkflows ?? 6} workflows + ${d.totalSequences ?? 4} secuencias`);
      await load();
    } finally {
      setPackLoading(false);
    }
  }

  const grouped = report
    ? Object.entries(
        report.items.reduce<Record<string, HealthItem[]>>((acc, item) => {
          (acc[item.category] ??= []).push(item);
          return acc;
        }, {}),
      )
    : [];

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="setup" />}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Centro de configuración</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Perfecciona tu cuenta Nelvyon</h1>
          <p className="mt-1 text-sm text-white/50 max-w-xl">
            Estado en tiempo real de email, pagos, comunicación e integraciones. Objetivo: 100% operativo.
          </p>
        </div>
        {report && (
          <div
            className={`rounded-2xl border px-6 py-4 text-center ${
              report.status === "healthy"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : report.status === "degraded"
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-red-500/40 bg-red-500/10"
            }`}
          >
            <p className="text-4xl font-bold text-white tabular-nums">{report.score}%</p>
            <p className="text-xs text-white/60 mt-1">Salud global</p>
          </div>
        )}
      </div>

      {loading && (
        <p className="text-sm text-white/40">Analizando configuración…</p>
      )}

      {report && (
        <>
          <NelvyonDsCard className="p-5 border-[#0084ff]/20 bg-[#0084ff]/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">⚡ Kit de arranque oficial Nelvyon</p>
                <p className="text-sm text-white/50 mt-1">6 workflows + 4 secuencias — importación en 1 clic</p>
                {packMsg && <p className="text-xs text-emerald-400 mt-2">{packMsg}</p>}
              </div>
              <NelvyonDsButton disabled={packLoading} onClick={() => void installStarterPack()}>
                {packLoading ? "Instalando…" : "Instalar kit"}
              </NelvyonDsButton>
            </div>
          </NelvyonDsCard>

          {grouped.map(([category, items]) => (
            <section key={category}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                {CATEGORY_LABELS[category] ?? category}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => (
                  <NelvyonDsCard key={item.id} className="p-4 flex gap-3 items-start">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${STATUS_CLS[item.status]}`}
                    >
                      {STATUS_ICON[item.status]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/50 mt-1">{item.detail}</p>
                      <Link
                        href={item.href}
                        className="inline-block mt-2 text-xs font-semibold text-[#0084ff] hover:underline"
                      >
                        {item.actionable ? "Configurar →" : "Ver módulo →"}
                      </Link>
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            </section>
          ))}

          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
              Activación del producto ({report.activation.percent}%)
            </p>
            <ActivationChecklist />
          </section>

          {report.score >= 90 && (
            <NelvyonDsCard className="p-6 text-center border-emerald-500/30 bg-emerald-500/10">
              <p className="text-lg font-semibold text-emerald-300">✓ Cuenta en estado óptimo</p>
              <p className="text-sm text-white/60 mt-2">Tu Nelvyon está listo para operar a escala.</p>
              <Link href="/saas/dashboard" className="inline-block mt-4 text-sm font-semibold text-[#0084ff] hover:underline">
                Ir al dashboard →
              </Link>
            </NelvyonDsCard>
          )}
        </>
      )}
    </SaasShellLayout>
  );
}
