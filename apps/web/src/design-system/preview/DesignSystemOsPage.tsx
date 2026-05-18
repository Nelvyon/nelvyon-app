import Link from "next/link";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
  NelvyonDsStatusDot,
} from "@/design-system/components";
import {
  nelvyonBrandPrimitives,
  nelvyonColorsDark,
  nelvyonColorsLight,
  nelvyonFontFamilies,
  nelvyonRadiusPx,
  nelvyonShadows,
  nelvyonSpacing,
  nelvyonTypeScale,
} from "@/design-system/tokens";

function hslSwatch(label: string, triplet: string) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
      <span aria-hidden className="size-9 shrink-0 rounded-md border border-border shadow-card" style={{ backgroundColor: `hsl(${triplet})` }} />
      <div className="min-w-0 text-xs">
        <p className="font-medium text-foreground">{label}</p>
        <p className="truncate font-mono text-muted-foreground">{triplet}</p>
      </div>
    </div>
  );
}

export function DesignSystemOsPage() {
  const lightEntries = Object.entries(nelvyonColorsLight) as [string, string][];
  const darkEntries = Object.entries(nelvyonColorsDark) as [string, string][];

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-16">
      <NelvyonDsSectionHeader
        eyebrow="NELVYON OS · Internal"
        subtitle="Reference implementation for tokens and primitives. Product surfaces keep using existing `@/core/ui` until an explicit migration front opens."
        title="Design System v1"
      />

      <p className="text-sm text-muted-foreground">
        Visual intent: calm density (Linear), trustworthy finance contrast (Stripe), typographic restraint (Apple). Toggle
        theme from the shell — all samples respect light/dark CSS variables.
      </p>

      <section className="space-y-4">
        <NelvyonDsSectionHeader eyebrow="Tokens" subtitle="Semantic HSL triplets (space-separated) aligned with globals.css." title="Color" />
        <div className="grid gap-8 lg:grid-cols-2">
          <NelvyonDsCard title="Light semantic">
            <div className="grid gap-2 sm:grid-cols-2">{lightEntries.map(([k, v]) => <div key={k}>{hslSwatch(k, v)}</div>)}</div>
          </NelvyonDsCard>
          <NelvyonDsCard title="Dark semantic">
            <div className="grid gap-2 sm:grid-cols-2">{darkEntries.map(([k, v]) => hslSwatch(k, v))}</div>
          </NelvyonDsCard>
        </div>
        <NelvyonDsCard title="Brand primitives (charts / marketing)">
          <div className="flex flex-wrap gap-3">
            {Object.entries(nelvyonBrandPrimitives).map(([k, v]) => (
              <div key={k}>{hslSwatch(k, v)}</div>
            ))}
          </div>
        </NelvyonDsCard>
      </section>

      <section className="space-y-4">
        <NelvyonDsSectionHeader eyebrow="Tokens" title="Typography" />
        <NelvyonDsCard>
          <p className="mb-4 font-mono text-xs text-muted-foreground">{nelvyonFontFamilies.sans}</p>
          <ul className="space-y-3">
            {nelvyonTypeScale.map((step) => (
              <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2 last:border-0" key={step.id}>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step.id}</span>
                  <p style={{ fontSize: step.fontSizePx, lineHeight: `${step.lineHeightPx}px`, letterSpacing: step.letterSpacing, fontWeight: step.weight }}>
                    The quick brown fox
                  </p>
                </div>
                <p className="max-w-xs text-right text-xs text-muted-foreground">{step.usage}</p>
              </li>
            ))}
          </ul>
        </NelvyonDsCard>
      </section>

      <section className="space-y-4">
        <NelvyonDsSectionHeader eyebrow="Tokens" title="Spacing · Radius · Shadow" />
        <div className="grid gap-4 md:grid-cols-3">
          <NelvyonDsCard title="Spacing (px)">
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              {Object.entries(nelvyonSpacing).map(([k, v]) => (
                <li key={k}>
                  <span className="text-foreground">{k}</span> → {v}px
                </li>
              ))}
            </ul>
          </NelvyonDsCard>
          <NelvyonDsCard title="Radius">
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              {Object.entries(nelvyonRadiusPx).map(([k, v]) => (
                <li key={k}>
                  <span className="text-foreground">{k}</span> → {v}px
                </li>
              ))}
            </ul>
          </NelvyonDsCard>
          <NelvyonDsCard title="Shadow">
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="rounded-lg bg-muted/50 p-3 shadow-card">card</div>
              <div className="rounded-lg bg-muted/50 p-3 shadow-elevated">elevated</div>
              <p className="font-mono text-[10px] leading-relaxed">dark: {nelvyonShadows.cardDark.slice(0, 48)}…</p>
            </div>
          </NelvyonDsCard>
        </div>
      </section>

      <section className="space-y-4">
        <NelvyonDsSectionHeader
          eyebrow="Primitives"
          subtitle="New DS components live under `@/design-system/components` — do not replace core/ui in this release."
          title="Components"
        />

        <NelvyonDsCard title="NelvyonDsButton">
          <div className="flex flex-wrap gap-2">
            <NelvyonDsButton size="sm">Primary sm</NelvyonDsButton>
            <NelvyonDsButton size="md">Primary md</NelvyonDsButton>
            <NelvyonDsButton size="lg">Primary lg</NelvyonDsButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <NelvyonDsButton variant="secondary">Secondary</NelvyonDsButton>
            <NelvyonDsButton variant="ghost">Ghost</NelvyonDsButton>
            <NelvyonDsButton variant="danger">Danger</NelvyonDsButton>
          </div>
        </NelvyonDsCard>

        <NelvyonDsCard title="NelvyonDsBadge">
          <div className="flex flex-wrap gap-2">
            <NelvyonDsBadge tone="neutral">Neutral</NelvyonDsBadge>
            <NelvyonDsBadge tone="primary">Primary</NelvyonDsBadge>
            <NelvyonDsBadge tone="success">Success</NelvyonDsBadge>
            <NelvyonDsBadge tone="warning">Warning</NelvyonDsBadge>
            <NelvyonDsBadge tone="danger">Danger</NelvyonDsBadge>
          </div>
        </NelvyonDsCard>

        <NelvyonDsCard title="NelvyonDsStatusDot">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <NelvyonDsStatusDot status="ok" /> ok
            </span>
            <span className="inline-flex items-center gap-2">
              <NelvyonDsStatusDot status="warn" /> warn
            </span>
            <span className="inline-flex items-center gap-2">
              <NelvyonDsStatusDot status="crit" /> crit
            </span>
            <span className="inline-flex items-center gap-2">
              <NelvyonDsStatusDot status="pending" /> pending
            </span>
          </div>
        </NelvyonDsCard>

        <NelvyonDsCard title="NelvyonDsSectionHeader (nested example)">
          <NelvyonDsSectionHeader eyebrow="Module" subtitle="Nested instance for composition demos." title="Nested header" />
        </NelvyonDsCard>
      </section>

      <p className="text-sm text-muted-foreground">
        <Link className="text-link underline-offset-2 hover:underline" href="/os">
          Back to OS home
        </Link>
        {" · "}
        <Link className="text-link underline-offset-2 hover:underline" href="/os/excellence/golden-path">
          Golden path
        </Link>
      </p>
    </div>
  );
}
