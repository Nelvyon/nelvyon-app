import Image from "next/image";

const NAV = ["Vista general", "Pipeline", "Campañas", "Reporting"];
const KPIS = ["Pipeline", "CRM", "Reporting", "Automatización"];
const BARS = [42, 68, 48, 82, 56, 90, 64, 88];

export function NvDashboardMock() {
  return (
    <div className="nv-mock" aria-hidden>
      <div className="nv-mock__bar">
        <span className="nv-mock__dot" style={{ background: "#ff5f57" }} />
        <span className="nv-mock__dot" style={{ background: "#febc2e" }} />
        <span className="nv-mock__dot" style={{ background: "#28c840" }} />
        <span style={{ flex: 1, marginLeft: 8, fontSize: 10, color: "rgba(255,255,255,0.28)" }}>app.nelvyon.com</span>
      </div>
      <div className="nv-mock__body">
        <aside className="nv-mock__sidebar">
          <div className="nv-mock__brand">
            <Image src="/logo.png" alt="" width={20} height={20} className="object-contain" />
            <span>NELVYON</span>
          </div>
          {NAV.map((item, i) => (
            <div key={item} className={`nv-mock__nav-item${i === 0 ? " nv-mock__nav-item--on" : ""}`}>
              {item}
            </div>
          ))}
        </aside>
        <div className="nv-mock__main">
          <div className="nv-mock__title">Operación comercial</div>
          <div className="nv-mock__kpis">
            {KPIS.map((label) => (
              <div key={label} className="nv-mock__kpi">
                <label>{label}</label>
                <span>Activo</span>
              </div>
            ))}
          </div>
          <div className="nv-mock__chart">
            {BARS.map((h, i) => (
              <div key={i} className="nv-mock__bar-col" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
