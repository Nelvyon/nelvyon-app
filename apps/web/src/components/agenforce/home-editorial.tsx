import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

export function HomeQueHace() {
  const { eyebrow, title, body, body2 } = HOME_COPY.queHace;

  return (
    <section
      className="nelvyon-home-block nelvyon-home-block--compact nelvyon-home-story"
      aria-labelledby="home-que-hace-title"
    >
      <Container>
        <article className="nelvyon-home-story__article nelvyon-home-story__article--wide">
          <p className="nelvyon-home-story__eyebrow">{eyebrow}</p>
          <h2 id="home-que-hace-title" className="nelvyon-home-story__title">
            {title}
          </h2>
          <p className="nelvyon-home-story__body nelvyon-home-story__body--lead">{body}</p>
          <p className="nelvyon-home-story__body">{body2}</p>
        </article>
      </Container>
    </section>
  );
}

export function HomeParaQuien() {
  const { eyebrow, title, intro, audiences } = HOME_COPY.paraQuien;

  return (
    <section
      className="nelvyon-home-block nelvyon-home-block--alt nelvyon-home-story"
      aria-labelledby="home-para-quien-title"
    >
      <Container>
        <article className="nelvyon-home-story__article">
          <p className="nelvyon-home-story__eyebrow">{eyebrow}</p>
          <h2 id="home-para-quien-title" className="nelvyon-home-story__title">
            {title}
          </h2>
          <p className="nelvyon-home-story__body nelvyon-home-story__body--lead">{intro}</p>
          <ul className="nelvyon-home-story__audiences">
            {audiences.map((item) => (
              <li key={item.label} className="nelvyon-home-story__audience">
                <strong className="nelvyon-home-story__audience-label">{item.label}</strong>
                <p className="nelvyon-home-story__audience-text">{item.text}</p>
              </li>
            ))}
          </ul>
        </article>
      </Container>
    </section>
  );
}

export function HomeComoTrabaja() {
  const { eyebrow, title, steps } = HOME_COPY.comoTrabaja;

  return (
    <section
      className="nelvyon-home-block nelvyon-home-block--compact nelvyon-home-story"
      aria-labelledby="home-como-trabaja-title"
    >
      <Container>
        <article className="nelvyon-home-story__article nelvyon-home-story__article--wide">
          <p className="nelvyon-home-story__eyebrow">{eyebrow}</p>
          <h2 id="home-como-trabaja-title" className="nelvyon-home-story__title">
            {title}
          </h2>
          <ol className="nelvyon-home-story__steps">
            {steps.map((step) => (
              <li key={step.num} className="nelvyon-home-story__step">
                <span className="nelvyon-home-story__step-num" aria-hidden>
                  {step.num}
                </span>
                <div>
                  <h3 className="nelvyon-home-story__step-title">{step.title}</h3>
                  <p className="nelvyon-home-story__step-text">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </Container>
    </section>
  );
}

export function HomePorQue() {
  const { eyebrow, title, paragraphs } = HOME_COPY.porQue;

  return (
    <section
      className="nelvyon-home-block nelvyon-home-block--grand nelvyon-home-story"
      aria-labelledby="home-por-que-title"
    >
      <Container>
        <article className="nelvyon-home-story__article nelvyon-home-story__article--wide">
          <p className="nelvyon-home-story__eyebrow">{eyebrow}</p>
          <h2 id="home-por-que-title" className="nelvyon-home-story__title">
            {title}
          </h2>
          {paragraphs.map((p) => (
            <p key={p.slice(0, 36)} className="nelvyon-home-story__body">
              {p}
            </p>
          ))}
        </article>
      </Container>
    </section>
  );
}
