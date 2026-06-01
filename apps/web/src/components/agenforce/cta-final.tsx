import Link from "next/link";

type CtaFinalProps = {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showSecondary?: boolean;
};

export function CtaFinal({
  title = "Opera marketing con más control",
  subtitle = "Centraliza campañas, CRM y automatización en un sistema diseñado para continuidad.",
  primaryLabel = "Solicitar información",
  primaryHref = "/contacto",
  secondaryLabel = "Ver SaaS",
  secondaryHref = "/saas",
  showSecondary = true,
}: CtaFinalProps) {
  return (
    <section className="nelvyon-cta-final nelvyon-cta-final--v4">
      <div className="nelvyon-cta-final__inner">
        <h2 className="mkt-h2 mkt-h2--light nelvyon-cta-final__title">{title}</h2>
        {subtitle ? <p className="mkt-lead--light nelvyon-cta-final__subtitle">{subtitle}</p> : null}
        <div className="nelvyon-cta-final__actions">
          <a href={primaryHref} className="mkt-btn nelvyon-btn-primary">
            {primaryLabel}
          </a>
          {showSecondary ? (
            <Link href={secondaryHref} className="mkt-btn nelvyon-btn-ghost">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
