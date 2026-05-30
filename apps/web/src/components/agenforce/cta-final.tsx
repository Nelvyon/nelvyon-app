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
  primaryLabel = "Solicitar información",
  primaryHref = "/contacto",
  showSecondary = true,
}: CtaFinalProps) {
  return (
    <section className="nelvyon-cta-final">
      <div className="nelvyon-cta-final__glow" aria-hidden />
      <div className="nelvyon-cta-final__inner">
        <h2 className="mkt-h2 mkt-h2--light fade-in nelvyon-cta-final__title">{title}</h2>
        <p className="mkt-lead--light nelvyon-cta-final__subtitle">{subtitle}</p>
        <div className="nelvyon-cta-final__actions">
          <a href={primaryHref} className="mkt-btn nelvyon-btn-primary">
            {primaryLabel}
          </a>
          {showSecondary ? (
            <Link href="/saas" className="mkt-btn nelvyon-btn-ghost">
              Ver SaaS
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
