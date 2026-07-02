"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { AdminSidebar } from "../_components/AdminSidebar";

type AdminJob = {
  jobId: string;
  serviceId: string;
  tenantId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminJobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [status, setStatus] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [tenantId, setTenantId] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (serviceId.trim()) params.set("serviceId", serviceId.trim());
    if (tenantId.trim()) params.set("tenantId", tenantId.trim());
    const res = await fetch(`/api/admin/jobs?${params.toString()}`, { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/admin/jobs")}`);
      return;
    }
    if (!res.ok) {
      setJobs([]);
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { jobs: AdminJob[] };
    setJobs(body.jobs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
     
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Jobs OS" subtitle="Monitor interno de ejecuciones del sistema" />
          <div className="flex flex-wrap gap-2">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="status" value={status} onChange={(e) => setStatus(e.target.value)} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="serviceId" value={serviceId} onChange={(e) => setServiceId(e.target.value)} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
            <NelvyonDsButton onClick={() => void load()}>Aplicar filtros</NelvyonDsButton>
          </div>
          {loading ? (
            <NelvyonDsCard>Cargando jobs...</NelvyonDsCard>
          ) : jobs.length === 0 ? (
            <NelvyonDsCard className="text-sm text-muted-foreground">No hay jobs para los filtros actuales.</NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => {
                const durationMs = Math.max(0, new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime());
                return (
                  <NelvyonDsCard key={job.jobId} className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{job.jobId}</div>
                      <div className="text-xs text-muted-foreground">{job.serviceId}</div>
                      <div className="text-xs text-muted-foreground">tenant: {job.tenantId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <NelvyonDsBadge>{job.status}</NelvyonDsBadge>
                      <div className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">dur: {durationMs} ms</div>
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
