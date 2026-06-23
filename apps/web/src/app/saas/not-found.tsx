import Link from "next/link";
import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

export default function SaasNotFound() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SaasSidebar activeId="dashboard" />
          <main className="flex items-center justify-center py-24">
            <NelvyonDsCard className="max-w-md p-12 text-center">
              <p className="text-6xl font-black text-primary">404</p>
              <p className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Este módulo no existe o no tienes acceso.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Link href="/saas/dashboard">
                  <NelvyonDsButton className="w-full">Ir al Dashboard</NelvyonDsButton>
                </Link>
                <Link href="/saas/chat">
                  <NelvyonDsButton variant="ghost" className="w-full">
                    💬 Preguntar al Asistente IA
                  </NelvyonDsButton>
                </Link>
              </div>
            </NelvyonDsCard>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
