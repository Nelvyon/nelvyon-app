import { SkeletonMetricGrid, SkeletonTable } from "@/features/dashboard/components/EliteUi";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 py-2">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <SkeletonMetricGrid count={4} />
      <SkeletonTable cols={5} rows={8} />
    </div>
  );
}
