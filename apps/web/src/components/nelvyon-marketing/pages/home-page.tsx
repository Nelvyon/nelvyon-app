import Link from "next/link";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBuildingStore,
  IconChartBar,
  IconChartLine,
  IconHeadset,
  IconLayoutDashboard,
  IconMail,
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
} from "@tabler/icons-react";

import { NvCtaBand } from "../cta-band";
import { NvDashboardMock } from "../dashboard-mock";
import { NvEcosystem } from "../ecosystem";
import { NvPlatformStrip } from "../platform-strip";

function IconCard({ title, desc, Icon }: { title: string; desc: string; Icon: TablerIcon }) {
  return (
    <article className="nv-card nv-fade">
      <div className="nv-card__icon">
        <Icon size={26} stroke={1.5} aria-hidden />
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </article>
  );
}

const CAPACITIES = [
  { title: "Centraliza tu negocio", desc: "Campañas, CRM y reporting en un mismo entorno operativo.", Icon: IconLayoutDashboard },
  { title: "Automatiza procesos", desc: "Email, WhatsApp y flujos conectados al CRM sin dispersión.", Icon: IconWebhook },
  { title: "Toma mejores decisiones", desc: "Paneles operativos claros, sin hojas ni herramientas sueltas.", Icon: IconChartBar },
  { title: "Gestiona oportunidades", desc: "Pipeline y seguimiento comercial con visibilidad continua.", Icon: IconTarget },
  { title: "Escala con orden", desc: "Operación continua con procesos definidos y equipos alineados.", Icon: IconTrendingUp },
];

const SOLUTIONS = [
  { title: "CRM y ventas", desc: "Pipeline, leads y seguimiento comercial en un solo flujo.", Icon: IconUsers },
  { title: "Marketing y contenidos", desc: "Campañas, comunicación y coordinación de canales.", Icon: IconSpeakerphone },
  { title: "Automatización", desc: "Flujos, email y WhatsApp conectados a tu operación.", Icon: IconMail },
  { title: "E-commerce", desc: "Catálogo, ventas y seguimiento integrados.", Icon: IconShoppingCart },
  { title: "Reporting", desc: "Paneles operativos centralizados para revisión periódica.", Icon: IconChartBar },
  { title: "Soporte operativo", desc: "Continuidad con acompañamiento experto cuando lo necesitas.", Icon: IconHeadset },
];

const STEPS = [
  { num: "01", title: "Entendemos tu negocio", desc: "Canales, procesos y necesidades reales de tu operación.", Icon: IconSearch },
  { num: "02", title: "Diseñamos el sistema", desc: "Estructura de CRM, campañas y flujos adaptada a tu contexto.", Icon: IconSettings },
  { num: "03", title: "Implementamos", desc: "Plataforma configurada, conectada y lista para operar.", Icon: IconRocket },
  { num: "04", title: "Optimizamos y escalamos", desc: "Mejora progresiva de la operación con revisiones periódicas.", Icon: IconChartLine },
];

const CASES = [
  { title: "Agencias de marketing", desc: "Multi-cliente con procesos centralizados y seguimiento unificado.", Icon: IconSpeakerphone },
  { title: "Negocios locales", desc: "Captación y seguimiento comercial con continuidad operativa.", Icon: IconBuildingStore },
  { title: "E-commerce", desc: "Campañas, catálogo y reporting conectados en un entorno.", Icon: IconShoppingCart },
  { title: "Educación y formación", desc: "Comunicación y seguimiento de oportunidades comerciales.", Icon: IconSchool },
  { title: "Consultoras", desc: "Operación comercial unificada para equipos y clientes.", Icon: IconUsersGroup },
  { title: "Profesionales", desc: "CRM y automatización sin dispersión de herramientas.", Icon: IconUser },
];

export function NvHomePage() {
  return (
    <main>
      <section className="nv-hero">
        <div className="nv-container">
          <div className="nv-hero__grid">
            <div className="nv-hero__copy">
              <span className="nv-hero__eyebrow nv-fade">Plataforma operativa · NELVYON</span>
              <h1 className="nv-fade">
                El sistema operativo para escalar tu negocio con{" "}
                <span className="nv-accent">marketing, ventas y automatización</span>
              </h1>
              <p className="nv-hero__lead nv-fade">
                Centraliza campañas, CRM, comunicación y operación digital en un entorno diseñado para equipos que
                necesitan orden, visibilidad y continuidad.
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
            <span className="nv-eyebrow nv-fade">Capacidades</span>
            <h2 className="nv-fade">Todo lo que necesitas. En un solo lugar.</h2>
            <p className="nv-fade">
              Un entorno operativo para coordinar marketing, ventas y automatización sin saltar entre herramientas.
            </p>
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
            <span className="nv-eyebrow nv-fade">Ecosistema</span>
            <h2 className="nv-fade">Ecosistema NELVYON</h2>
            <p className="nv-fade">
              Marketing, ventas, automatización y reporting conectados alrededor de una operación central.
            </p>
          </header>
          <NvEcosystem />
        </div>
      </section>

      <section className="nv-section nv-section--light">
        <div className="nv-container">
          <header className="nv-section-head">
            <span className="nv-eyebrow nv-fade">Soluciones</span>
            <h2 className="nv-fade">Soluciones para cada área de tu negocio</h2>
            <p className="nv-fade">Módulos operativos para cubrir las áreas clave de tu negocio digital.</p>
          </header>
          <div className="nv-grid-3">
            {SOLUTIONS.map((s) => (
              <IconCard key={s.title} {...s} />
            ))}
          </div>
          <p className="nv-section-foot nv-fade">
            <Link href="/servicios" className="nv-link">
              Ver servicios →
            </Link>
          </p>
        </div>
      </section>

      <section className="nv-section nv-section--white nv-section--steps">
        <div className="nv-container">
          <header className="nv-section-head">
            <span className="nv-eyebrow nv-fade">Metodología</span>
            <h2 className="nv-fade">Así es como trabajamos</h2>
            <p className="nv-fade">Un proceso claro, de principio a fin, para implementar y operar con NELVYON.</p>
          </header>
          <div className="nv-grid-4">
            {STEPS.map((s) => (
              <article key={s.num} className="nv-card nv-card--dark nv-fade">
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
            <span className="nv-eyebrow nv-fade">Casos de uso</span>
            <h2 className="nv-fade">Escenarios donde encaja NELVYON</h2>
            <p className="nv-fade">
              Perfiles operativos habituales. No son testimonios, métricas publicadas ni resultados garantizados.
            </p>
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
        secondaryLabel="Ver SaaS"
        secondaryHref="/saas"
      />
    </main>
  );
}
