import Link from "next/link";
import { NavyToWhiteTransition } from "./section-transition";
import { NELVYON_BLUE } from "./marketing-brand";

type MarketingPageHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function MarketingPageHero({ eyebrow, title, subtitle, ctaLabel, ctaHref }: MarketingPageHeroProps) {
  return (
    <section className="nelvyon-page-hero" style={{ paddingTop: 56, position: "relative" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "44px 24px 52px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <p className="mkt-eyebrow nelvyon-page-hero-eyebrow" style={{ color: "rgba(255,255,255,0.55)" }}>
          {eyebrow}
        </p>
        <h1
          className="fade-in"
          style={{
            fontSize: "clamp(28px, 4.5vw, 44px)",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 14px",
            lineHeight: 1.06,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </h1>
        <p
          className="mkt-lead--light"
          style={{
            fontSize: "clamp(15px, 1.5vw, 17px)",
            margin: ctaLabel ? "0 0 24px" : 0,
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
              borderRadius: 8,
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
          .nelvyon-page-hero { padding-top: 48px !important; }
          .nelvyon-page-hero > div { padding: 32px 20px 40px !important; }
        }
        @media (max-width: 480px) {
          .nelvyon-page-hero-eyebrow { display: none; }
        }
      `}</style>
    </section>
  );
}
