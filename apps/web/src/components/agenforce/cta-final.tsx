import Link from "next/link";

type CtaFinalProps = {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  showSecondary?: boolean;
};

export function CtaFinal({
  title = "Construye una operación de marketing más seria",
  subtitle = "Centraliza campañas, contenidos, CRM, automatización y reporting en un sistema diseñado para trabajar con orden, criterio y continuidad.",
  primaryLabel = "Solicitar demo",
  primaryHref = "/contacto",
  showSecondary = true,
}: CtaFinalProps) {
  return (
    <section className="nelvyon-mkt-section" style={{ background: "linear-gradient(180deg, #07122a 0%, #0d2048 70%, #0a1835 100%)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.15 }}>
          {title}
        </h2>
        <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.9)", margin: "0 0 48px", lineHeight: 1.6 }}>
          {subtitle}
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={primaryHref}
            style={{
              display: "inline-block",
              backgroundColor: "#ffffff",
              color: "#07122a",
              fontWeight: 700,
              fontSize: "16px",
              padding: "16px 40px",
              borderRadius: "12px",
              textDecoration: "none",
              border: "2px solid #ffffff",
            }}
          >
            {primaryLabel}
          </a>
          {showSecondary ? (
            <Link
              href="/servicios"
              style={{
                display: "inline-block",
                backgroundColor: "transparent",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "16px",
                padding: "16px 40px",
                borderRadius: "12px",
                textDecoration: "none",
                border: "2px solid rgba(255,255,255,0.4)",
              }}
            >
              Ver servicios
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
