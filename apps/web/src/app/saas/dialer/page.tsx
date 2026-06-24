"use client";

import { NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

export default function SaasDialerPage() {
  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="inbox" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Dialer Avanzado"
          subtitle="Llamadas salientes automatizadas"
        />
        <NelvyonDsCard className="p-16 text-center">
          <p className="text-5xl">📞</p>
          <p className="mt-4 text-xl font-semibold text-foreground">Próximamente</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            El dialer avanzado está en desarrollo. Configura campañas de llamadas salientes, scripts y seguimiento de llamadas desde aquí.
          </p>
        </NelvyonDsCard>
      </div>
    </SaasShellLayout>
  );
}
