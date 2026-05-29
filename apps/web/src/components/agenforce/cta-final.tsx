import Link from "next/link";

type CtaFinalProps = {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  showSecondary?: boolean;
};

export function CtaFinal({
  title = "Opera marketing con más control",
  subtitle = "Centraliza campañas, CRM y automatización en un sistema diseñado para continuidad.",
  primaryLabel = "Solicitar demo",
  primaryHref = "/contacto",
  showSecondary = true,
}: CtaFinalProps) {
  return (
    <section className="nelvyon-mkt-section--airy" style={{ background: "#07122a" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <h2
          className="mkt-h2 mkt-h2--light fade-in"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", marginBottom: 14 }}
        >
          {title}
        </h2>
        <p
          className="mkt-lead--light"
          style={{
            margin: "0 0 36px",
          }}
        >
          {subtitle}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={primaryHref}
            className="mkt-btn"
            style={{
              display: "inline-block",
              backgroundColor: "#ffffff",
              color: "#07122a",
              fontWeight: 600,
              fontSize: 14,
              padding: "11px 24px",
              borderRadius: 7,
              textDecoration: "none",
            }}
          >
            {primaryLabel}
          </a>
          {showSecondary ? (
            <Link
              href="/saas"
              className="mkt-btn"
              style={{
                display: "inline-block",
                backgroundColor: "transparent",
                color: "rgba(255,255,255,0.88)",
                fontWeight: 500,
                fontSize: 14,
                padding: "11px 24px",
                borderRadius: 7,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              Ver SaaS
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
