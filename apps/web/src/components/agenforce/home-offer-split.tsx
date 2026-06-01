import Link from "next/link";
import { IconArrowRight, IconCloud, IconTools } from "@tabler/icons-react";

const OFFERS = [
  {
    id: "servicios",
    eyebrow: "Servicios",
    title: "Ejecución profesional",
    desc: "Marketing, web, ecommerce y operación con entregables definidos.",
    href: "/servicios",
    cta: "Ver servicios",
    Icon: IconTools,
  },
  {
    id: "saas",
    eyebrow: "Plataforma",
    title: "Centralización SaaS",
    desc: "CRM, campañas, automatizaciones e integraciones cuando crece el volumen.",
    href: "/saas",
    cta: "Ver plataforma SaaS",
    Icon: IconCloud,
  },
] as const;

export function HomeOfferSplit() {
  return (
    <section className="nelvyon-home-offer" aria-labelledby="home-offer-title">
      <div className="nelvyon-section-inner nelvyon-section-inner--wide">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow nelvyon-home-offer__eyebrow">Dos formas de trabajar con NELVYON</p>
          <h2 id="home-offer-title" className="mkt-h2 mkt-h2--display mkt-h2--light">
            El detalle está en cada área
          </h2>
          <p className="nelvyon-home-offer__lead">
            La home orienta. Los servicios y la plataforma se explican en sus páginas.
          </p>
        </header>
        <div className="nelvyon-home-offer__grid">
          {OFFERS.map((offer) => (
            <Link key={offer.id} href={offer.href} className="nelvyon-home-offer__card">
              <div className="nelvyon-home-offer__icon" aria-hidden>
                <offer.Icon size={28} stroke={1.5} />
              </div>
              <p className="nelvyon-home-offer__card-eyebrow">{offer.eyebrow}</p>
              <h3 className="nelvyon-home-offer__card-title">{offer.title}</h3>
              <p className="nelvyon-home-offer__card-desc">{offer.desc}</p>
              <span className="nelvyon-home-offer__card-cta">
                {offer.cta}
                <IconArrowRight size={18} stroke={2} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
