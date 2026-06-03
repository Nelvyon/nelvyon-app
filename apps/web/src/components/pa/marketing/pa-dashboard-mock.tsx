const NAV = ["Vista general", "Pipeline", "Campañas", "Automatización", "Reporting"] as const;

const MODULES = [
  { label: "Pipeline comercial", status: "Activo" },
  { label: "Campañas", status: "En curso" },
  { label: "Automatización", status: "Configurado" },
  { label: "Reporting", status: "Centralizado" },
] as const;

const PIPELINE = [
  { stage: "Nuevo", items: 2 },
  { stage: "Seguimiento", items: 3 },
  { stage: "Propuesta", items: 2 },
  { stage: "Cierre", items: 1 },
] as const;

export function PaDashboardMock({ title = "Operación comercial" }: { title?: string }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#020817] shadow-[0_0_80px_rgba(0,132,255,0.12)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-white/8 bg-[#07111F] px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
        <span className="size-2.5 rounded-full bg-[#0084FF]/60" />
        <span className="size-2.5 rounded-full bg-[#28c840]/70" />
        <span className="ml-2 text-xs text-white/45">app.nelvyon.com</span>
      </div>
      <div className="flex min-h-[280px] flex-col md:min-h-[320px] md:flex-row">
        <aside className="hidden w-44 shrink-0 border-r border-white/8 bg-[#07111F]/80 p-4 md:block">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-white/90">
            <span className="flex size-5 items-center justify-center rounded bg-[#0084FF]/20 text-[10px] text-[#0084FF]">
              N
            </span>
            NELVYON
          </div>
          {NAV.map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-lg px-2 py-1.5 text-xs ${
                i === 0 ? "bg-[#0084FF]/15 text-[#0084FF]" : "text-white/50"
              }`}
            >
              {item}
            </div>
          ))}
        </aside>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white/90">{title}</span>
            <span className="rounded-full border border-[#0084FF]/30 bg-[#0084FF]/10 px-2.5 py-0.5 text-[10px] text-[#0084FF]">
              Vista unificada
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {MODULES.map((mod) => (
              <div key={mod.label} className="rounded-xl border border-white/8 bg-[#07111F] p-3">
                <p className="text-[10px] text-white/45">{mod.label}</p>
                <p className="mt-1 text-xs font-medium text-white/80">{mod.status}</p>
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
            {PIPELINE.map((col) => (
              <div key={col.stage} className="rounded-xl border border-white/8 bg-[#07111F]/60 p-2">
                <p className="mb-2 px-1 text-[10px] font-medium text-white/55">{col.stage}</p>
                <div className="space-y-1.5">
                  {Array.from({ length: col.items }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 rounded-lg border border-white/6 bg-gradient-to-r from-[#0084FF]/10 to-transparent"
                    />
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
