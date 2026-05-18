"use client";

import { useEffect, useState, type ReactNode } from "react";

import { CancellationBanner } from "./CancellationBanner";
import { DunningBanner, type DunningBannerStatus } from "./DunningBanner";
import { SupportWidget } from "@/components/support";

type DunningApiStatus = "active" | "grace" | "warning" | "suspended";

interface DunningState {
  status: DunningApiStatus;
  daysLeft: number;
  updateUrl: string;
}

interface CancellationState {
  isCancelling: boolean;
  periodEnd: string | null;
}

export interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [dunning, setDunning] = useState<DunningState | null>(null);
  const [cancellation, setCancellation] = useState<CancellationState | null>(null);

  const refreshBanners = () => {
    void (async () => {
      try {
        const [dunningRes, cancelRes] = await Promise.all([
          fetch("/api/user/dunning-status", { credentials: "same-origin", cache: "no-store" }),
          fetch("/api/user/cancellation-status", { credentials: "same-origin", cache: "no-store" }),
        ]);
        if (dunningRes.ok) {
          setDunning((await dunningRes.json()) as DunningState);
        }
        if (cancelRes.ok) {
          const body = (await cancelRes.json()) as CancellationState & { periodEnd?: string | null };
          setCancellation(
            body.isCancelling && body.periodEnd
              ? { isCancelling: true, periodEnd: body.periodEnd }
              : null,
          );
        }
      } catch {
        /* ignore — banners are best-effort */
      }
    })();
  };

  useEffect(() => {
    refreshBanners();
  }, []);

  const showBanner = dunning && dunning.status !== "active";
  const bannerStatus: DunningBannerStatus | null =
    dunning?.status === "grace" || dunning?.status === "warning" || dunning?.status === "suspended"
      ? dunning.status
      : null;

  return (
    <div className="relative min-h-screen">
      {cancellation?.isCancelling && cancellation.periodEnd ? (
        <CancellationBanner periodEnd={cancellation.periodEnd} onReactivated={refreshBanners} />
      ) : null}
      {showBanner && bannerStatus ? (
        <DunningBanner status={bannerStatus} daysLeft={dunning.daysLeft} updateUrl={dunning.updateUrl} />
      ) : null}
      {children}
      <SupportWidget />
    </div>
  );
}
