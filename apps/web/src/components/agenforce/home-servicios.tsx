import Link from "next/link";

import { HOME_SERVICE_GROUPS, HOME_SERVICES } from "./home-services-config";

export function HomeServicios() {
  return (
    <section
      className="nelvyon-home-section nelvyon-section--alt nelvyon-home-servicios"
      aria-labelledby="home-servicios-title"
    >
      <div className="nelvyon-section-inner nelvyon-section-inner--wide">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Servicios</p>
          <h2 id="home-servicios-title" className="mkt-h2 mkt-h2--display">
            Ejecución profesional en diez áreas
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead nelvyon-home-servicios__lead">
            Tres bloques operativos. Entregables definidos, sin promesas vacías.
          </p>
        </header>

        <div className="nelvyon-home-servicios__groups">
          {HOME_SERVICE_GROUPS.map((group, index) => {
            const services = HOME_SERVICES.filter((item) => item.group === group.id);

            return (
              <div
                key={group.id}
                className={`nelvyon-home-servicios__group ${index % 2 === 1 ? "nelvyon-home-servicios__group--alt" : ""}`}
              >
                <header className="nelvyon-home-servicios__group-head">
                  <span className="nelvyon-home-servicios__group-index" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="nelvyon-home-servicios__group-eyebrow">{group.title}</p>
                    <h3 className="nelvyon-home-servicios__group-label">{group.desc}</h3>
                  </div>
                </header>
                <div className="nelvyon-home-servicios__grid">
                  {services.map((item) => (
                    <Link key={item.title} href={item.href} className="nelvyon-home-servicios__card">
                      <span className="nelvyon-home-servicios__card-accent" aria-hidden />
                      <div className="nelvyon-home-servicios__card-top">
                        <div className="nelvyon-home-servicios__icon" aria-hidden>
                          <item.Icon size={28} stroke={1.5} />
                        </div>
                        <h4 className="nelvyon-home-servicios__title">{item.title}</h4>
                      </div>
                      <p className="nelvyon-home-servicios__desc">{item.desc}</p>
                      <span className="nelvyon-home-servicios__link">Ver servicio →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
