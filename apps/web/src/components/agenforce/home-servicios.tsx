import Link from "next/link";

import { HOME_SERVICES } from "./home-services-config";
import { NELVYON_BLUE } from "./marketing-brand";

export function HomeServicios() {
  return (
    <section className="nelvyon-home-section nelvyon-section--white nelvyon-home-servicios" aria-labelledby="home-servicios-title">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Servicios</p>
          <h2 id="home-servicios-title" className="mkt-h2 mkt-h2--display">
            Ejecución profesional en diez áreas
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead">
            Entregables definidos en captación, marca, web, ecommerce, operación comercial y reporting.
            Sin resultados garantizados ni promesas vacías.
          </p>
        </header>
        <div className="nelvyon-home-servicios__grid">
          {HOME_SERVICES.map((item) => (
            <Link key={item.title} href={item.href} className="nelvyon-home-servicios__card">
              <div className="nelvyon-home-servicios__body">
                <div className="nelvyon-home-servicios__icon" aria-hidden>
                  <item.Icon size={22} stroke={1.5} color={NELVYON_BLUE} />
                </div>
                <h3 className="nelvyon-home-servicios__title">{item.title}</h3>
                <p className="nelvyon-home-servicios__desc">{item.desc}</p>
                <span className="nelvyon-home-servicios__link">Ver servicio →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
