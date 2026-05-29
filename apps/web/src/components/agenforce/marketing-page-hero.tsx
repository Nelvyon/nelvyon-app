import Link from "next/link";
import { NavyToWhiteTransition } from "./section-transition";
import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

type MarketingPageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function MarketingPageHero({ eyebrow, title, subtitle, ctaLabel, ctaHref }: MarketingPageHeroProps) {
  return (
    <section style={{ backgroundColor: NELVYON_NAVY, paddingTop: 56 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "44px 24px 52px", textAlign: "center" }}>
        <p className="mkt-eyebrow nelvyon-page-hero-eyebrow" style={{ color: "rgba(255,255,255,0.4)" }}>
          {eyebrow}
        </p>
        <h1
          className="fade-in"
          style={{
            fontSize: "clamp(28px, 4.5vw, 44px)",
            fontWeight: 650,
            color: "#ffffff",
            margin: "0 0 14px",
            lineHeight: 1.06,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: "clamp(15px, 1.5vw, 17px)",
            color: "rgba(255,255,255,0.52)",
            margin: ctaLabel ? "0 0 24px" : 0,
            lineHeight: 1.5,
            letterSpacing: "-0.012em",
          }}
        >
          {subtitle}
        </p>
        {ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            className="mkt-btn"
            style={{
              display: "inline-block",
              backgroundColor: NELVYON_BLUE,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 14,
              padding: "11px 22px",
              borderRadius: 7,
              textDecoration: "none",
            }}
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
      <NavyToWhiteTransition />
      <style>{`
        @media (max-width: 768px) {
          section { padding-top: 48px !important; }
          section > div { padding: 32px 20px 40px !important; }
        }
        @media (max-width: 480px) {
          .nelvyon-page-hero-eyebrow { display: none; }
        }
      `}</style>
    </section>
  );
}
