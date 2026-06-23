import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function SaasLoading() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar skeleton */}
          <div className="h-[600px] animate-pulse rounded-2xl bg-muted/30" />
          {/* Content skeleton */}
          <div className="space-y-6">
            <div className="h-12 w-64 animate-pulse rounded-xl bg-muted/30" />
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/30" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-48 animate-pulse rounded-xl bg-muted/30" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
