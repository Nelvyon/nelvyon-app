"use client";

import { NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

export default function SaasLoyaltyPage() {
  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="settings" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Programa de Fidelización"
          subtitle="Puntos, recompensas y retención de clientes"
        />
        <NelvyonDsCard className="p-16 text-center">
          <p className="text-5xl">🏆</p>
          <p className="mt-4 text-xl font-semibold text-foreground">Próximamente</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            El programa de fidelización está en desarrollo. Crea sistemas de puntos, niveles y recompensas para tus clientes desde aquí.
          </p>
        </NelvyonDsCard>
      </div>
    </SaasShellLayout>
  );
}
