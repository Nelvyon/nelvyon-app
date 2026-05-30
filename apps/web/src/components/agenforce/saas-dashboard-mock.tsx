import Image from "next/image";

const NAV = [
  { label: "Vista general", active: true },
  { label: "Pipeline", active: false },
  { label: "Campañas", active: false },
  { label: "Reporting", active: false },
];

const DEALS = [
  { company: "Grupo Meridian", stage: "Propuesta", status: "En revisión" },
  { company: "Nova Retail", stage: "Contactado", status: "Activo" },
];

type SaasDashboardMockProps = {
  compact?: boolean;
  className?: string;
};

export function SaasDashboardMock({ compact = false, className = "" }: SaasDashboardMockProps) {
  return (
    <div className={`nelvyon-dashboard-shell ${compact ? "nelvyon-dashboard-shell--compact" : ""} ${className}`.trim()}>
      <div className="nelvyon-dashboard-chrome">
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
        <div className="nelvyon-dashboard-search">
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)" }}>⌘K</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>Buscar en NELVYON…</span>
        </div>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>app.nelvyon.com</span>
      </div>
      <div className="nelvyon-dashboard-mock">
        <aside className="nelvyon-dashboard-sidebar">
          <div className="nelvyon-dashboard-sidebar__brand">
            <Image src="/logo.png" alt="" width={20} height={20} className="object-contain shrink-0" />
            <span>NELVYON</span>
          </div>
          {NAV.map((item) => (
            <div
              key={item.label}
              className={`nelvyon-dashboard-nav-item${item.active ? " nelvyon-dashboard-nav-item--active" : ""}`}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </aside>
        <div className="nelvyon-dashboard-main-body">
          <div className="nelvyon-dashboard-main-title">Operación comercial</div>
          <div className="nelvyon-dashboard-kpis">
            {["Pipeline", "CRM", "Reporting", "Automatización"].slice(0, compact ? 2 : 4).map((label) => (
              <div key={label} className="nelvyon-dashboard-kpi">
                <div className="nelvyon-dashboard-kpi__label">{label}</div>
                <div className="nelvyon-dashboard-kpi__value">Activo</div>
              </div>
            ))}
          </div>
          {!compact ? (
            <div className="nelvyon-dashboard-table">
              <div className="nelvyon-dashboard-table-head">
                <span>Empresa</span>
                <span>Etapa</span>
                <span>Estado</span>
              </div>
              {DEALS.map((row, i) => (
                <div
                  key={row.company}
                  className="nelvyon-dashboard-table-row"
                  style={{ borderBottom: i < DEALS.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", gridTemplateColumns: "1.2fr 0.8fr 0.8fr" }}
                >
                  <span className="nelvyon-dashboard-table-row__company">{row.company}</span>
                  <span>{row.stage}</span>
                  <span className="nelvyon-dashboard-table-row__status">{row.status}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
