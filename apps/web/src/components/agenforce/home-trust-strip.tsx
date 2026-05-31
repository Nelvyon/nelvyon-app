import type { TablerIcon } from "@tabler/icons-react";
import { IconApi, IconBuilding, IconCreditCard, IconLock, IconPlugConnected } from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type TrustItem = { title: string; desc: string; Icon: TablerIcon };

const TRUST_ITEMS: TrustItem[] = [
  {
    title: "Multi-tenant",
    desc: "Workspaces aislados con roles y permisos por equipo.",
    Icon: IconBuilding,
  },
  {
    title: "Stripe",
    desc: "Suscripciones y facturación gestionadas con Stripe.",
    Icon: IconCreditCard,
  },
  {
    title: "GDPR",
    desc: "Exportación y borrado de datos de usuario.",
    Icon: IconLock,
  },
  {
    title: "OAuth",
    desc: "Conexión segura con Google, Meta, LinkedIn y más.",
    Icon: IconPlugConnected,
  },
  {
    title: "API pública",
    desc: "Integraciones y automatización vía API con claves propias.",
    Icon: IconApi,
  },
];

export function HomeTrustStrip() {
  return (
    <section className="nelvyon-trust-strip" aria-labelledby="trust-strip-title">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-trust-strip__head">
          <p className="mkt-eyebrow nelvyon-trust-strip__eyebrow">Confianza</p>
          <h2 id="trust-strip-title" className="mkt-h2 mkt-h2--display mkt-h2--light fade-in">
            Infraestructura real, sin certificaciones inventadas
          </h2>
        </header>
        <ul className="nelvyon-trust-strip__grid">
          {TRUST_ITEMS.map((item) => (
            <li key={item.title} className="nelvyon-trust-strip__item">
              <div className="nelvyon-trust-strip__icon" aria-hidden>
                <item.Icon size={22} stroke={1.5} color={NELVYON_BLUE} />
              </div>
              <div>
                <p className="nelvyon-trust-strip__title">{item.title}</p>
                <p className="nelvyon-trust-strip__desc">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
