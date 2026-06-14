import Image from "next/image";
import type { ReactNode } from "react";

const SIDEBAR = [
  "CRM",
  "Campañas",
  "Workflows",
  "Inbox",
  "Facturación",
  "Calendario",
  "Funnels",
  "Reporting",
] as const;

type ModuleScreenShellProps = {
  active: (typeof SIDEBAR)[number];
  route: string;
  children: ReactNode;
  flat?: boolean;
};

export function ModuleScreenShell({ active, route, children, flat = false }: ModuleScreenShellProps) {
  return (
    <div className={`nelvyon-dashboard-shell${flat ? " nelvyon-dashboard-shell--flat" : ""}`}>
      <div className="nelvyon-dashboard-chrome">
        <div className="nelvyon-dashboard-chrome__dot nelvyon-dashboard-chrome__dot--close" />
        <div className="nelvyon-dashboard-chrome__dot nelvyon-dashboard-chrome__dot--min" />
        <div className="nelvyon-dashboard-chrome__dot nelvyon-dashboard-chrome__dot--max" />
        <div className="nelvyon-dashboard-search">
          <span className="nelvyon-dashboard-search__kbd">⌘K</span>
          <span className="nelvyon-dashboard-search__placeholder">Buscar en NELVYON…</span>
        </div>
        <span className="nelvyon-dashboard-chrome__url">app.nelvyon.com{route}</span>
      </div>
      <div className="nelvyon-dashboard-mock nelvyon-dashboard-mock--module">
        <aside className="nelvyon-dashboard-sidebar">
          <div className="nelvyon-dashboard-sidebar__brand">
            <Image src="/logo.png" alt="" width={20} height={20} className="object-contain shrink-0" />
            <span>NELVYON</span>
          </div>
          {SIDEBAR.map((item) => (
            <div
              key={item}
              className={`nelvyon-dashboard-nav-item${item === active ? " nelvyon-dashboard-nav-item--active" : ""}`}
            >
              <span>{item}</span>
            </div>
          ))}
        </aside>
        <div className="nelvyon-dashboard-main-body nelvyon-module-screen">{children}</div>
      </div>
    </div>
  );
}

export const MODULE_SCREEN_META = {
  CRM: { active: "CRM" as const, route: "/dashboard/crm", label: "CRM" },
  Workflows: { active: "Workflows" as const, route: "/dashboard/workflows", label: "Workflows" },
  Campañas: { active: "Campañas" as const, route: "/dashboard/campanas", label: "Campañas" },
  Inbox: { active: "Inbox" as const, route: "/dashboard/inbox", label: "Inbox" },
  Facturación: { active: "Facturación" as const, route: "/dashboard/facturacion", label: "Facturación" },
  Calendario: { active: "Calendario" as const, route: "/dashboard/calendario", label: "Calendario" },
  Funnels: { active: "Funnels" as const, route: "/funnels", label: "Embudos" },
  Reporting: { active: "Reporting" as const, route: "/dashboard/reportes", label: "Reporting" },
} as const;

export type ModuleScreenKey = keyof typeof MODULE_SCREEN_META;

export function ModuleScreen({ module, flat = false }: { module: ModuleScreenKey; flat?: boolean }) {
  const meta = MODULE_SCREEN_META[module];
  return (
    <ModuleScreenShell active={meta.active} route={meta.route} flat={flat}>
      <ModuleScreenBody module={module} />
    </ModuleScreenShell>
  );
}

function ModuleScreenBody({ module }: { module: ModuleScreenKey }) {
  switch (module) {
    case "CRM":
      return <CrmScreen />;
    case "Workflows":
      return <WorkflowsScreen />;
    case "Campañas":
      return <CampanasScreen />;
    case "Inbox":
      return <InboxScreen />;
    case "Facturación":
      return <FacturacionScreen />;
    case "Calendario":
      return <CalendarioScreen />;
    case "Funnels":
      return <FunnelsScreen />;
    case "Reporting":
      return <ReportingScreen />;
    default:
      return null;
  }
}

function CrmScreen() {
  const cols = [
    { name: "Nuevo", items: ["Lead inbound", "Formulario web"] },
    { name: "Contactado", items: ["Demo agendada"] },
    { name: "Propuesta", items: ["Deal activo"] },
  ];
  return (
    <>
      <div className="nelvyon-module-screen__title">Pipeline comercial</div>
      <div className="nelvyon-module-kanban">
        {cols.map((col) => (
          <div key={col.name} className="nelvyon-module-kanban__col">
            <div className="nelvyon-module-kanban__col-head">{col.name}</div>
            {col.items.map((item) => (
              <div key={item} className="nelvyon-module-kanban__card">
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function WorkflowsScreen() {
  const steps = ["Lead creado", "CRM", "Email", "WhatsApp"];
  return (
    <>
      <div className="nelvyon-module-screen__title">Automatización · Nuevo lead</div>
      <div className="nelvyon-module-flow">
        {steps.map((step, i) => (
          <div key={step} className="nelvyon-module-flow__step-wrap">
            <span className={`nelvyon-module-flow__step${i === 0 ? " nelvyon-module-flow__step--active" : ""}`}>{step}</span>
            {i < steps.length - 1 ? <span className="nelvyon-module-flow__arrow">→</span> : null}
          </div>
        ))}
      </div>
      <p className="nelvyon-module-screen__meta">Estado: Activo · Disparador: contacto creado</p>
    </>
  );
}

function CampanasScreen() {
  const rows = [
    { name: "Meta · Captación", status: "Activa" },
    { name: "Google · Remarketing", status: "Pausada" },
    { name: "Email · Nurturing", status: "Activa" },
  ];
  return (
    <>
      <div className="nelvyon-module-screen__title">Campañas multicanal</div>
      <div className="nelvyon-module-list">
        {rows.map((row) => (
          <div key={row.name} className="nelvyon-module-list__row">
            <span>{row.name}</span>
            <span className={row.status === "Activa" ? "nelvyon-module-list__status--on" : "nelvyon-module-list__status--off"}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function InboxScreen() {
  const threads = [
    { channel: "WhatsApp", preview: "Consulta sobre plan Growth" },
    { channel: "Email", preview: "Seguimiento propuesta comercial" },
    { channel: "Live chat", preview: "Solicitud de demo" },
  ];
  return (
    <>
      <div className="nelvyon-module-screen__title">Inbox unificado</div>
      <div className="nelvyon-module-inbox">
        {threads.map((t) => (
          <div key={t.channel} className="nelvyon-module-inbox__thread">
            <div className="nelvyon-module-inbox__channel">{t.channel}</div>
            <div className="nelvyon-module-inbox__preview">{t.preview}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function FacturacionScreen() {
  const rows = [
    { id: "INV-1042", amount: "€1.240", status: "Pagada" },
    { id: "INV-1043", amount: "€890", status: "Pendiente" },
  ];
  return (
    <>
      <div className="nelvyon-module-screen__title">Facturación</div>
      <div className="nelvyon-module-table">
        <div className="nelvyon-module-table__head">
          <span>Factura</span>
          <span>Importe</span>
          <span>Estado</span>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="nelvyon-module-table__row">
            <span>{row.id}</span>
            <span>{row.amount}</span>
            <span className={row.status === "Pagada" ? "nelvyon-module-table__paid" : "nelvyon-module-table__pending"}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function CalendarioScreen() {
  const slots = ["09:00 · Demo SaaS", "11:30 · Revisión campaña", "16:00 · Onboarding"];
  return (
    <>
      <div className="nelvyon-module-screen__title">Calendario · Hoy</div>
      <div className="nelvyon-module-calendar">
        {slots.map((slot) => (
          <div key={slot} className="nelvyon-module-calendar__slot">
            {slot}
          </div>
        ))}
      </div>
    </>
  );
}

function FunnelsScreen() {
  const steps = [
    { name: "Landing", pct: 100 },
    { name: "Formulario", pct: 62 },
    { name: "CRM", pct: 41 },
    { name: "Propuesta", pct: 18 },
  ];
  return (
    <>
      <div className="nelvyon-module-screen__title">Embudo · Captación</div>
      <div className="nelvyon-module-funnel">
        {steps.map((step) => (
          <div key={step.name} className="nelvyon-module-funnel__step">
            <div className="nelvyon-module-funnel__labels">
              <span>{step.name}</span>
              <span>{step.pct}%</span>
            </div>
            <div className="nelvyon-module-funnel__track">
              <div className="nelvyon-module-funnel__fill" style={{ width: `${step.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ReportingScreen() {
  return (
    <>
      <div className="nelvyon-module-screen__title">Reporting operativo</div>
      <div className="nelvyon-module-report">
        <div className="nelvyon-module-report__head">
          <span>Actividad por canal</span>
          <span className="nelvyon-module-report__sync">Sincronizado</span>
        </div>
        <div className="nelvyon-module-report__bars">
          {[35, 52, 41, 58, 45, 62].map((h, i) => (
            <div key={i} className={`nelvyon-module-report__bar${i === 5 ? " nelvyon-module-report__bar--peak" : ""}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </>
  );
}

export const MODULE_SCREEN_KEYS = Object.keys(MODULE_SCREEN_META) as ModuleScreenKey[];
