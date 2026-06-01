const STEPS = [
  { num: "01", title: "Diagnóstico", desc: "Canales, procesos y herramientas actuales." },
  { num: "02", title: "Planificación", desc: "Prioridades y estructura del sistema." },
  { num: "03", title: "Implementación", desc: "Configuración y centralización." },
  { num: "04", title: "Operación", desc: "Revisión y mejora continua." },
];

export function HomeMetodologia() {
  return (
    <section className="nelvyon-home-section nelvyon-section--white nelvyon-home-metodologia" aria-labelledby="metodologia-title">
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Cómo trabajamos</p>
          <h2 id="metodologia-title" className="mkt-h2 mkt-h2--display">
            De diagnóstico a operación continua
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead">
            Proceso documentado. Sin atajos ni promesas vacías.
          </p>
        </header>
        <ol className="nelvyon-home-metodologia__steps">
          {STEPS.map((step, index) => (
            <li key={step.num} className="nelvyon-home-metodologia__step">
              <span className="nelvyon-home-metodologia__num">{step.num}</span>
              <div>
                <h3 className="nelvyon-home-metodologia__title">{step.title}</h3>
                <p className="nelvyon-home-metodologia__desc">{step.desc}</p>
              </div>
              {index < STEPS.length - 1 ? <span className="nelvyon-home-metodologia__connector" aria-hidden /> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
