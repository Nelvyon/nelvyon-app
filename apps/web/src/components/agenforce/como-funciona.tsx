import {
  IconChartLine,
  IconRocket,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type Step = { num: string; title: string; desc: string; Icon: TablerIcon };

const STEPS: Step[] = [
  { num: "01", title: "Entendemos tu negocio", desc: "Canales, procesos y necesidades reales.", Icon: IconSearch },
  { num: "02", title: "Diseñamos el sistema", desc: "Estructura de CRM, campañas y flujos.", Icon: IconSettings },
  { num: "03", title: "Implementamos", desc: "Plataforma configurada y conectada.", Icon: IconRocket },
  { num: "04", title: "Optimizamos y escalamos", desc: "Operación continua con mejora progresiva.", Icon: IconChartLine },
];

export function ComoFunciona() {
  return (
    <section className="nelvyon-home-section nelvyon-section--alt nelvyon-como-trabajamos">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <h2 className="mkt-h2 mkt-h2--display fade-in">Así es como trabajamos</h2>
        </header>
        <div className="nelvyon-como-funciona-timeline">
          {STEPS.map((step) => (
            <article key={step.num} className="nelvyon-step-card nelvyon-step-card--dark">
              <span className="nelvyon-step-card__num" style={{ color: NELVYON_BLUE }}>
                {step.num}
              </span>
              <h3 className="nelvyon-step-card__title">{step.title}</h3>
              <p className="nelvyon-step-card__desc">{step.desc}</p>
              <step.Icon className="nelvyon-step-card__glyph" size={28} stroke={1.25} color={NELVYON_BLUE} aria-hidden />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
