function MiniMock({ variant }: { variant: string }) {
  return (
    <div className="mb-4 h-28 overflow-hidden rounded-xl border border-[#e8eef8] bg-[#f8faff] p-2">
      <div className="flex h-full flex-col gap-1">
        <div className="h-2 w-1/2 rounded bg-[#0084fc]/30" />
        <div className="flex-1 rounded bg-white p-1">
          {variant === "chart" && (
            <div className="flex h-full items-end gap-0.5">
              {[30, 50, 40, 70, 55].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#0084fc]" style={{ height: `${h}%` }} />
              ))}
            </div>
          )}
          {variant === "list" && (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-2 rounded bg-[#e8eef8]" />
              ))}
            </div>
          )}
          {variant === "grid" && (
            <div className="grid grid-cols-3 gap-1 h-full">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded bg-[#e8eef8]" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "CRM & Pipeline",
    desc: "Gestiona todos tus contactos y oportunidades en un solo lugar",
    variant: "list",
  },
  {
    title: "Email Marketing",
    desc: "Campañas automatizadas que convierten mientras duermes",
    variant: "chart",
  },
  {
    title: "Automatizaciones",
    desc: "Flujos que trabajan solos sin intervención humana",
    variant: "grid",
  },
  {
    title: "Pagos & Facturación",
    desc: "Cobra a tus clientes directamente desde la plataforma",
    variant: "list",
  },
  {
    title: "Funnels & Webs",
    desc: "Crea páginas de captación y sitios web en minutos",
    variant: "grid",
  },
  {
    title: "Analíticas",
    desc: "Métricas en tiempo real de todo tu negocio",
    variant: "chart",
  },
] as const;

export function HomeFeaturesBento() {
  return (
    <section className="bg-white px-4 py-20 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-[#07122a] md:text-4xl">Todo lo que necesita tu agencia</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[#07122a]/70">
          Una plataforma. Agentes expertos para cada proceso.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-[#e8eef8] bg-white p-5 shadow-sm transition hover:shadow-lg"
            >
              <MiniMock variant={f.variant} />
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0084fc]/10 text-[#0084fc]">
                  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-[#07122a]">{f.title}</h3>
                  <p className="mt-1 text-sm text-[#07122a]/65">{f.desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
