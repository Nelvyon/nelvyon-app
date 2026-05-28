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
    <section style={{ backgroundColor: NELVYON_NAVY, paddingTop: "64px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 56px", textAlign: "center" }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "14px",
          }}
        >
          {eyebrow}
        </p>
        <h1
          className="fade-in"
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 16px",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: "clamp(16px, 1.8vw, 18px)", color: "rgba(255,255,255,0.65)", margin: ctaLabel ? "0 0 28px" : 0, lineHeight: 1.6 }}>
          {subtitle}
        </p>
        {ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            style={{
              display: "inline-block",
              backgroundColor: NELVYON_BLUE,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "14px",
              padding: "12px 24px",
              borderRadius: "8px",
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
          section { padding-top: 52px !important; }
          section > div { padding: 32px 20px 40px !important; }
        }
        @media (max-width: 480px) {
          section > div p:first-of-type { display: none; }
        }
      `}</style>
    </section>
  );
}
