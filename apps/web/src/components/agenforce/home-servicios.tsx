import Link from "next/link";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBrandGoogle,
  IconPalette,
  IconShoppingCart,
  IconSpeakerphone,
  IconWebhook,
  IconWorld,
} from "@tabler/icons-react";

import { NELVYON_BLUE } from "./marketing-brand";

type ServiceItem = {
  title: string;
  desc: string;
  href: string;
  Icon: TablerIcon;
};

const SERVICES: ServiceItem[] = [
  {
    title: "SEO",
    desc: "Estrategia, auditoría y contenidos con pipelines documentados.",
    href: "/seo",
    Icon: IconBrandGoogle,
  },
  {
    title: "Ads",
    desc: "Campañas en Meta, Google y TikTok con operación conectada al CRM.",
    href: "/ads",
    Icon: IconSpeakerphone,
  },
  {
    title: "Branding",
    desc: "Identidad, creatividades y coherencia de marca en todos los canales.",
    href: "/branding",
    Icon: IconPalette,
  },
  {
    title: "Desarrollo Web",
    desc: "Sitios y landings con arquitectura orientada a conversión y operación.",
    href: "/os/web-premium/preview",
    Icon: IconWorld,
  },
  {
    title: "Ecommerce",
    desc: "Tiendas, catálogo y operación comercial integrada a la plataforma.",
    href: "/os/ecommerce-premium/preview",
    Icon: IconShoppingCart,
  },
  {
    title: "Automatización",
    desc: "Procesos entre CRM, email, canales y reporting con entregables claros.",
    href: "/servicios",
    Icon: IconWebhook,
  },
];

export function HomeServicios() {
  return (
    <section className="nelvyon-home-section nelvyon-section--alt nelvyon-home-servicios" aria-labelledby="home-servicios-title">
      <div className="nelvyon-home-servicios__pattern" aria-hidden />
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Servicios</p>
          <h2 id="home-servicios-title" className="mkt-h2 mkt-h2--display fade-in">
            Ejecución especializada cuando la operación lo requiere
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead fade-in">
            Servicios con entregables definidos. Sin resultados garantizados ni promesas vacías.
          </p>
        </header>
        <div className="nelvyon-home-servicios__grid">
          {SERVICES.map((item) => (
            <Link key={item.title} href={item.href} className="nelvyon-home-servicios__card mkt-card">
              <div className="nelvyon-home-servicios__icon" aria-hidden>
                <item.Icon size={26} stroke={1.5} color={NELVYON_BLUE} />
              </div>
              <h3 className="mkt-card__title">{item.title}</h3>
              <p className="mkt-card__desc">{item.desc}</p>
              <span className="nelvyon-home-servicios__link">Ver servicio →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
