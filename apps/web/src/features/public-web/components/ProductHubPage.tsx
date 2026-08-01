import Image from "next/image";
import Link from "next/link";

import { integrationsCatalog, saasModules } from "../content/catalog";
import { PRODUCT_HUB_SHOTS } from "../content/saasShots";
import { moduleIcon } from "../content/visualLibrary";
import { SoftBeams, SpotlightHero } from "./aceternity/PremiumEffects";
import {
  CaptureSlider,
  DeepPageShell,
  FaqAccordion,
  LogoCloud,
  MidCta,
  StatCounter,
} from "./DeepPage";
import { LibraryPhoto } from "./LibraryPhoto";
import { Reveal } from "./Reveal";
import { LogoMarquee } from "./sections/marketingSections";
import { Container, SectionHeading, SectionShell } from "./ui";

const STACK = saasModules.map((m) => m.name);

export function ProductHubPage() {
  return (
    <DeepPageShell
      ctaTitle="Vea el SaaS NELVYON en su contexto"
      ctaBody="Recorrido por módulos reales: CRM, campañas, workflows, IA, billing y más."
    >
      <SpotlightHero className="border-b border-[var(--nv-border)]">
        <SoftBeams />
        <Container className="nv-zubaz-hero relative pb-16 md:pb-20">
          <Reveal eager>
            <p className="nv-public-eyebrow justify-center">SaaS B2B NELVYON</p>
            <h1 className="nv-public-display mx-auto mt-5 max-w-4xl text-4xl text-[var(--nv-fg-strong)] md:text-5xl lg:text-[3.5rem]">
              Software operativo para marketing, ventas y automatización
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">
              CRM, pipeline, email, WhatsApp, workflows, agentes IA, funnels, LMS, ecommerce, analytics, billing y
              portal — en un entorno multi-tenant con estados honestos.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/contacto" className="nv-public-btn nv-public-btn-primary">
                Solicitar demo
              </Link>
              <Link href="/precios#saas" className="nv-public-btn nv-public-btn-secondary">
                Precios SaaS
              </Link>
            </div>
          </Reveal>
        </Container>
      </SpotlightHero>

      <LogoMarquee items={STACK} />

      <SectionShell soft>
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StatCounter value={`${saasModules.length}`} label="Módulos documentados" detail="Cada uno con URL propia." />
            <StatCounter value="RBAC" label="Gobierno" detail="Roles y aislamiento por tenant." />
            <StatCounter value="SES" label="Email producción" detail="Cuando la infra está lista." />
            <StatCounter value="Kill" label="Gobierno IA" detail="Canary/spend off por defecto." />
          </div>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Capturas"
              title="Recorra el producto real"
              description="Capturas del panel autenticado NELVYON (tenant demo) en mockup MacBook. Pantalla = UI real, nunca kits ajenos."
              align="center"
            />
          </Reveal>
          <div className="mt-10">
            <CaptureSlider shots={PRODUCT_HUB_SHOTS} device="macbook" />
          </div>
          <div className="nv-library-photo relative mt-12 aspect-[21/9] max-h-[280px] w-full overflow-hidden">
            <LibraryPhoto id="F-02" alt="Entorno enterprise contemporáneo — contexto del SaaS NELVYON" />
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="Catálogo"
                title="Todos los módulos SaaS"
                description="Iconografía premium (SaaS / CRM / automation) · capturas reales en cada ficha."
              />
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {saasModules.map((m, i) => (
              <Reveal key={m.id} delayMs={i * 25}>
                <Link href={`/producto/${m.slug}`} className="nv-zubaz-iconbox">
                  <Image
                    src={moduleIcon(m.slug)}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 object-contain"
                  />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--nv-accent-deep)]">
                      {m.status.replace("_", " ")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--nv-fg-strong)]">{m.name}</h3>
                    <p className="mt-2 text-sm text-[var(--nv-muted)]">{m.short}</p>
                    <span className="mt-3 inline-flex text-sm font-semibold text-[var(--nv-accent-deep)]">Explorar →</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Integraciones" title="Stack conectado" />
          </Reveal>
          <div className="mt-10">
            <LogoCloud items={integrationsCatalog.map((i) => ({ name: i.name, category: i.category, initial: i.initial }))} />
          </div>
        </Container>
      </SectionShell>

      <MidCta
        title="Empiece por CRM o Automatizaciones"
        body="Las dos puertas más frecuentes al SaaS NELVYON."
        primaryCta={{ label: "CRM", href: "/producto/crm" }}
        secondaryCta={{ label: "IA", href: "/producto/ia" }}
      />

      <SectionShell soft>
        <Container className="mx-auto max-w-3xl">
          <FaqAccordion
            items={[
              {
                question: "¿El SaaS incluye agencia?",
                answer: "No. La licencia SaaS y los servicios de agencia se cotizan por separado.",
              },
              {
                question: "¿Puedo ver solo un módulo?",
                answer: "Sí. Cada módulo tiene página en /producto/{slug} y se recorre en demo.",
              },
              {
                question: "¿Hay vaporware?",
                answer: "No. Cada módulo indica status y, si aplica, la ruta /saas real.",
              },
            ]}
          />
        </Container>
      </SectionShell>
    </DeepPageShell>
  );
}
