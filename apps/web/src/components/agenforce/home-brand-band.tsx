import Link from "next/link";

export function HomeBrandBand() {
  return (
    <section className="nelvyon-brand-band" aria-label="Propuesta NELVYON">
      <div className="nelvyon-brand-band__inner">
        <div className="nelvyon-brand-band__copy">
          <p className="nelvyon-brand-band__eyebrow">NELVYON</p>
          <p className="nelvyon-brand-band__text">
            Servicios profesionales y plataforma SaaS para operar marketing, ventas y reporting con
            continuidad.
          </p>
        </div>
        <div className="nelvyon-brand-band__actions">
          <a href="/contacto" className="nelvyon-brand-band__cta nelvyon-brand-band__cta--primary">
            Solicitar información
          </a>
          <Link href="/servicios" className="nelvyon-brand-band__cta nelvyon-brand-band__cta--ghost">
            Ver servicios
          </Link>
        </div>
      </div>
    </section>
  );
}
