import Link from "next/link";
import {
  IconChartBar,
  IconPlugConnected,
  IconRocket,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";

import { SAAS_CAPABILITIES } from "./home-services-config";

const SAAS_ICONS = [IconUsers, IconWebhook, IconRocket, IconChartBar, IconPlugConnected] as const;

export function HomeSaasCompact() {
  return (
    <section className="nelvyon-home-saas-compact" aria-labelledby="home-saas-title">
      <div className="nelvyon-home-saas-compact__glow" aria-hidden />
      <div className="nelvyon-section-inner nelvyon-section-inner--wide">
        <header className="nelvyon-home-saas-compact__head">
          <p className="mkt-eyebrow nelvyon-home-saas-compact__eyebrow">Plataforma SaaS</p>
          <h2 id="home-saas-title" className="mkt-h2 mkt-h2--display mkt-h2--light">
            Centraliza la operación cuando crece el volumen
          </h2>
          <p className="nelvyon-home-saas-compact__lead">
            CRM, campañas, automatizaciones e integraciones en un entorno conectado.
          </p>
          <Link href="/saas" className="mkt-btn nelvyon-btn-primary nelvyon-home-saas-compact__cta">
            Ver plataforma SaaS
          </Link>
        </header>

        <div className="nelvyon-home-saas-compact__cards">
          {SAAS_CAPABILITIES.map((item, index) => {
            const Icon = SAAS_ICONS[index] ?? IconUsers;
            return (
              <article key={item.title} className="nelvyon-home-saas-compact__card">
                <div className="nelvyon-home-saas-compact__card-icon" aria-hidden>
                  <Icon size={26} stroke={1.5} />
                </div>
                <h3 className="nelvyon-home-saas-compact__card-title">{item.title}</h3>
                <p className="nelvyon-home-saas-compact__card-desc">{item.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
