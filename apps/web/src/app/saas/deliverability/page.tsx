"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Snapshot = {
  bounceRate: number;
  complaintRate: number;
  sent30d: number;
  bounced30d: number;
  healthScore: number;
  dedicatedIp: string | null;
  warmupDay: number;
};

export default function DeliverabilityPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [dedicatedIp, setDedicatedIp] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/saas/deliverability");
    if (res.ok) {
      const d = (await res.json()) as { snapshot: Snapshot };
      setSnapshot(d.snapshot);
      setDedicatedIp(d.snapshot.dedicatedIp ?? "");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="deliverability" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-white">Deliverability Center</h1>
        {snapshot ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Health score" value={`${snapshot.healthScore}/100`} />
            <Metric label="Bounce rate 30d" value={`${snapshot.bounceRate.toFixed(2)}%`} />
            <Metric label="Enviados 30d" value={String(snapshot.sent30d)} />
          </div>
        ) : (
          <p className="text-white/50">Cargando métricas…</p>
        )}
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Dedicated IP (SES)</h2>
          <input
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            placeholder="52.x.x.x"
            value={dedicatedIp}
            onChange={(e) => setDedicatedIp(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white"
              onClick={() => void fetch("/api/saas/deliverability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "dedicated-ip", dedicatedIp, warmupDay: snapshot?.warmupDay ?? 0 }),
              }).then(load)}
            >
              Guardar IP
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white"
              onClick={() => void fetch("/api/saas/deliverability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "warmup-advance" }),
              }).then(load)}
            >
              Avanzar warm-up (día {(snapshot?.warmupDay ?? 0) + 1})
            </button>
          </div>
        </section>
      </div>
    </SaasShellLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
