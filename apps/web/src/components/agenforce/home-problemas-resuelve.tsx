const PROBLEMAS = [
  {
    title: "Herramientas dispersas",
    desc: "Campañas, CRM, web y reporting en silos distintos dificultan la operación diaria.",
  },
  {
    title: "Ejecución sin continuidad",
    desc: "Proyectos puntuales sin un sistema que mantenga la operación comercial en marcha.",
  },
  {
    title: "Reporting fragmentado",
    desc: "Datos repartidos entre plataformas impiden decisiones con contexto completo.",
  },
  {
    title: "Operación comercial desordenada",
    desc: "Leads, seguimiento y entregables sin un entorno centralizado ni procesos claros.",
  },
] as const;

export function HomeProblemasResuelve() {
  return (
    <section
      className="nelvyon-home-section nelvyon-section--dark nelvyon-problemas"
      aria-labelledby="problemas-title"
    >
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Qué problemas resuelve</p>
          <h2 id="problemas-title" className="mkt-h2 mkt-h2--display">
            Orden operativo para equipos que ya no pueden improvisar
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead">
            NELVYON conecta ejecución profesional y plataforma propia para reducir fricción entre
            marketing, ventas y operación digital.
          </p>
        </header>
        <div className="nelvyon-problemas__grid">
          {PROBLEMAS.map((item) => (
            <article key={item.title} className="nelvyon-problemas__card">
              <h3 className="nelvyon-problemas__title">{item.title}</h3>
              <p className="nelvyon-problemas__desc">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
