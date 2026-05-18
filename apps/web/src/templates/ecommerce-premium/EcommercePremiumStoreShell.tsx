import type { CSSProperties, ReactNode } from "react";

import type { EcommercePremiumStoreConfig } from "@/templates/ecommerce-premium/types";
import { EcommercePremiumDeliveryChecklist } from "@/templates/ecommerce-premium/EcommercePremiumDeliveryChecklist";
import { EcommercePremiumFooter } from "@/templates/ecommerce-premium/EcommercePremiumFooter";
import { EcommercePremiumHeader } from "@/templates/ecommerce-premium/EcommercePremiumHeader";

interface Props {
  store: EcommercePremiumStoreConfig;
  showDeliveryPanel?: boolean;
  children: ReactNode;
}

export function EcommercePremiumStoreShell({ store, showDeliveryPanel = false, children }: Props) {
  const surfaceStyle = {
    "--ep-accent": store.theme.accentHex,
  } as CSSProperties;

  return (
    <div
      className="ecommerce-premium-template flex min-h-[60vh] flex-col bg-muted/25 text-foreground antialiased dark:bg-muted/15"
      style={surfaceStyle}
    >
      <div className="relative">
        <a
          className="absolute left-2 top-2 z-[200] whitespace-nowrap rounded-md bg-card px-3 py-2 text-sm font-semibold text-foreground opacity-0 shadow-elevated focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href="#main-content"
        >
          Skip to content
        </a>
        <EcommercePremiumHeader store={store} />
      </div>
      {showDeliveryPanel ? (
        <p className="mx-auto w-full max-w-6xl border-b border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning-foreground sm:px-6">
          <strong className="font-semibold">Internal OS preview</strong>
          {" · "}
          E‑commerce Premium template v2 — Design System applied. PLP · PDP · checkout. No PSP, carts, or inventory APIs wired.
        </p>
      ) : null}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14" id="main-content">
        {children}
      </main>
      {showDeliveryPanel ? <EcommercePremiumDeliveryChecklist /> : null}
      <EcommercePremiumFooter store={store} />
    </div>
  );
}
