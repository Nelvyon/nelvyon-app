import Image from "next/image";

const NAV = ["Vista general", "Pipeline", "Campañas", "Automatización", "Reporting"];
const MODULES = [
  { label: "Pipeline comercial", status: "Activo" },
  { label: "Campañas", status: "En curso" },
  { label: "Automatización", status: "Configurado" },
  { label: "Reporting", status: "Centralizado" },
];

const PIPELINE = [
  { stage: "Nuevo", items: 2 },
  { stage: "Seguimiento", items: 3 },
  { stage: "Propuesta", items: 2 },
  { stage: "Cierre", items: 1 },
];

export function NvDashboardMock() {
  return (
    <div className="nv-mock" aria-hidden>
      <div className="nv-mock__bar">
        <span className="nv-mock__dot" style={{ background: "#ff5f57" }} />
        <span className="nv-mock__dot" style={{ background: "#febc2e" }} />
        <span className="nv-mock__dot" style={{ background: "#28c840" }} />
        <span className="nv-mock__url">app.nelvyon.com</span>
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
          <div className="nv-mock__header">
            <div className="nv-mock__title">Operación comercial</div>
            <span className="nv-mock__pill">Vista unificada</span>
          </div>
          <div className="nv-mock__kpis">
            {MODULES.map((mod) => (
              <div key={mod.label} className="nv-mock__kpi">
                <label>{mod.label}</label>
                <span>{mod.status}</span>
              </div>
            ))}
          </div>
          <div className="nv-mock__pipeline">
            {PIPELINE.map((col) => (
              <div key={col.stage} className="nv-mock__col">
                <div className="nv-mock__col-head">{col.stage}</div>
                <div className="nv-mock__col-cards">
                  {Array.from({ length: col.items }).map((_, i) => (
                    <div key={i} className="nv-mock__deal" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
