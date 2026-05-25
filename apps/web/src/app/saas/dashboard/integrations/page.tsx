"use client";

import { Suspense } from "react";

import { IntegrationsDashboard } from "@/components/integrations";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

function IntegrationsContent() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Integraciones</h1>
        <p className="text-lg text-slate-600">Conecta tus cuentas publicitarias y de analítica.</p>
      </header>
      <IntegrationsDashboard />
    </div>
  );
}

export default function IntegrationsDashboardPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<p className="p-8 text-center text-sm text-slate-500">Cargando integraciones…</p>}>
        <IntegrationsContent />
      </Suspense>
    </DashboardLayout>
  );
}
