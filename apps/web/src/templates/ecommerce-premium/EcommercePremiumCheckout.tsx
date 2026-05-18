"use client";

import Link from "next/link";

import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import type { EcommercePremiumStoreConfig } from "@/templates/ecommerce-premium/types";
import { ECOMMERCE_PREMIUM_PREVIEW_BASE } from "@/templates/ecommerce-premium/paths";

interface Props {
  store: EcommercePremiumStoreConfig;
}

export function EcommercePremiumCheckout({ store }: Props) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
      <div className="space-y-6">
        <NelvyonDsSectionHeader
          className="border-0 pb-2"
          subtitle={store.checkout.summaryIntro}
          title={store.checkout.heading}
        />

        <NelvyonDsCard title="Contact (demo fields)">
          <p className="mb-4 text-xs text-muted-foreground">Read-only structure — inputs are not posted to any backend in template v2.</p>
          <fieldset aria-label="Contact demo fields" className="m-0 space-y-5 border-0 p-0">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="ep-contact-name">
                Full name
              </label>
              <input
                autoComplete="name"
                className="w-full min-h-[44px] rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                id="ep-contact-name"
                name="name"
                placeholder="Jordan Customer"
                type="text"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="ep-contact-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="w-full min-h-[44px] rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                id="ep-contact-email"
                name="email"
                placeholder="you@example.com"
                type="email"
              />
            </div>
          </fieldset>
        </NelvyonDsCard>

        <p className="text-sm leading-relaxed text-muted-foreground">{store.checkout.demoOrderNote}</p>

        <div className="flex flex-wrap gap-3">
          <NelvyonDsButton disabled size="lg" title="Demo only — hook PSP in a dedicated front." type="button" variant="primary">
            Place order (demo)
          </NelvyonDsButton>
          <NelvyonDsButton asChild size="lg" variant="ghost">
            <Link href={ECOMMERCE_PREMIUM_PREVIEW_BASE}>Back to catalog</Link>
          </NelvyonDsButton>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6" id="order-summary">
        <NelvyonDsCard className="shadow-elevated" title="Order summary">
          <ul className="divide-y divide-border text-sm text-muted-foreground">
            {store.products.map((p) => (
              <li className="flex justify-between gap-4 py-3" key={p.slug}>
                <span className="text-foreground">{p.name}</span>
                <span className="font-medium text-foreground">{p.priceLabel}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Totals illustrative; tax/shipping placeholders intentionally omitted from this template.
          </p>
        </NelvyonDsCard>
      </aside>
    </div>
  );
}
