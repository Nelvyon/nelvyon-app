import Link from "next/link";

export function HomePricingTeaser() {
  return (
    <section className="nelvyon-pricing-teaser" aria-labelledby="pricing-teaser-title">
      <div className="nelvyon-pricing-teaser__inner">
        <div className="nelvyon-pricing-teaser__copy">
          <p className="mkt-eyebrow nelvyon-pricing-teaser__eyebrow">Precios</p>
          <h2 id="pricing-teaser-title" className="mkt-h2 mkt-h2--display fade-in">
            Planes desde €47/mes
          </h2>
          <p className="mkt-lead nelvyon-pricing-teaser__lead">
            Escala según tu operación. Sin permanencia forzada en la propuesta comercial.
          </p>
        </div>
        <Link href="/saas" className="mkt-btn nelvyon-btn-primary nelvyon-pricing-teaser__cta">
          Ver plataforma SaaS
        </Link>
      </div>
    </section>
  );
}
