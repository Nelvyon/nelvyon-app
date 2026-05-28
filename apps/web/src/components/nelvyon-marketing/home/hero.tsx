import Link from "next/link";

function DashboardMock() {
  const navItems = ["Inicio", "CRM", "Campañas", "Automatizaciones", "Pagos", "Analíticas"];
  const kpis = [
    { label: "Leads", value: "2,847" },
    { label: "Ingresos", value: "€38,420" },
    { label: "Conversión", value: "34%" },
    { label: "Clientes", value: "142" },
  ];

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-[#07122a] shadow-2xl">
      <div className="flex">
        <aside className="hidden w-36 shrink-0 border-r border-white/10 bg-[#050d1f] p-3 sm:block">
          <div className="mb-4 h-2 w-16 rounded bg-[#0084fc]" />
          <ul className="space-y-2">
            {navItems.map((item, i) => (
              <li
                key={item}
                className={`rounded px-2 py-1.5 text-[10px] ${i === 0 ? "bg-[#0084fc]/30 text-[#00d6fe]" : "text-white/50"}`}
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex-1 p-4">
          <div className="mb-3 flex gap-2">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <div className="h-2 w-2 rounded-full bg-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="text-[9px] text-white/50">{kpi.label}</p>
                <p className="text-xs font-bold text-white">{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-20 items-end gap-1 rounded-lg border border-white/10 bg-white/5 p-2">
            {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-[#0084fc] to-[#00d6fe]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <section
      className="relative overflow-hidden px-4 pb-20 pt-16 lg:px-6 lg:pt-24"
      style={{
        background:
          "linear-gradient(175deg, #07122a 0%, #0b1e44 35%, #0084fc 60%, #0084fc 80%, #00d6fe 95%, #ffffff 100%)",
      }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-block rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            La plataforma todo-en-uno para agencias
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-[68px] lg:leading-[1.05]">
            El sistema operativo de tu negocio
          </h1>
          <p className="mt-4 text-lg italic text-[#a8dff5]">
            Donde nace tu imperio, crece tu marca y se impone tu legado
          </p>
          <p className="mt-4 max-w-xl text-base text-white/70 lg:text-lg">
            Capta leads, cierra ventas y escala tu agencia — todo ejecutado por agentes expertos dentro de
            una sola plataforma.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/registro"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#07122a] transition hover:bg-white/90"
            >
              Empieza gratis 14 días
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Ver demo →
            </Link>
          </div>
        </div>
        <DashboardMock />
      </div>
    </section>
  );
}
