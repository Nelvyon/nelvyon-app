import Link from "next/link";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBuildingStore,
  IconChartBar,
  IconChartLine,
  IconLayoutDashboard,
  IconRocket,
  IconSchool,
  IconSearch,
  IconSettings,
  IconShoppingCart,
  IconSpeakerphone,
  IconTarget,
  IconTrendingUp,
  IconUser,
  IconUsers,
  IconUsersGroup,
  IconWebhook,
  IconHeadset,
  IconMail,
} from "@tabler/icons-react";

import { NvCtaBand } from "../cta-band";
import { NvDashboardMock } from "../dashboard-mock";
import { NvEcosystem } from "../ecosystem";
import { NvPlatformStrip } from "../platform-strip";

function IconCard({ title, desc, Icon }: { title: string; desc: string; Icon: TablerIcon }) {
  return (
    <article className="nv-card">
      <div className="nv-card__icon">
        <Icon size={26} stroke={1.5} aria-hidden />
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </article>
  );
}

const CAPACITIES = [
  { title: "Centraliza tu negocio", desc: "Campañas, CRM y reporting en un mismo entorno.", Icon: IconLayoutDashboard },
  { title: "Automatiza procesos", desc: "Email, WhatsApp y flujos conectados al CRM.", Icon: IconWebhook },
  { title: "Toma mejores decisiones", desc: "Paneles operativos sin hojas dispersas.", Icon: IconChartBar },
  { title: "Gestiona oportunidades", desc: "Pipeline y seguimiento comercial claro.", Icon: IconTarget },
  { title: "Escala con orden", desc: "Operación continua con procesos definidos.", Icon: IconTrendingUp },
];

const SOLUTIONS = [
  { title: "CRM y ventas", desc: "Pipeline, leads y seguimiento comercial.", Icon: IconUsers },
  { title: "Marketing y contenidos", desc: "Campañas y comunicación coordinada.", Icon: IconSpeakerphone },
  { title: "Automatización", desc: "Flujos, email y WhatsApp conectados.", Icon: IconMail },
  { title: "E-commerce", desc: "Catálogo y ventas integrados.", Icon: IconShoppingCart },
  { title: "Reporting", desc: "Paneles operativos centralizados.", Icon: IconChartBar },
  { title: "Soporte operativo", desc: "Continuidad con agentes expertos.", Icon: IconHeadset },
];

const STEPS = [
  { num: "01", title: "Entendemos tu negocio", desc: "Canales, procesos y necesidades reales.", Icon: IconSearch },
  { num: "02", title: "Diseñamos el sistema", desc: "Estructura de CRM, campañas y flujos.", Icon: IconSettings },
  { num: "03", title: "Implementamos", desc: "Plataforma configurada y conectada.", Icon: IconRocket },
  { num: "04", title: "Optimizamos y escalamos", desc: "Mejora progresiva de la operación.", Icon: IconChartLine },
];

const CASES = [
  { title: "Agencias de marketing", desc: "Multi-cliente con procesos centralizados.", Icon: IconSpeakerphone },
  { title: "Negocios locales", desc: "Captación y seguimiento con continuidad.", Icon: IconBuildingStore },
  { title: "E-commerce", desc: "Campañas, catálogo y reporting conectados.", Icon: IconShoppingCart },
  { title: "Educación y formación", desc: "Comunicación y seguimiento de oportunidades.", Icon: IconSchool },
  { title: "Consultoras", desc: "Operación comercial unificada.", Icon: IconUsersGroup },
  { title: "Profesionales", desc: "CRM y automatización sin dispersión.", Icon: IconUser },
];

export function NvHomePage() {
  return (
    <main>
      <section className="nv-hero">
        <div className="nv-container">
          <div className="nv-hero__grid">
            <div className="nv-hero__copy">
              <h1 className="nv-fade">
                El sistema operativo para escalar tu negocio con{" "}
                <span className="nv-accent">automatización inteligente</span>
              </h1>
              <p className="nv-hero__lead nv-fade">
                Centraliza marketing, ventas, automatización y operación digital con NELVYON.
              </p>
              <div className="nv-hero__actions nv-fade">
                <Link href="/contacto" className="nv-btn nv-btn--primary">
                  Solicitar demo
                </Link>
                <Link href="/saas" className="nv-btn nv-btn--ghost">
                  Ver SaaS
                </Link>
              </div>
            </div>
            <div className="nv-hero__visual">
              <div className="nv-hero__glow" aria-hidden />
              <NvDashboardMock />
            </div>
          </div>
        </div>
      </section>

      <NvPlatformStrip />

      <section className="nv-section nv-section--light">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2 className="nv-fade">Todo lo que necesitas. En un solo lugar.</h2>
          </header>
          <div className="nv-grid-5">
            {CAPACITIES.map((c) => (
              <IconCard key={c.title} {...c} />
            ))}
          </div>
        </div>
      </section>

      <section className="nv-section nv-section--white">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2 className="nv-fade">Ecosistema NELVYON</h2>
            <p className="nv-fade">Un ecosistema conectado para operar marketing, ventas y automatización con continuidad.</p>
          </header>
          <NvEcosystem />
        </div>
      </section>

      <section className="nv-section nv-section--light">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2 className="nv-fade">Soluciones para cada área de tu negocio</h2>
          </header>
          <div className="nv-grid-3">
            {SOLUTIONS.map((s) => (
              <IconCard key={s.title} {...s} />
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 32 }}>
            <Link href="/servicios" className="nv-link">
              Ver servicios →
            </Link>
          </p>
        </div>
      </section>

      <section className="nv-section nv-section--white">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2 className="nv-fade">Así es como trabajamos</h2>
          </header>
          <div className="nv-grid-4">
            {STEPS.map((s) => (
              <article key={s.num} className="nv-card nv-card--dark">
                <span className="nv-card__num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <s.Icon className="nv-card__glyph" size={28} stroke={1.25} aria-hidden />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-section nv-section--light">
        <div className="nv-container">
          <header className="nv-section-head">
            <h2 className="nv-fade">Casos de uso</h2>
            <p className="nv-fade">Escenarios operativos habituales. No son testimonios ni resultados publicados.</p>
          </header>
          <div className="nv-grid-3">
            {CASES.map((c) => (
              <IconCard key={c.title} {...c} />
            ))}
          </div>
        </div>
      </section>

      <NvCtaBand
        title="Empieza hoy. Construye una operación más seria."
        subtitle="Solicita una demo y revisa cómo NELVYON encaja en tu operación de marketing y ventas."
      />
    </main>
  );
}
