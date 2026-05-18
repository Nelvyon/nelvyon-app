"use client";

import { AffiliateDashboard } from "@/components/affiliates";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function AffiliatesDashboardPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Programa de Afiliados</h1>
          <p className="text-lg text-slate-600">Gana el 20% de cada cliente que refieras.</p>
        </header>
        <AffiliateDashboard />
      </div>
    </DashboardLayout>
  );
}
