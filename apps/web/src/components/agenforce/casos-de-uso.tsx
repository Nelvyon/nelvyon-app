import type { TablerIcon } from "@tabler/icons-react";
import {
  IconSchool,
  IconShoppingCart,
  IconSpeakerphone,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type Caso = { title: string; desc: string; Icon: TablerIcon };

const CASOS: Caso[] = [
  { title: "Agencias de marketing", desc: "Multi-cliente con procesos centralizados.", Icon: IconSpeakerphone },
  { title: "SaaS y scale-ups", desc: "Captación, onboarding y operación comercial integrada.", Icon: IconUsersGroup },
  { title: "E-commerce", desc: "Campañas, catálogo y reporting conectados.", Icon: IconShoppingCart },
  { title: "Educación y formación", desc: "Comunicación y seguimiento de oportunidades.", Icon: IconSchool },
  { title: "Consultoras", desc: "Operación comercial y reporting unificado.", Icon: IconUsersGroup },
  { title: "Profesionales", desc: "CRM y automatización sin herramientas dispersas.", Icon: IconUser },
];

export function CasosDeUso() {
  return (
    <section className="nelvyon-home-section nelvyon-section--white">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <h2 className="mkt-h2 mkt-h2--display fade-in">Casos de uso</h2>
          <p className="mkt-lead nelvyon-home-section__lead fade-in">
            Escenarios operativos habituales. No son testimonios, métricas publicadas ni resultados garantizados.
          </p>
        </header>
        <div className="nelvyon-home-casos-grid">
          {CASOS.map((c) => (
            <article key={c.title} className="mkt-card nelvyon-home-icon-card nelvyon-home-icon-card--caso">
              <div className="nelvyon-home-icon-card__icon nelvyon-home-icon-card__icon--round" aria-hidden>
                <c.Icon size={24} stroke={1.5} color={NELVYON_BLUE} />
              </div>
              <h3 className="mkt-card__title nelvyon-home-icon-card__title">{c.title}</h3>
              <p className="mkt-card__desc">{c.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
