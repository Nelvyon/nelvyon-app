/**
 * SaasPageSkeleton — Universal skeleton loading wrapper for SaaS pages.
 * Provides consistent loading states across ALL modules.
 * 
 * Usage:
 *   const { loading } = useData();
 *   if (loading) return <SaasPageSkeleton variant="dashboard" />;
 */
import { SkeletonStatCard, SkeletonTable, SkeletonChart, SkeletonCardGrid, SkeletonListItem, SkeletonDashboard } from "@/components/SkeletonCards";

type SkeletonVariant = "dashboard" | "table" | "cards" | "list" | "chart" | "mixed" | "calendar" | "kanban" | "detail";

interface Props {
  variant?: SkeletonVariant;
  /** Number of items for cards/list variants */
  count?: number;
}

export default function SaasPageSkeleton({ variant = "dashboard", count = 6 }: Props) {
  switch (variant) {
    case "dashboard":
      return <SkeletonDashboard />;

    case "table":
      return (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="h-9 w-64 rounded-md bg-white/[0.04] animate-pulse" />
            <div className="h-9 w-24 rounded-md bg-white/[0.04] animate-pulse" />
          </div>
          <SkeletonTable rows={8} columns={6} />
        </div>
      );

    case "cards":
      return <SkeletonCardGrid count={count} />;

    case "list":
      return (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      );

    case "chart":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonChart height={250} />
            <SkeletonChart height={250} />
          </div>
        </div>
      );

    case "calendar":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-40 rounded-md bg-white/[0.04] animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-md bg-white/[0.04] animate-pulse" />
              <div className="h-8 w-8 rounded-md bg-white/[0.04] animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`h-${i}`} className="h-6 rounded bg-white/[0.04] animate-pulse" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-white/[0.02] border border-white/[0.04] animate-pulse" />
            ))}
          </div>
        </div>
      );

    case "kanban":
      return (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, col) => (
            <div key={col} className="min-w-[280px] space-y-3">
              <div className="h-8 rounded-lg bg-white/[0.04] animate-pulse" />
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.06] space-y-2 animate-pulse">
                  <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-5 w-14 rounded-full bg-white/[0.04]" />
                    <div className="h-5 w-14 rounded-full bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    case "detail":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.06]" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 rounded bg-white/[0.08]" />
              <div className="h-3 w-32 rounded bg-white/[0.04]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <SkeletonChart height={200} />
        </div>
      );

    case "mixed":
    default:
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <SkeletonTable rows={5} columns={5} />
        </div>
      );
  }
}