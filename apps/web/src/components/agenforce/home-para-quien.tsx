import type { TablerIcon } from "@tabler/icons-react";
import {
  IconSchool,
  IconShoppingCart,
  IconSpeakerphone,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type Perfil = { title: string; desc: string; Icon: TablerIcon };

const PERFILES: Perfil[] = [
  { title: "Agencias de marketing", desc: "Multi-cliente con procesos centralizados.", Icon: IconSpeakerphone },
  { title: "SaaS y scale-ups", desc: "Captación, onboarding y operación comercial integrada.", Icon: IconUsersGroup },
  { title: "E-commerce", desc: "Campañas, catálogo y reporting conectados.", Icon: IconShoppingCart },
  { title: "Educación y formación", desc: "Comunicación y seguimiento de oportunidades.", Icon: IconSchool },
  { title: "Consultoras", desc: "Operación comercial y reporting unificado.", Icon: IconUsersGroup },
  { title: "Profesionales", desc: "CRM y automatización sin herramientas dispersas.", Icon: IconUser },
];

export function HomeParaQuien() {
  return (
    <section className="nelvyon-home-section nelvyon-section--dark nelvyon-para-quien" aria-labelledby="para-quien-title">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Para quién</p>
          <h2 id="para-quien-title" className="mkt-h2 mkt-h2--display">
            Perfiles operativos habituales
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead">
            Escenarios donde NELVYON encaja con servicios y plataforma. No son testimonios, métricas publicadas ni
            resultados garantizados.
          </p>
        </header>
        <div className="nelvyon-para-quien__grid">
          {PERFILES.map((perfil) => (
            <article key={perfil.title} className="nelvyon-para-quien__card">
              <div className="nelvyon-para-quien__icon" aria-hidden>
                <perfil.Icon size={20} stroke={1.5} color={NELVYON_BLUE} />
              </div>
              <h3 className="nelvyon-para-quien__title">{perfil.title}</h3>
              <p className="nelvyon-para-quien__desc">{perfil.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
