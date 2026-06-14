import type { ReactNode } from "react";

/** Static SSR copy so staging smoke and crawlers see module context before client hydration. */
export default function AnalyticsPublicidadLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <p className="sr-only">
        Analytics de publicidad: inversión total, ROAS combinado, Google Ads y Meta Ads.
      </p>
      {children}
    </div>
  );
}
