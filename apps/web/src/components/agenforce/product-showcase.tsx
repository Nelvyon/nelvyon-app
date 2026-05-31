import { MODULE_SCREEN_KEYS, ModuleScreen } from "./module-screens";

export function ProductShowcase() {
  return (
    <section
      className="nelvyon-home-section nelvyon-section--white nelvyon-product-showcase-section"
      aria-labelledby="product-showcase-title"
    >
      <div className="nelvyon-section-inner">
        <header className="nelvyon-home-section__head nelvyon-home-section__head--center">
          <p className="mkt-eyebrow">Plataforma SaaS</p>
          <h2 id="product-showcase-title" className="mkt-h2 mkt-h2--display fade-in">
            Módulos reales del producto
          </h2>
          <p className="mkt-lead nelvyon-home-section__lead fade-in">
            Interfaz representativa del entorno operativo NELVYON. Sin métricas inventadas ni capturas genéricas de stock.
          </p>
        </header>
        <div className="nelvyon-product-grid nelvyon-product-grid--bento">
          {MODULE_SCREEN_KEYS.map((module) => (
            <div key={module} className="nelvyon-product-showcase-item">
              <ModuleScreen module={module} flat />
              <p className="nelvyon-product-showcase-item__label">{module}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
