import { INTEGRATIONS_AVAILABLE, INTEGRATIONS_COMING } from "./home-services-config";

export function HomeIntegrationsCompact() {
  return (
    <section className="nelvyon-home-section nelvyon-section--white nelvyon-home-integrations" aria-labelledby="home-integrations-title">
      <div className="nelvyon-section-inner nelvyon-home-integrations__inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Integraciones</p>
          <h2 id="home-integrations-title" className="mkt-h2 mkt-h2--display">
            Conecta tus herramientas
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead">
            Canales, pagos y operación hacia un entorno único.
          </p>
        </header>

        <div className="nelvyon-home-integrations__group">
          <p className="nelvyon-home-integrations__group-label nelvyon-home-integrations__group-label--available">
            Disponible
          </p>
          <ul className="nelvyon-home-integrations__pills">
            {INTEGRATIONS_AVAILABLE.map((name) => (
              <li key={name}>
                <span className="nelvyon-home-integrations__pill nelvyon-home-integrations__pill--available">{name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="nelvyon-home-integrations__group">
          <p className="nelvyon-home-integrations__group-label nelvyon-home-integrations__group-label--coming">
            Próximamente
          </p>
          <ul className="nelvyon-home-integrations__pills">
            {INTEGRATIONS_COMING.map((name) => (
              <li key={name}>
                <span className="nelvyon-home-integrations__pill nelvyon-home-integrations__pill--coming">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
