const NAV = ["Vista general", "Pipeline", "Campañas", "Automatización", "Reporting"] as const;

const MODULES = [
  { label: "Pipeline comercial", status: "Activo", value: "24 op." },
  { label: "Campañas", status: "En curso", value: "3 activas" },
  { label: "Automatización", status: "Configurado", value: "12 flujos" },
  { label: "Reporting", status: "Centralizado", value: "Tiempo real" },
] as const;

const PIPELINE = [
  { stage: "Nuevo", items: 2 },
  { stage: "Seguimiento", items: 3 },
  { stage: "Propuesta", items: 2 },
  { stage: "Cierre", items: 1 },
] as const;

type PaDashboardMockProps = {
  title?: string;
  featured?: boolean;
  badge?: string;
};

export function PaDashboardMock({
  title = "Operación comercial",
  featured = false,
  badge,
}: PaDashboardMockProps) {
  return (
    <div
      className={
        featured
          ? "relative overflow-hidden rounded-3xl border border-[#0084FF]/35 bg-[#020817] p-1 shadow-[0_0_80px_rgba(0,132,255,0.16),0_24px_64px_rgba(0,0,0,0.5)]"
          : "overflow-hidden rounded-2xl border border-white/10 bg-[#020817] shadow-[0_0_80px_rgba(0,132,255,0.12)]"
      }
      aria-hidden
    >
      {featured && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,132,255,0.14),transparent_70%)]"
          aria-hidden
        />
      )}
      <div
        className={`relative overflow-hidden ${featured ? "rounded-[1.35rem]" : ""} border border-white/8 bg-[#020817]`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-[#07111F] px-4 py-3 md:px-5">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#0084FF]/70" />
            <span className="size-2.5 rounded-full bg-[#0047AB]/80" />
            <span className="size-2.5 rounded-full bg-[#66B3FF]/60" />
            <span className="ml-2 text-xs text-white/45">app.nelvyon.com</span>
          </div>
          {badge ? (
            <span className="rounded-full border border-[#0084FF]/35 bg-[#0084FF]/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[#0084FF]">
              {badge}
            </span>
          ) : null}
        </div>
        <div
          className={`flex flex-col md:flex-row ${featured ? "min-h-[400px] md:min-h-[460px]" : "min-h-[280px] md:min-h-[320px]"}`}
        >
          <aside className="hidden w-48 shrink-0 border-r border-white/8 bg-[#07111F]/90 p-4 md:block md:p-5">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold text-white/90">
              <span className="flex size-6 items-center justify-center rounded-md bg-[#0084FF]/20 text-[11px] text-[#0084FF]">
                N
              </span>
              NELVYON
            </div>
            {NAV.map((item, i) => (
              <div
                key={item}
                className={`mb-1.5 rounded-lg px-2.5 py-2 text-xs ${
                  i === 0 ? "bg-[#0084FF]/15 font-medium text-[#0084FF]" : "text-white/50"
                }`}
              >
                {item}
              </div>
            ))}
          </aside>
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className={`font-medium text-white/90 ${featured ? "text-base md:text-lg" : "text-sm"}`}>
                {title}
              </span>
              <span className="rounded-full border border-[#0084FF]/30 bg-[#0084FF]/10 px-2.5 py-0.5 text-[10px] text-[#0084FF]">
                Vista unificada
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {MODULES.map((mod) => (
                <div
                  key={mod.label}
                  className={`rounded-xl border border-white/8 bg-[#07111F] ${featured ? "p-4" : "p-3"}`}
                >
                  <p className="text-[10px] text-white/45">{mod.label}</p>
                  <p className="mt-1 text-xs font-medium text-white/85">{mod.status}</p>
                  {featured ? <p className="mt-2 text-[10px] text-[#0084FF]/80">{mod.value}</p> : null}
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2.5 lg:grid-cols-4">
              {PIPELINE.map((col) => (
                <div key={col.stage} className="rounded-xl border border-white/8 bg-[#07111F]/60 p-2.5">
                  <p className="mb-2 px-1 text-[10px] font-medium text-white/55">{col.stage}</p>
                  <div className="space-y-1.5">
                    {Array.from({ length: col.items }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border border-white/6 bg-gradient-to-r from-[#0084FF]/15 to-transparent ${
                          featured ? "h-10" : "h-8"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
