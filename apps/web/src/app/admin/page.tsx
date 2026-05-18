"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import { AdminSidebar } from "./_components/AdminSidebar";

type SystemStats = {
  totalTenants: number;
  activeTenants: number;
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalContacts: number;
  totalCampanias: number;
  totalWorkflows: number;
};
type ActivityItem = { id: string; tenantId: string; eventType: string; description: string; createdAt: string };

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch("/api/admin/stats", { credentials: "same-origin" }),
          fetch("/api/admin/activity?limit=10", { credentials: "same-origin" }),
        ]);
        if (statsRes.status === 401) {
          router.replace(`/auth/login?next=${encodeURIComponent("/admin")}`);
          return;
        }
        if (statsRes.status === 403) {
          setError("Acceso restringido: solo admin.");
          return;
        }
        if (!statsRes.ok) throw new Error("No se pudo cargar SystemStats");
        const statsBody = (await statsRes.json()) as { stats: SystemStats };
        setStats(statsBody.stats);
        if (activityRes.ok) {
          const activityBody = (await activityRes.json()) as { activity: ActivityItem[] };
          setActivity(activityBody.activity ?? []);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error cargando admin");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  const bars = useMemo(() => {
    if (!stats) return [];
    const max = Math.max(1, stats.runningJobs, stats.completedJobs, stats.failedJobs);
    return [
      { label: "running", value: stats.runningJobs, pct: Math.round((stats.runningJobs / max) * 100) },
      { label: "completed", value: stats.completedJobs, pct: Math.round((stats.completedJobs / max) * 100) },
      { label: "failed", value: stats.failedJobs, pct: Math.round((stats.failedJobs / max) * 100) },
    ];
  }, [stats]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Panel Admin" subtitle="Vision global del sistema NELVYON" />
          {error ? <NelvyonDsCard className="text-sm text-destructive">{error}</NelvyonDsCard> : null}
          {loading || !stats ? (
            <NelvyonDsCard>Cargando dashboard admin...</NelvyonDsCard>
          ) : (
            <>
              <section id="sistema" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <NelvyonDsCard>Total tenants: {stats.totalTenants}</NelvyonDsCard>
                <NelvyonDsCard>Tenants activos: {stats.activeTenants}</NelvyonDsCard>
                <NelvyonDsCard>Total jobs: {stats.totalJobs}</NelvyonDsCard>
                <NelvyonDsCard>Jobs running: {stats.runningJobs}</NelvyonDsCard>
                <NelvyonDsCard>Jobs completed: {stats.completedJobs}</NelvyonDsCard>
                <NelvyonDsCard>Jobs failed: {stats.failedJobs}</NelvyonDsCard>
                <NelvyonDsCard>Total contactos: {stats.totalContacts}</NelvyonDsCard>
                <NelvyonDsCard>Total campanias: {stats.totalCampanias}</NelvyonDsCard>
                <NelvyonDsCard>Total workflows: {stats.totalWorkflows}</NelvyonDsCard>
              </section>

              <NelvyonDsCard className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Jobs por status</div>
                <div className="space-y-2">
                  {bars.map((bar) => (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{bar.label}</span>
                        <span>{bar.value}</span>
                      </div>
                      <div className="h-2 rounded bg-muted">
                        <div className="h-2 rounded bg-primary" style={{ width: `${bar.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </NelvyonDsCard>

              <section id="actividad">
                <NelvyonDsCard className="space-y-3">
                  <div className="text-sm font-semibold text-foreground">Ultimas 10 actividades globales</div>
                  {activity.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sin actividad reciente.</div>
                  ) : (
                    <div className="space-y-2">
                      {activity.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <NelvyonDsStatusDot status="pending" />
                            <span>{a.eventType}</span>
                            <span className="text-muted-foreground">{a.description}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </NelvyonDsCard>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
