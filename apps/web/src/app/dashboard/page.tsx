"use client";

import { HomeDashboard } from "@/app/HomeDashboard";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { WorkspacePulse } from "@/features/dashboard/components/WorkspacePulse";
import { NelvyonLaunchpad } from "@/features/launchpad/NelvyonLaunchpad";
import { QuickWinAutomations } from "@/features/onboarding/components/QuickWinAutomations";

export default function DashboardHomePage() {
  return (
    <ProtectedLayout module="os">
      <div className="space-y-8">
        <NelvyonLaunchpad />

        <WorkspacePulse />

        <HomeDashboard />

        <QuickWinAutomations />
      </div>
    </ProtectedLayout>
  );
}
