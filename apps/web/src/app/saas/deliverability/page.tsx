"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";
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

function healthTone(score: number): boolean {
  return score >= 80;
}

export default function DeliverabilityPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [dedicatedIp, setDedicatedIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingIp, setSavingIp] = useState(false);
  const [advancingWarmup, setAdvancingWarmup] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/deliverability");
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Error ${res.status} al cargar métricas`);
      }
      const d = (await res.json()) as { snapshot: Snapshot };
      setSnapshot(d.snapshot);
      setDedicatedIp(d.snapshot.dedicatedIp ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar métricas de deliverability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveDedicatedIp() {
    setSavingIp(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/saas/deliverability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dedicated-ip", dedicatedIp, warmupDay: snapshot?.warmupDay ?? 0 }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al guardar la IP dedicada`);
      await load();
      setFeedback("✓ IP dedicada guardada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la IP dedicada");
    } finally {
      setSavingIp(false);
    }
  }

  async function advanceWarmup() {
    setAdvancingWarmup(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch("/api/saas/deliverability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "warmup-advance" }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al avanzar el warm-up`);
      await load();
      setFeedback("✓ Warm-up avanzado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al avanzar el warm-up");
    } finally {
      setAdvancingWarmup(false);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="deliverability" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Deliverability Center"
          subtitle="Salud de envío de email, bounce rate y warm-up de IP dedicada"
        />

        {error && (
          <NelvyonDsCard className="border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">⚠ {error}</p>
          </NelvyonDsCard>
        )}
        {feedback && (
          <NelvyonDsCard className="border-success/30 bg-success/5 p-3">
            <p className="text-sm text-success">{feedback}</p>
          </NelvyonDsCard>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : snapshot ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiTile icon={healthTone(snapshot.healthScore) ? "✅" : "⚠️"} label="Health score" value={`${snapshot.healthScore}/100`} accent={healthTone(snapshot.healthScore)} />
            <KpiTile icon="📉" label="Bounce rate 30d" value={`${snapshot.bounceRate.toFixed(2)}%`} />
            <KpiTile icon="📤" label="Enviados 30d" value={snapshot.sent30d.toLocaleString("es-ES")} />
          </div>
        ) : (
          <NelvyonDsCard className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No se pudieron cargar las métricas todavía.</p>
          </NelvyonDsCard>
        )}

        <NelvyonDsCard className="space-y-3 p-5" title="Dedicated IP (SES)">
          <p className="text-sm text-muted-foreground">
            Configura una IP dedicada de Amazon SES y avanza el plan de warm-up progresivamente para maximizar la reputación de envío.
          </p>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder="52.x.x.x"
            value={dedicatedIp}
            onChange={(e) => setDedicatedIp(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <NelvyonDsButton disabled={savingIp} onClick={() => void saveDedicatedIp()}>
              {savingIp ? "Guardando…" : "Guardar IP"}
            </NelvyonDsButton>
            <NelvyonDsButton
              variant="secondary"
              disabled={advancingWarmup}
              onClick={() => void advanceWarmup()}
            >
              {advancingWarmup ? "Avanzando…" : `Avanzar warm-up (día ${(snapshot?.warmupDay ?? 0) + 1})`}
            </NelvyonDsButton>
          </div>
        </NelvyonDsCard>
      </div>
    </SaasShellLayout>
  );
}
