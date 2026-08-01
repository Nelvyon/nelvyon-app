import Link from "next/link";

import { integrationsCatalog, saasModules } from "../content/catalog";
import { enterpriseIcons, libraryPhoto } from "../content/visualLibrary";
import {
  DeepHero,
  DeepPageShell,
  FaqAccordion,
  FeatureGrid,
  MediaBlock,
  MidCta,
  ProcessTimeline,
  RelatedLinks,
  StatCounter,
} from "./DeepPage";
import { LibraryPhoto } from "./LibraryPhoto";
import { Reveal } from "./Reveal";
import { Container, SectionHeading, SectionShell } from "./ui";

const ENTERPRISE_FAQS = [
  {
    question: "¿Hay DPA y documentación de subprocesadores?",
    answer:
      "Sí. DPA, subprocessors y políticas de seguridad están publicados en /legal/dpa y /seguridad. No ocultamos dependencias críticas.",
  },
  {
    question: "¿Cómo se gestiona el acceso multi-equipo?",
    answer:
      "RBAC por tenant con roles y permisos. Los contextos SaaS y OS/portal están separados; la autenticación usa cookies httpOnly y claims específicos.",
  },
  {
    question: "¿La IA está activa por defecto en producción?",
    answer:
      "No. Canary kill y spend off permanecen en kill hasta autorización explícita. Gobierno humano en decisiones críticas.",
  },
  {
    question: "¿Qué integraciones están disponibles?",
    answer:
      "Stripe, AWS SES, Google, Meta, WhatsApp/Twilio, Microsoft/Outlook, Slack y webhooks. Cada conector documenta su estado real de activación.",
  },
  {
    question: "¿Ofrecen despliegue dedicado o on-premise?",
    answer:
      "Evaluamos según compliance y volumen. El stack está orientado a Railway + Postgres 16; alternativas se estudian en discovery enterprise.",
  },
] as const;

export function EnterprisePage() {
  return (
    <DeepPageShell
      ctaTitle="Evaluación enterprise con alcance concreto"
      ctaBody="Seguridad, integraciones, SLA y despliegue — sin promesas genéricas."
    >
      <DeepHero
        eyebrow="Enterprise NELVYON"
        title="Seguridad, escala y gobierno para operaciones exigentes"
        description="NELVYON Enterprise combina SaaS multi-tenant, automatización con kill-switch, integraciones gobernadas y documentación de cumplimiento. Composición visual enterprise — contenido profundo, no plantilla genérica."
        primaryCta={{ label: "Hablar con enterprise", href: "/contacto?tipo=enterprise" }}
        secondaryCta={{ label: "Centro de seguridad", href: "/seguridad" }}
        mock
        mockVariant="dashboard"
        device="monitor"
      />

      <SectionShell>
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StatCounter value="RBAC" label="Control de acceso" detail="Roles, permisos y aislamiento por tenant." />
            <StatCounter value="DPA" label="Cumplimiento" detail="Documentación pública de privacidad y subprocesadores." />
            <StatCounter value="Prod" label="Despliegue" detail="Orientado a Railway + Postgres 16." />
            <StatCounter value="Kill" label="Gobierno IA" detail="Canary y spend off hasta autorización explícita." />
          </div>
        </Container>
      </SectionShell>

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Seguridad"
              title="Fail-closed donde importa"
              description="Autenticación JWT en cookies httpOnly, separación de contextos SaaS/OS, protección de crons y webhooks con secretos de entorno."
            />
          </Reveal>
          <div className="mt-10">
            <FeatureGrid
              items={[
                {
                  title: "Auth y sesiones",
                  body: "Cookies httpOnly para SaaS; claims de plataforma para OS y portal. Sin tokens expuestos en localStorage.",
                  icon: enterpriseIcons.security,
                },
                {
                  title: "Aislamiento tenant",
                  body: "Datos segregados por organización con scoping en APIs y servicios backend.",
                  icon: enterpriseIcons.database,
                },
                {
                  title: "Secretos y tracking",
                  body: "JWT_SECRET, TRACKING_SECRET y CRON_SECRET obligatorios en producción. Tracking HMAC en campañas.",
                  icon: enterpriseIcons.compliance,
                },
                {
                  title: "Documentación pública",
                  body: "DPA, subprocessors y políticas en /legal y /seguridad — auditables por su equipo legal.",
                  icon: enterpriseIcons.cloud,
                },
                {
                  title: "Observabilidad",
                  body: "Logs, evidencias de ejecución y trazabilidad en workflows y packs OS.",
                  icon: enterpriseIcons.analytics,
                },
                {
                  title: "Kill-switch IA",
                  body: "Canary y spend permanecen en kill/off hasta autorización. Sin sorpresas en facturación de IA.",
                  icon: enterpriseIcons.sync,
                },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container>
          <div className="nv-library-photo relative aspect-[21/8] w-full overflow-hidden">
            <LibraryPhoto id="F-02" alt="Centro de negocio contemporáneo — contexto enterprise NELVYON" />
          </div>
        </Container>
      </SectionShell>

      <MediaBlock
        title="Escalabilidad sin reescribir la operación"
        body="Postgres 16, migraciones versionadas y servicios TS puros escalan con su crecimiento. El SaaS soporta multi-equipo, multi-unidad y volúmenes de campaña reales cuando SES está configurado."
        bullets={[
          "Multi-tenant nativo desde el diseño",
          "Motor de workflows con idempotencia",
          "Billing Stripe sincronizado por webhooks",
          "Portal cliente para aprobación de entregables",
        ]}
        image={libraryPhoto("F-02")}
        imageAlt="Infraestructura operativa enterprise"
      />

      <SectionShell>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="IA y automatización"
              title="Automatización con gobierno enterprise"
              description="Agentes, workflows y packs OS con QA, umbral de calidad y revisión humana antes de entregar al cliente."
            />
          </Reveal>
          <div className="mt-10">
            <FeatureGrid
              items={[
                {
                  title: "Workflows de producción",
                  body: "Triggers, acciones e idempotencia para entornos con carga real — no demos decorativas.",
                },
                {
                  title: "Packs OS",
                  body: "Orquestación de marketing con auto-aprobación condicionada (QA ≥ 85) y portal de revisión.",
                },
                {
                  title: "Private AI path",
                  body: "Rutas locales/compatibles según entorno y política de datos del cliente.",
                },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <MediaBlock
        title="Integraciones gobernadas"
        body={`Conectamos con ${integrationsCatalog.slice(0, 6).map((i) => i.name).join(", ")} y más. Cada integración documenta su modo de conectividad y estado de activación — sin fingir conexiones que no existen.`}
        bullets={integrationsCatalog.slice(0, 6).map((i) => `${i.name} (${i.connectivity}): ${i.statusNote}`)}
        reverse
        mock
        mockVariant="dashboard"
      />

      <SectionShell soft>
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Implementación" title="Cómo se despliega un proyecto enterprise" />
          </Reveal>
          <div className="mt-10">
            <ProcessTimeline
              steps={[
                { title: "Discovery", body: "Compliance, integraciones, volúmenes y roles." },
                { title: "Arquitectura", body: "Tenant, RBAC, conectores y exclusiones." },
                { title: "Piloto", body: "Unidad de negocio con métricas de cierre." },
                { title: "Rollout", body: "Formación, soporte y revisión periódica." },
              ]}
            />
          </div>
        </Container>
      </SectionShell>

      <MidCta
        title="Evaluación enterprise con alcance concreto"
        body="Seguridad, SLA, integraciones y despliegue — sin promesas genéricas."
        primaryCta={{ label: "Hablar con enterprise", href: "/contacto?tipo=enterprise" }}
        secondaryCta={{ label: "Centro de seguridad", href: "/seguridad" }}
      />

      <SectionShell>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="Soporte y despliegues"
              title="Acompañamiento enterprise"
              description="Onboarding estructurado, SLA según contrato y canal de soporte dedicado para incidencias críticas."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Discovery de alcance, compliance e integraciones",
                "Migración controlada de contactos y configuración",
                "Formación por rol (comercial, marketing, ops)",
                "Revisión periódica de workflows y entregabilidad",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-[var(--nv-muted)] md:text-base">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delayMs={50}>
            <SectionHeading
              eyebrow="Infraestructura"
              title="Stack de producción"
              description="Node 20, Postgres 16, Railway. Migraciones SQL versionadas aplicadas en deploy."
            />
            <div className="mt-8 nv-public-panel p-6">
              <dl className="space-y-4 text-sm">
                {[
                  ["Runtime", "Node 20 + Next.js 15 App Router"],
                  ["Base de datos", "Postgres 16 con migraciones versionadas"],
                  ["Email", "AWS SES (eu-west-1)"],
                  ["Pagos", "Stripe con webhooks"],
                  ["Deploy", "Railway con releaseCommand para migraciones"],
                ].map(([term, def]) => (
                  <div key={term} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <dt className="w-32 shrink-0 font-semibold text-[var(--nv-fg)]">{term}</dt>
                    <dd className="text-[var(--nv-muted)]">{def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </Container>
      </SectionShell>

      <SectionShell>
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow="Cumplimiento" title="Transparencia documentada" />
            <p className="mt-5 text-base leading-relaxed text-[var(--nv-muted)]">
              Publicamos DPA, lista de subprocesadores y prácticas de seguridad. No vendemos certificaciones que no tenemos;
              describimos controles reales y rutas de mejora.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/seguridad" className="nv-public-btn nv-public-btn-primary">
                Ver seguridad
              </Link>
              <Link href="/legal/dpa" className="nv-public-btn nv-public-btn-secondary">
                DPA
              </Link>
            </div>
          </Reveal>
          <Reveal delayMs={40}>
            <SectionHeading eyebrow="FAQ Enterprise" title="Preguntas frecuentes" />
            <div className="mt-8">
              <FaqAccordion items={ENTERPRISE_FAQS} />
            </div>
          </Reveal>
        </Container>
      </SectionShell>

      <RelatedLinks
        title="Módulos SaaS relevantes para enterprise"
        items={saasModules
          .filter((m) => ["crm", "workflows", "ia", "billing", "portal"].includes(m.id))
          .map((m) => ({ label: m.name, href: `/producto/${m.slug}`, body: m.short }))}
      />
    </DeepPageShell>
  );
}
