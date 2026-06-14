"use client";

import Link from "next/link";

import { HomeDashboard } from "@/app/HomeDashboard";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { QuickWinAutomations } from "@/features/onboarding/components/QuickWinAutomations";

const QUICK_LINKS = [
  {
    href: "/os/packs",
    title: "Growth Packs",
    desc: "Local, Ecommerce y SaaS B2B — un clic tras el brief",
    accent: "from-teal-500/15 to-teal-500/5",
  },
  {
    href: "/dashboard/local-growth",
    title: "Local Growth Pack",
    desc: "Informe del pack autónomo para negocios locales",
    accent: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    href: "/dashboard/ecommerce-growth",
    title: "Ecommerce Growth Pack",
    desc: "Meta Ads kit, carrito abandonado y QA tienda",
    accent: "from-violet-500/15 to-violet-500/5",
  },
  {
    href: "/crm/clients",
    title: "Clientes",
    desc: "Cuentas de revenue y pipeline de ventas",
    accent: "from-violet-500/15 to-violet-500/5",
  },
  {
    href: "/campaigns",
    title: "Campañas",
    desc: "Email y multicanal para generar demanda",
    accent: "from-sky-500/15 to-sky-500/5",
  },
  {
    href: "/inbox/tickets",
    title: "Helpdesk",
    desc: "Tickets y soporte del workspace",
    accent: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    href: "/dashboard/inbox",
    title: "Bandeja",
    desc: "Email, chat y mensajes en un solo lugar",
    accent: "from-amber-500/15 to-amber-500/5",
  },
  {
    href: "/automations/jobs",
    title: "Automatización",
    desc: "Jobs y webhooks en segundo plano",
    accent: "from-rose-500/15 to-rose-500/5",
  },
  {
    href: "/analytics/revenue",
    title: "Analytics",
    desc: "Métricas de revenue y conversiones",
    accent: "from-indigo-500/15 to-indigo-500/5",
  },
] as const;

export default function DashboardHomePage() {
  return (
    <ProtectedLayout module="os">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-card sm:p-8">
          <div className="relative z-[1] max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Tu workspace</p>
            <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Empieza a generar resultados hoy
            </p>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              NELVYON conecta clientes, campañas y soporte en un solo panel. Sigue la checklist de activación y
              lanza tus primeras acciones en menos de 5 minutos.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/crm/clients/new">Añadir primer cliente</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/campaigns/new">Crear campaña</Link>
              </Button>
            </div>
          </div>
        </section>

        <HomeDashboard />

        <QuickWinAutomations />

        <section aria-label="Accesos rápidos">
          <h2 className="text-lg font-semibold text-foreground">Módulos principales</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atajos a las áreas que más impacto tienen en ingresos y operaciones.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((mod) => (
              <Link
                className={`group rounded-xl border border-border bg-gradient-to-br ${mod.accent} p-4 transition hover:border-primary/40 hover:shadow-md`}
                href={mod.href}
                key={mod.href}
              >
                <p className="font-semibold text-foreground group-hover:text-primary">{mod.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{mod.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </ProtectedLayout>
  );
}
