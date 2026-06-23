"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";
import type { SaasNavId } from "@/features/saas-shell/saasNav";

import { SaasCrmContactsTab } from "@/features/saas-crm/components/SaasCrmContactsTab";
import { SaasCrmPipelineTab } from "@/features/saas-crm/components/SaasCrmPipelineTab";

type CrmTab = "contacts" | "pipeline";

const tabClass = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
  }`;

function SaasCrmPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: CrmTab = searchParams?.get("tab") === "pipeline" ? "pipeline" : "contacts";
  const activeNavId: SaasNavId = tab === "pipeline" ? "pipeline" : "crm";

  const { can, isViewer, loading: permsLoading } = useSaasPermissions();
  const canReadContacts = can("contacts.read");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantCompany, setTenantCompany] = useState("");
  const [tenantPlan, setTenantPlan] = useState<"starter" | "pro" | "enterprise">("starter");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/dashboard", { credentials: "same-origin", cache: "no-store" });
        if (res.status === 401) {
          router.replace(`/auth/login?next=${encodeURIComponent("/saas/crm")}`);
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar el tenant");
        const body = (await res.json()) as {
          tenant: { companyName: string; plan: "starter" | "pro" | "enterprise"; onboardingCompleted: boolean };
        };
        if (!body.tenant.onboardingCompleted) {
          router.replace("/saas/onboarding");
          return;
        }
        setTenantCompany(body.tenant.companyName);
        setTenantPlan(body.tenant.plan);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading || permsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Cargando CRM…
      </div>
    );
  }

  if (!canReadContacts) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <SaasPermissionDenied message="Tu rol no tiene acceso al CRM del tenant." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar activeId={activeNavId} tenantCompany={tenantCompany} tenantPlan={tenantPlan} />
        <main className="space-y-6">
          <NelvyonDsSectionHeader
            title="CRM"
            subtitle="Contactos y pipeline del tenant — API /api/saas/crm y /api/saas/deals."
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <nav className="flex flex-wrap gap-2" aria-label="Secciones CRM">
            <Link className={tabClass(tab === "contacts")} href="/saas/crm">
              Contactos
            </Link>
            <Link className={tabClass(tab === "pipeline")} href="/saas/crm?tab=pipeline">
              Pipeline
            </Link>
          </nav>

          {tab === "pipeline" ? (
            <SaasCrmPipelineTab readOnly={isViewer} />
          ) : (
            <SaasCrmContactsTab readOnly={isViewer} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function SaasCrmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SaasCrmPageInner />
    </Suspense>
  );
}
