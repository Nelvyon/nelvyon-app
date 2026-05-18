import Link from "next/link";

import type { EcommercePremiumStoreConfig } from "@/templates/ecommerce-premium/types";
import { ECOMMERCE_PREMIUM_PREVIEW_BASE } from "@/templates/ecommerce-premium/paths";

interface Props {
  store: EcommercePremiumStoreConfig;
}

export function EcommercePremiumHeader({ store }: Props) {
  return (
    <header className="border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{store.storeName}</p>
          <p className="text-lg font-semibold tracking-tight text-foreground">{store.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="text-xs text-muted-foreground">{store.trustNote}</p>
          <nav aria-label="Store">
            <ul className="flex flex-wrap gap-4">
              <li>
                <Link
                  className="text-sm font-medium text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={ECOMMERCE_PREMIUM_PREVIEW_BASE}
                >
                  Catalog
                </Link>
              </li>
              <li>
                <Link
                  className="text-sm font-medium text-link underline-offset-4 hover:text-link-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={`${ECOMMERCE_PREMIUM_PREVIEW_BASE}/checkout`}
                >
                  Checkout
                </Link>
              </li>
              <li>
                <Link
                  className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href="/os"
                >
                  OS home
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
