import Link from "next/link";
import { IconCircleFilled } from "@tabler/icons-react";

import { SAAS_CAPABILITIES } from "./home-services-config";
import { NELVYON_BLUE } from "./marketing-brand";

export function HomeSaasCompact() {
  return (
    <section className="nelvyon-home-saas-compact" aria-labelledby="home-saas-title">
      <div className="nelvyon-section-inner">
        <div className="nelvyon-home-saas-compact__grid">
          <div className="nelvyon-home-saas-compact__copy">
            <p className="mkt-eyebrow nelvyon-home-saas-compact__eyebrow">Plataforma SaaS</p>
            <h2 id="home-saas-title" className="mkt-h2 mkt-h2--display mkt-h2--light">
              Centraliza la operación cuando crece el volumen
            </h2>
            <p className="mkt-lead nelvyon-home-saas-compact__lead">
              CRM, automatizaciones, campañas y reporting en un entorno conectado. Complemento del trabajo ejecutado
              con servicios.
            </p>
            <Link href="/saas" className="mkt-btn nelvyon-btn-primary nelvyon-home-saas-compact__cta">
              Ver plataforma SaaS
            </Link>
          </div>
          <ul className="nelvyon-home-saas-compact__list">
            {SAAS_CAPABILITIES.map((item) => (
              <li key={item.title} className="nelvyon-home-saas-compact__item">
                <IconCircleFilled size={10} color={NELVYON_BLUE} aria-hidden className="shrink-0" />
                <div>
                  <p className="nelvyon-home-saas-compact__item-title">{item.title}</p>
                  <p className="nelvyon-home-saas-compact__item-desc">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
