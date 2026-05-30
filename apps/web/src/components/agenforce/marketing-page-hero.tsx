import Link from "next/link";
import type { ReactNode } from "react";
import { NavyToWhiteTransition } from "./section-transition";
import { NELVYON_BLUE } from "./marketing-brand";

type MarketingPageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaHref?: string;
  layout?: "centered" | "split";
  visual?: ReactNode;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export function MarketingPageHero({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  layout = "centered",
  visual,
  secondaryCtaLabel,
  secondaryCtaHref,
}: MarketingPageHeroProps) {
  const isSplit = layout === "split" && visual;

  return (
    <section className={`nelvyon-page-hero ${isSplit ? "nelvyon-page-hero--split" : "nelvyon-page-hero--centered"}`}>
      <div className="nelvyon-page-hero__inner">
        {isSplit ? (
          <div className="nelvyon-page-hero-grid">
            <div className="nelvyon-page-hero-copy">
              <HeroCopy
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                ctaLabel={ctaLabel}
                ctaHref={ctaHref}
                secondaryCtaLabel={secondaryCtaLabel}
                secondaryCtaHref={secondaryCtaHref}
              />
            </div>
            <div className="nelvyon-page-hero-visual">
              <div className="nelvyon-hero-glow" aria-hidden />
              {visual}
            </div>
          </div>
        ) : (
          <>
            <div className="nelvyon-page-hero-copy nelvyon-page-hero-copy--center">
              <HeroCopy
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                ctaLabel={ctaLabel}
                ctaHref={ctaHref}
                secondaryCtaLabel={secondaryCtaLabel}
                secondaryCtaHref={secondaryCtaHref}
                centered
              />
            </div>
            {visual ? (
              <div className="nelvyon-page-hero-visual nelvyon-page-hero-visual--below">
                <div className="nelvyon-hero-glow" aria-hidden />
                {visual}
              </div>
            ) : null}
          </>
        )}
      </div>
      <NavyToWhiteTransition />
    </section>
  );
}

function HeroCopy({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  centered = false,
}: MarketingPageHeroProps & { centered?: boolean }) {
  return (
    <>
      <p className="mkt-eyebrow nelvyon-page-hero-eyebrow" style={{ color: "rgba(255,255,255,0.58)" }}>
        {eyebrow}
      </p>
      <h1 className="mkt-h1 mkt-h1--page fade-in" style={{ color: "#ffffff", marginBottom: 14 }}>
        {title}
      </h1>
      <p className="mkt-lead--light nelvyon-page-hero-subtitle" style={{ margin: ctaLabel ? "0 0 24px" : 0 }}>
        {subtitle}
      </p>
      {(ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref) ? (
        <div className={`nelvyon-hero-ctas ${centered ? "nelvyon-hero-ctas--center" : ""}`}>
          {ctaLabel && ctaHref ? (
            <Link href={ctaHref} className="mkt-btn nelvyon-btn-primary">
              {ctaLabel}
            </Link>
          ) : null}
          {secondaryCtaLabel && secondaryCtaHref ? (
            <Link href={secondaryCtaHref} className="mkt-btn nelvyon-btn-ghost">
              {secondaryCtaLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
