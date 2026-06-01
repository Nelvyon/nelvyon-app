import Link from "next/link";
import {
  IconChartBar,
  IconRocket,
  IconSparkles,
  IconTarget,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";

import { HOME_SERVICE_GROUPS, SAAS_CAPABILITIES } from "./home-services-config";

const GROUP_ICONS = {
  captacion: IconTarget,
  marca: IconSparkles,
  operacion: IconUsers,
} as const;

const GROUP_TAGS: Record<(typeof HOME_SERVICE_GROUPS)[number]["id"], readonly string[]> = {
  captacion: ["SEO", "Ads", "Social", "Email"],
  marca: ["Branding", "Web", "Ecommerce"],
  operacion: ["Automatización", "CRM", "Reporting"],
};

const SAAS_ICONS = [IconUsers, IconWebhook, IconRocket, IconChartBar, IconSparkles] as const;

export function HomeQueHaceNelvyon() {
  return (
    <section
      className="nelvyon-home-section nelvyon-section--white nelvyon-que-hace"
      aria-labelledby="que-hace-nelvyon-title"
    >
      <div className="nelvyon-section-inner nelvyon-section-inner--wide">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Qué hace NELVYON</p>
          <h2 id="que-hace-nelvyon-title" className="mkt-h2 mkt-h2--display">
            A qué se dedica NELVYON
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead nelvyon-que-hace__lead">
            Servicios profesionales para ejecutar. Plataforma SaaS para centralizar cuando el volumen
            lo requiere.
          </p>
        </header>

        <div className="nelvyon-que-hace__pillars">
          <article className="nelvyon-que-hace__pillar nelvyon-que-hace__pillar--services">
            <div className="nelvyon-que-hace__pillar-head">
              <p className="nelvyon-que-hace__pillar-eyebrow">Servicios profesionales</p>
              <h3 className="nelvyon-que-hace__pillar-title">Ejecución con entregables definidos</h3>
            </div>
            <div className="nelvyon-que-hace__tiles">
              {HOME_SERVICE_GROUPS.map((group) => {
                const Icon = GROUP_ICONS[group.id];
                return (
                  <div key={group.id} className="nelvyon-que-hace__tile">
                    <div className="nelvyon-que-hace__tile-icon" aria-hidden>
                      <Icon size={24} stroke={1.5} />
                    </div>
                    <p className="nelvyon-que-hace__tile-title">{group.title}</p>
                    <div className="nelvyon-que-hace__tile-tags">
                      {GROUP_TAGS[group.id].map((tag) => (
                        <span key={tag} className="nelvyon-que-hace__tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/servicios" className="mkt-btn nelvyon-btn-primary nelvyon-que-hace__pillar-cta">
              Ver servicios
            </Link>
          </article>

          <article className="nelvyon-que-hace__pillar nelvyon-que-hace__pillar--saas">
            <div className="nelvyon-que-hace__pillar-head">
              <p className="nelvyon-que-hace__pillar-eyebrow">Plataforma SaaS</p>
              <h3 className="nelvyon-que-hace__pillar-title">Centralización operativa</h3>
            </div>
            <div className="nelvyon-que-hace__saas-grid">
              {SAAS_CAPABILITIES.map((cap, index) => {
                const Icon = SAAS_ICONS[index] ?? IconUsers;
                return (
                  <div key={cap.title} className="nelvyon-que-hace__saas-card">
                    <div className="nelvyon-que-hace__saas-icon" aria-hidden>
                      <Icon size={22} stroke={1.5} />
                    </div>
                    <p className="nelvyon-que-hace__saas-title">{cap.title}</p>
                  </div>
                );
              })}
            </div>
            <Link
              href="/saas"
              className="mkt-btn nelvyon-btn-outline nelvyon-btn-outline--light nelvyon-que-hace__pillar-cta"
            >
              Ver plataforma SaaS
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
