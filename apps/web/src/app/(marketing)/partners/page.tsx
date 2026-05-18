"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";

export default function PartnersPage() {
  const t = useTranslations();
  const [clients, setClients] = useState("10");
  const commission = useMemo(() => {
    const n = Number(clients);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n * 97 * 0.3;
  }, [clients]);

  return (
    <>
      <MarketingSubnav />
      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10">
      <section className="space-y-4 text-center">
        <NelvyonDsSectionHeader title="Programa de Partners NELVYON" subtitle={t("partners.subtitle")} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <NelvyonDsCard title="1. Regístrate">
          <p className="text-sm text-muted-foreground">Crea tu cuenta partner en menos de 2 minutos.</p>
        </NelvyonDsCard>
        <NelvyonDsCard title="2. Comparte tu enlace">
          <p className="text-sm text-muted-foreground">Envía tu referral link único a empresas y agencias de tu red.</p>
        </NelvyonDsCard>
        <NelvyonDsCard title="3. Cobra 30% recurrente">
          <p className="text-sm text-muted-foreground">Recibe comisión mensual mientras tus referidos sigan activos.</p>
        </NelvyonDsCard>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <NelvyonDsCard title="Comisión del 30% recurrente">
          <p className="text-sm text-muted-foreground">Ingresos estables y escalables por cada cliente referido.</p>
        </NelvyonDsCard>
        <NelvyonDsCard title="Panel de control">
          <p className="text-sm text-muted-foreground">Sigue leads, referidos y comisiones en tiempo real desde SaaS.</p>
        </NelvyonDsCard>
        <NelvyonDsCard title="Pagos mensuales">
          <p className="text-sm text-muted-foreground">Liquidación automática y transparente de tus comisiones.</p>
        </NelvyonDsCard>
      </section>

      <NelvyonDsCard className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Calculadora simple</h2>
        <label className="block text-sm text-muted-foreground" htmlFor="clients">
          Número de clientes
        </label>
        <input
          id="clients"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
          type="number"
          value={clients}
          onChange={(e) => setClients(e.target.value)}
        />
        <p className="text-sm text-white">
          Comisión mensual estimada: <span className="font-semibold">€{commission.toFixed(2)}</span>
        </p>
      </NelvyonDsCard>

      <section className="flex justify-center">
        <NelvyonDsButton asChild size="lg">
          <Link href="/saas/partners">Conviértete en Partner</Link>
        </NelvyonDsButton>
      </section>
    </main>
    </>
  );
}
