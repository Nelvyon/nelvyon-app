import type { TablerIcon } from "@tabler/icons-react";
import {
  IconChartBar,
  IconHeadset,
  IconMail,
  IconShoppingCart,
  IconSpeakerphone,
  IconUsers,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type Solucion = { title: string; desc: string; Icon: TablerIcon };

const SOLUCIONES: Solucion[] = [
  { title: "CRM y ventas", desc: "Pipeline, leads y seguimiento comercial.", Icon: IconUsers },
  { title: "Marketing y contenidos", desc: "Campañas y comunicación coordinada.", Icon: IconSpeakerphone },
  { title: "Automatización", desc: "Flujos, email y WhatsApp conectados.", Icon: IconMail },
  { title: "E-commerce", desc: "Catálogo y ventas integrados a la operación.", Icon: IconShoppingCart },
  { title: "Reporting", desc: "Paneles operativos centralizados.", Icon: IconChartBar },
  { title: "Soporte operativo", desc: "Continuidad con acompañamiento experto.", Icon: IconHeadset },
];

export function HomeSoluciones() {
  return (
    <section className="nelvyon-home-section nelvyon-section--white">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <h2 className="mkt-h2 mkt-h2--display fade-in">Soluciones para cada área de tu negocio</h2>
        </header>
        <div className="nelvyon-home-soluciones-grid">
          {SOLUCIONES.map((item) => (
            <article key={item.title} className="mkt-card nelvyon-home-icon-card nelvyon-home-icon-card--premium">
              <div className="nelvyon-home-icon-card__icon" aria-hidden>
                <item.Icon size={26} stroke={1.5} color={NELVYON_BLUE} />
              </div>
              <h3 className="mkt-card__title nelvyon-home-icon-card__title">{item.title}</h3>
              <p className="mkt-card__desc">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
