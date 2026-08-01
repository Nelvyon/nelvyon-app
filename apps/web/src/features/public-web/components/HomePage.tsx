import Image from "next/image";
import Link from "next/link";

import {
  agencyServices,
  integrationsCatalog,
  saasModules,
  sectorsCatalog,
} from "../content/catalog";
import { homeContent, pricingPlans, siteBrand } from "../content/siteContent";
import { HOME_SHOT_SLIDER, saasShotSrc } from "../content/saasShots";
import { libraryPhoto, moduleIcon } from "../content/visualLibrary";
import { SoftBeams, SpotlightHero } from "./aceternity/PremiumEffects";
import {
  CaptureSlider,
  ComparisonTable,
  FaqAccordion,
  LogoCloud,
  MidCta,
  ProcessTimeline,
  StatCounter,
} from "./DeepPage";
import { LibraryPhoto } from "./LibraryPhoto";
import { SaasProductCapture } from "./SaasProductCapture";
import { Reveal } from "./Reveal";
import { LogoMarquee, ShowcaseSplit, TestimonialMarquee } from "./sections/marketingSections";
import { Container, CtaBand, SectionHeading, SectionShell } from "./ui";

const STACK = [
  "CRM",
  "Pipeline",
  "Email",
  "WhatsApp",
  "Workflows",
  "IA",
  "Agentes",
  "Funnels",
  "LMS",
  "Ecommerce",
  "Analytics",
  "Stripe",
] as const;

/** Home Zubaz SaaS (index-03) composition → NELVYON content + Aceternity soft effects. */
export function PublicHomePage() {
  const { cta, faqPreview } = homeContent;
  const featureModules = saasModules.slice(0, 6);

  return (
    <>
      {/* —— Zubaz hero centered + product thumb + floating cards —— */}
      <SpotlightHero className="border-b border-[var(--nv-border)] bg-[var(--nv-bg)]">
        <SoftBeams />
        <Container className="nv-zubaz-hero relative">
          <Reveal eager>
            <p className="nv-public-eyebrow justify-center">Agencia IA + SaaS B2B</p>
            <h1 className="nv-public-display nv-zubaz-hero-title mt-5 text-4xl text-[var(--nv-fg-strong)] sm:text-5xl md:text-6xl lg:text-[4rem]">
              Marketing digital ejecutado por IA. Operación comercial en un solo SaaS.
              <span className="relative ml-2 inline-block align-middle">
                <Image src="/brand/public/zubaz/v3/shape-v3-01.png" alt="" width={48} height={48} className="h-10 w-10 md:h-12 md:w-12" />
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">
              NELVYON une agencia operada por IA y software enterprise: CRM, campañas, workflows, agentes, funnels,
              billing y portal — con control, trazabilidad y precios de SaaS y Agencia claramente separados.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/contacto" className="nv-public-btn nv-public-btn-primary">
                Solicitar demo
              </Link>
              <Link href="/producto" className="nv-public-btn nv-public-btn-secondary">
                Explorar el SaaS
              </Link>
            </div>
            <div className="nv-zubaz-checks">
              <span className="inline-flex items-center gap-2">
                <Image src="/brand/public/zubaz/v3/check.png" alt="" width={18} height={18} />
                Demo con tenant real
              </span>
              <span className="inline-flex items-center gap-2">
                <Image src="/brand/public/zubaz/v3/check.png" alt="" width={18} height={18} />
                Sin mezclar SaaS y Agencia
              </span>
              <span className="inline-flex items-center gap-2">
                <Image src="/brand/public/zubaz/v3/check.png" alt="" width={18} height={18} />
                {siteBrand.name} · sin demos vacías
              </span>
            </div>
          </Reveal>

          <div className="nv-zubaz-thumb-wrap mx-auto max-w-5xl">
            <Reveal eager delayMs={80}>
              <div className="relative">
                <SaasProductCapture
                  device="macbook"
                  shotId="dashboard"
                  mockVariant="dashboard"
                  priority
                  alt="Dashboard SaaS NELVYON en MacBook"
                />
                <div className="pointer-events-none absolute -right-2 bottom-6 hidden w-[22%] max-w-[200px] sm:block md:-right-4 md:bottom-8 lg:w-[20%]">
                  <SaasProductCapture
                    device="iphone"
                    shotId="crm-mobile"
                    mockVariant="crm"
                    alt="CRM NELVYON en móvil"
                    className="!max-w-none"
                  />
                </div>
                <div className="nv-zubaz-float-card nv-zubaz-float-card--1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Módulo</p>
                  <p className="mt-1 font-[family-name:var(--font-nv-display)] text-xl">Pipeline</p>
                  <p className="text-[10px] text-emerald-400">En producto</p>
                </div>
                <div className="nv-zubaz-float-card nv-zubaz-float-card--2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Canal</p>
                  <p className="mt-1 font-[family-name:var(--font-nv-display)] text-xl">Campañas</p>
                  <p className="text-[10px] text-[#4da3ff]">SES cuando listo</p>
                </div>
                <div className="nv-zubaz-float-card nv-zubaz-float-card--3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Ops</p>
                  <p className="mt-1 font-[family-name:var(--font-nv-display)] text-xl">Workflows</p>
                  <p className="text-[10px] text-emerald-400">Idempotencia</p>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </SpotlightHero>

      <LogoMarquee items={STACK} />

      {/* —— Zubaz iconbox grid (Wide range of SaaS solutions) —— */}
      <SectionShell>
        <Container>
          <Reveal>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="SaaS NELVYON"
                title="Amplio catálogo de módulos operativos"
                description="Cada módulo tiene página propia con capturas, beneficios y FAQ. Estado honesto: en producto."
              />
              <Link href="/producto" className="nv-public-btn nv-public-btn-primary shrink-0">
                Ver todos los módulos
              </Link>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureModules.map((m, i) => (
              <Reveal key={m.id} delayMs={i * 40}>
                <Link href={`/producto/${m.slug}`} className="nv-zubaz-iconbox">
                  <Image
                    src={moduleIcon(m.slug)}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 object-contain"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">{m.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--nv-muted)]">{m.short}</p>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nv-accent-deep)]">
                      Leer más
                      <Image src="/brand/public/zubaz/icon/arrow-right2.svg" alt="" width={14} height={14} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Capturas"
              title="Producto real, no pantallas decorativas"
              description="Capturas del panel SaaS NELVYON con tenant demo. En evaluación verá su propio contexto."
              align="center"
            />
          </Reveal>
          <div className="mt-12">
            <CaptureSlider shots={HOME_SHOT_SLIDER} />
          </div>
        </Container>
      </SectionShell>

      {/* —— Zubaz split content —— */}
      <ShowcaseSplit
        eyebrow="Automatizaciones"
        title="Agilidad para adaptar procesos reales"
        body="Workflows con triggers, acciones e idempotencia. Diseño e implantación de agencia se presupuesta aparte del plan SaaS."
        imageSrc={saasShotSrc("workflows")}
        imageAlt="Automatizaciones NELVYON · captura real"
        floatCardSrc="/brand/public/zubaz/v3/card-v3-4.png"
        bullets={[
          { title: "Motor /saas/workflows", body: "APIs reales, no nodos vacíos." },
          { title: "WhatsApp y email", body: "Canales cuando la infra está lista." },
          { title: "Gobierno", body: "Estados, logs y kill-switch de IA." },
        ]}
        cta={{ label: "Ver automatizaciones", href: "/producto/workflows" }}
      />

      <ShowcaseSplit
        eyebrow="IA y agentes"
        title="Proceso simple, con control enterprise"
        body="Panel IA y agentes existen en producto. En producción canary y spend permanecen off hasta autorización explícita."
        imageSrc={saasShotSrc("ai")}
        imageAlt="IA NELVYON · captura real"
        reverse
        floatCardSrc="/brand/public/zubaz/v3/card-v3-5.png"
        bullets={[
          { title: "Agentes", body: "Producción asistida con revisión humana." },
          { title: "Kill-switch", body: "Flags explícitos en /producto/ia." },
          { title: "Enterprise", body: "DPA, RBAC y evidencias." },
        ]}
        cta={{ label: "Ver IA", href: "/producto/ia" }}
      />

      {/* —— Zubaz counters —— */}
      <SectionShell soft className="border-y border-[var(--nv-border)]">
        <Container>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <StatCounter value={`${saasModules.length}`} label="Módulos SaaS" detail="Páginas profundas en /producto." />
            <StatCounter value={`${agencyServices.length}`} label="Servicios agencia" detail="Presupuesto personalizado." />
            <StatCounter value={`${integrationsCatalog.length}`} label="Integraciones" detail="Status documentado." />
            <StatCounter value={`${sectorsCatalog.length}`} label="Sectores" detail="Verticales con stack recomendado." />
          </div>
        </Container>
      </SectionShell>

      <MidCta
        title="¿Quiere ver el CRM y las automatizaciones en vivo?"
        body="Demo guiada del SaaS. Si necesita ejecución creativa, la agencia se cotiza en línea separada."
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Módulo CRM", href: "/producto/crm" }}
      />

      {/* —— Zubaz pricing (SaaS only) —— */}
      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Precios SaaS"
              title="Planes claros para el software"
              description="Starter, Growth y Elite. Los servicios de agencia NO están incluidos — presupuesto aparte en /precios#agencia."
              align="center"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan, i) => (
              <Reveal key={plan.id} delayMs={i * 40}>
                <article className={`nv-zubaz-pricing ${plan.featured ? "nv-zubaz-pricing--featured" : ""}`}>
                  {plan.featured ? (
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--nv-accent-deep)]">Popular</p>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--nv-muted-2)]">Plan</p>
                  )}
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--nv-fg-strong)]">{plan.name}</h3>
                  <p className="mt-4 font-[family-name:var(--font-nv-display)] text-4xl text-[var(--nv-fg)]">
                    {plan.priceLabel}
                    <span className="text-base font-sans font-medium text-[var(--nv-muted)]">{plan.period}</span>
                  </p>
                  <p className="mt-3 text-sm text-[var(--nv-muted)]">{plan.description}</p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-[var(--nv-muted)]">
                        <Image src="/brand/public/zubaz/v3/check.png" alt="" width={16} height={16} className="mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.cta.href} className="nv-public-btn nv-public-btn-primary mt-8 w-full">
                    {plan.cta.label}
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/precios#agencia" className="text-sm font-semibold text-[var(--nv-accent-deep)] hover:underline">
              ¿Necesita Agencia? → Presupuesto personalizado (separado del SaaS)
            </Link>
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Agencia" title="Servicios con páginas completas" action={<Link href="/agencia" className="text-sm font-semibold text-[var(--nv-accent-deep)]">Ver agencia →</Link>} />
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <div className="nv-library-photo relative min-h-[280px] overflow-hidden lg:min-h-full">
              <LibraryPhoto id="F-01" priority={false} className="object-cover" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {agencyServices.slice(0, 6).map((svc, i) => (
                <Reveal key={svc.id} delayMs={i * 30}>
                  <Link href={svc.href} className="nv-zubaz-iconbox !flex-col !p-4">
                    <div className="relative mb-3 aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--nv-border)]">
                      <Image src={svc.image || libraryPhoto("F-01")} alt="" fill className="object-cover" sizes="33vw" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--nv-fg-strong)]">{svc.name}</h3>
                    <p className="mt-1.5 text-xs text-[var(--nv-muted)]">{svc.short}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Comparativa" title="Stack fragmentado vs NELVYON" align="center" />
          </Reveal>
          <div className="mt-10">
            <ComparisonTable
              columns={["Herramientas sueltas", "NELVYON"]}
              rows={[
                { feature: "CRM + email + workflows", values: ["Varios proveedores", "Un tenant"] },
                { feature: "Agencia + software", values: ["Facturas mezcladas", "Líneas separadas"] },
                { feature: "IA en producción", values: ["Sin gobierno", "Kill-switch + evidencia"] },
                { feature: "Integraciones", values: ["Estado opaco", "Status documentado"] },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Integraciones" title="Conectado a su stack" action={<Link href="/integraciones" className="nv-public-btn nv-public-btn-secondary !min-h-10 !text-sm">Ver todas</Link>} />
          </Reveal>
          <div className="mt-10">
            <LogoCloud items={integrationsCatalog.map((i) => ({ name: i.name, category: i.category, initial: i.initial }))} />
          </div>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Sectores" title="Soluciones por industria" action={<Link href="/sectores" className="text-sm font-semibold text-[var(--nv-accent-deep)]">Ver sectores →</Link>} />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {sectorsCatalog.map((s, i) => (
              <Reveal key={s.id} delayMs={i * 20}>
                <Link href={`/sectores/${s.slug}`} className="nv-zubaz-iconbox !p-4">
                  <div>
                    <h3 className="font-semibold text-[var(--nv-fg-strong)]">{s.name}</h3>
                    <p className="mt-2 text-xs text-[var(--nv-muted)]">{s.short}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Adopción" title="De demo a operación" align="center" />
          </Reveal>
          <div className="mt-12">
            <ProcessTimeline
              steps={[
                { title: "Discovery", body: "Objetivos y stack actual." },
                { title: "Demo SaaS", body: "CRM, campañas, workflows." },
                { title: "Alcance", body: "Plan SaaS y/o presupuesto agencia." },
                { title: "Onboarding", body: "Configuración y handoff." },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <TestimonialMarquee
        title="Perfiles operativos (ilustrativos)"
        items={[
          {
            quote: "Necesitábamos CRM y campañas juntos, no otro dashboard vacío.",
            author: "Dirección comercial",
            role: "Perfil B2B · ilustrativo",
            avatar: "/brand/public/product/member1.png",
          },
          {
            quote: "La separación SaaS vs Agencia clarificó procurement.",
            author: "Ops marketing",
            role: "Perfil growth · ilustrativo",
            avatar: "/brand/public/product/member2.png",
          },
          {
            quote: "Kill-switch de IA y DPA eran no negociables.",
            author: "IT / Compliance",
            role: "Perfil enterprise · ilustrativo",
            avatar: "/brand/public/product/member3.png",
          },
        ]}
      />

      <SectionShell>
        <Container className="mx-auto max-w-3xl">
          <Reveal>
            <SectionHeading eyebrow="FAQ" title="Respuestas a su confusión" align="center" />
          </Reveal>
          <div className="mt-10">
            <FaqAccordion items={faqPreview} />
          </div>
        </Container>
      </SectionShell>

      <MidCta
        title="Lleve su operación al siguiente nivel"
        body="SaaS, Agencia o ambos — con alcance concreto y sin plantillas vacías."
        primaryCta={{ label: "Hablar con NELVYON", href: "/contacto" }}
        secondaryCta={{ label: "Enterprise", href: "/enterprise" }}
      />

      <CtaBand title={cta.title} body={cta.body} primaryCta={cta.primaryCta} secondaryCta={cta.secondaryCta} />
    </>
  );
}
