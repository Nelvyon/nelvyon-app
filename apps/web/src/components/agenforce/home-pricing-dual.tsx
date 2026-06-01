import Link from "next/link";

export function HomePricingDual() {
  return (
    <section className="nelvyon-home-section nelvyon-section--dark nelvyon-home-pricing-dual" aria-labelledby="home-pricing-title">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Precios</p>
          <h2 id="home-pricing-title" className="mkt-h2 mkt-h2--display">
            SaaS y servicios, con propuestas claras
          </h2>
        </header>
        <div className="nelvyon-home-pricing-dual__grid">
          <article className="nelvyon-home-pricing-dual__card">
            <p className="nelvyon-home-pricing-dual__eyebrow">Plataforma SaaS</p>
            <h3 className="nelvyon-home-pricing-dual__price">Desde €47/mes</h3>
            <p className="nelvyon-home-pricing-dual__desc">
              Escala según tu operación. Sin permanencia forzada en la propuesta comercial.
            </p>
            <Link href="/saas" className="nelvyon-home-pricing-dual__link">
              Ver SaaS →
            </Link>
          </article>
          <article className="nelvyon-home-pricing-dual__card">
            <p className="nelvyon-home-pricing-dual__eyebrow">Servicios</p>
            <h3 className="nelvyon-home-pricing-dual__price">A medida</h3>
            <p className="nelvyon-home-pricing-dual__desc">
              Presupuesto según alcance y entregables. Sin resultados garantizados.
            </p>
            <Link href="/contacto" className="nelvyon-home-pricing-dual__link">
              Solicitar información →
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
