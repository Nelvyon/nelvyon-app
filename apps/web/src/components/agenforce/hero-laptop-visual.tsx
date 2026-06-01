/**
 * Composición tecnológica del Hero — sin dashboards inventados ni métricas falsas.
 * UI abstracta que sugiere operación centralizada.
 */
export function HeroLaptopVisual() {
  return (
    <div className="nelvyon-hero-visual" aria-hidden>
      <div className="nelvyon-hero-visual__glow" />
      <div className="nelvyon-hero-visual__ring" />
      <div className="nelvyon-hero-visual__pedestal" />
      <div className="nelvyon-hero-visual__laptop">
        <div className="nelvyon-hero-visual__bezel">
          <div className="nelvyon-hero-visual__screen">
            <div className="nelvyon-hero-visual__ui">
              <div className="nelvyon-hero-visual__ui-top">
                <span className="nelvyon-hero-visual__ui-dot" />
                <span className="nelvyon-hero-visual__ui-dot" />
                <span className="nelvyon-hero-visual__ui-dot" />
                <span className="nelvyon-hero-visual__ui-title">NELVYON</span>
              </div>
              <div className="nelvyon-hero-visual__ui-row">
                <div className="nelvyon-hero-visual__ui-nav">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="nelvyon-hero-visual__ui-main">
                  <div className="nelvyon-hero-visual__ui-block nelvyon-hero-visual__ui-block--wide" />
                  <div className="nelvyon-hero-visual__ui-cols">
                    <div className="nelvyon-hero-visual__ui-block" />
                    <div className="nelvyon-hero-visual__ui-block" />
                  </div>
                  <div className="nelvyon-hero-visual__ui-strip" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="nelvyon-hero-visual__base" />
      </div>
    </div>
  );
}
