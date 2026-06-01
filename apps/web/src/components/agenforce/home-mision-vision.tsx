import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

export function HomeMisionVision() {
  const { misionLabel, mision, visionLabel, vision } = HOME_COPY.misionVision;

  return (
    <section className="nelvyon-home-block nelvyon-home-mv" aria-labelledby="home-mv-mision">
      <Container>
        <div className="nelvyon-home-mv__grid">
          <article className="nelvyon-home-mv__item">
            <p className="nelvyon-home-mv__label">{misionLabel}</p>
            <p id="home-mv-mision" className="nelvyon-home-mv__text">
              {mision}
            </p>
          </article>
          <div className="nelvyon-home-mv__divider" aria-hidden />
          <article className="nelvyon-home-mv__item">
            <p className="nelvyon-home-mv__label">{visionLabel}</p>
            <p className="nelvyon-home-mv__text">{vision}</p>
          </article>
        </div>
      </Container>
    </section>
  );
}
