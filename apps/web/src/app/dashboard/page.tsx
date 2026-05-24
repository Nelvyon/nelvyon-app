"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardPageTransition } from "@/features/dashboard/components/DashboardTabs";

const MODULES = [
  { href: "/dashboard/crm", label: "CRM", desc: "Contactos, deals y pipeline" },
  { href: "/dashboard/campanas", label: "Campañas", desc: "Email y multicanal" },
  { href: "/dashboard/websites", label: "Webs", desc: "OS Web Builder" },
  { href: "/dashboard/chatbot", label: "Chatbot", desc: "Asistente IA" },
  { href: "/dashboard/analytics/benchmarks", label: "Analytics", desc: "Métricas y benchmarks" },
  { href: "/dashboard/automatizacion", label: "Automatización", desc: "Workflows" },
];

export default function DashboardHomePage() {
  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel NELVYON</h1>
            <p className="mt-2 text-muted-foreground">Resumen de tu imperio digital. Usa el sidebar para acceder a todos los módulos.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Leads activos", value: "—" },
              { label: "Campañas", value: "—" },
              { label: "Conversiones (30d)", value: "—" },
              { label: "Score IA", value: "—" },
            ].map((m) => (
              <div className="rounded-xl border bg-card p-5 shadow-sm" key={m.label}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-lg font-semibold">Accesos rápidos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((mod) => (
                <Link className="rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md" href={mod.href} key={mod.href}>
                  <p className="font-medium">{mod.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{mod.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}
