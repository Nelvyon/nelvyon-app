import Link from "next/link";

import { HomeDashboard } from "@/app/HomeDashboard";
import { getBrandAppName, getBrandMode } from "@/core/platform/brand";

export default function AnalyticsOverviewPage() {
  const brandMode = getBrandMode();
  const appName = getBrandAppName(brandMode);
  const isClientMode = brandMode === "client";

  if (isClientMode) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold text-foreground">{appName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This internal analytics overview is not part of the client portal surface.
        </p>
        <p className="mt-3 text-sm">
          <Link className="text-link underline" href="/">
            Back to portal home
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-foreground">Internal reporting dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Activation progress first, then operational shortcuts for revenue, support, billing, and OS follow-through.
      </p>
      <div className="mt-6">
        <HomeDashboard />
      </div>
      <div className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Operational shortcuts</h2>
        <ul className="mt-2 space-y-2 text-link">
          <li>
            <Link className="underline" href="/analytics/revenue">
              Open revenue analytics v2
            </Link>
          </li>
          <li>
            <Link className="underline" href="/analytics/tickets">
              Open tickets analytics v2
            </Link>
          </li>
          <li>
            <Link className="underline" href="/analytics/campaigns">
              Open campaigns analytics v2
            </Link>
          </li>
          <li>
            <Link className="underline" href="/crm/clients">
              Open revenue clients
            </Link>
          </li>
          <li>
            <Link className="underline" href="/inbox/tickets">
              Open inbox tickets
            </Link>
          </li>
          <li>
            <Link className="underline" href="/billing">
              Open billing
            </Link>
          </li>
          <li>
            <Link className="underline" href="/os">
              Open OS overview
            </Link>
          </li>
          <li>
            <Link className="underline" href="/app/voz">
              Open voice (VOZ) v1
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
