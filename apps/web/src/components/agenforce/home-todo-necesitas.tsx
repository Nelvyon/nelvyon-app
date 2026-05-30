import type { TablerIcon } from "@tabler/icons-react";
import {
  IconChartBar,
  IconLayoutDashboard,
  IconTarget,
  IconTrendingUp,
  IconWebhook,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type TodoItem = { title: string; desc: string; Icon: TablerIcon };

const ITEMS: TodoItem[] = [
  {
    title: "Centraliza tu negocio",
    desc: "Campañas, CRM y reporting en un mismo entorno operativo.",
    Icon: IconLayoutDashboard,
  },
  {
    title: "Automatiza procesos",
    desc: "Email, WhatsApp y flujos conectados al CRM.",
    Icon: IconWebhook,
  },
  {
    title: "Toma mejores decisiones",
    desc: "Paneles operativos sin hojas dispersas.",
    Icon: IconChartBar,
  },
  {
    title: "Gestiona oportunidades",
    desc: "Pipeline y fases comerciales con seguimiento claro.",
    Icon: IconTarget,
  },
  {
    title: "Escala con orden",
    desc: "Operación continua con procesos definidos.",
    Icon: IconTrendingUp,
  },
];

export function HomeTodoNecesitas() {
  return (
    <section className="nelvyon-home-section nelvyon-section--alt">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <h2 className="mkt-h2 mkt-h2--display fade-in">Todo lo que necesitas. En un solo lugar.</h2>
        </header>
        <div className="nelvyon-home-todo-grid">
          {ITEMS.map((item) => (
            <article key={item.title} className="mkt-card nelvyon-home-icon-card">
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
