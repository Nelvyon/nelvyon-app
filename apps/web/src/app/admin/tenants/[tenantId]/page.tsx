"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { AdminSidebar } from "../../_components/AdminSidebar";

type AdminJob = { jobId: string; serviceId: string; status: string; createdAt: string };
type AdminTenantDetail = {
  tenant: {
    id: string;
    companyName: string;
    userEmail: string;
    plan: "starter" | "pro" | "enterprise";
    onboardingCompleted: boolean;
  };
  contactsCount: number;
  campaniasCount: number;
  workflowsCount: number;
  jobsCount: number;
  recentJobs: AdminJob[];
};

export default function AdminTenantDetailPage() {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId ?? "";
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminTenantDetail | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/admin/tenants/${tenantId}`, { credentials: "same-origin" });
      if (res.status === 401) {
        router.replace(`/auth/login?next=${encodeURIComponent(`/admin/tenants/${tenantId}`)}`);
        return;
      }
      if (!res.ok) {
        setDetail(null);
        setLoading(false);
        return;
      }
      const body = (await res.json()) as { tenant: AdminTenantDetail };
      setDetail(body.tenant);
      setLoading(false);
    }
    if (tenantId) void load();
  }, [tenantId, router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar />
        <main className="space-y-6">
          <NelvyonDsSectionHeader title="Detalle tenant" subtitle="Informacion completa y actividad reciente" />
          {loading || !detail ? (
            <NelvyonDsCard>Cargando detalle...</NelvyonDsCard>
          ) : (
            <>
              <NelvyonDsCard className="space-y-2">
                <div className="text-lg font-semibold text-foreground">{detail.tenant.companyName}</div>
                <div className="text-sm text-muted-foreground">{detail.tenant.userEmail}</div>
                <div className="flex gap-2">
                  <NelvyonDsBadge>{detail.tenant.plan}</NelvyonDsBadge>
                  <NelvyonDsBadge>{detail.tenant.onboardingCompleted ? "onboarding ok" : "onboarding pendiente"}</NelvyonDsBadge>
                </div>
              </NelvyonDsCard>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <NelvyonDsCard>Contactos: {detail.contactsCount}</NelvyonDsCard>
                <NelvyonDsCard>Campanias: {detail.campaniasCount}</NelvyonDsCard>
                <NelvyonDsCard>Workflows: {detail.workflowsCount}</NelvyonDsCard>
                <NelvyonDsCard>Jobs: {detail.jobsCount}</NelvyonDsCard>
              </div>
              <NelvyonDsCard className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Ultimos 10 jobs</div>
                {detail.recentJobs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sin jobs para este tenant.</div>
                ) : (
                  detail.recentJobs.map((job) => (
                    <div key={job.jobId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div className="space-x-2">
                        <span className="font-medium">{job.jobId}</span>
                        <span className="text-muted-foreground">{job.serviceId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <NelvyonDsBadge>{job.status}</NelvyonDsBadge>
                        <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </NelvyonDsCard>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
