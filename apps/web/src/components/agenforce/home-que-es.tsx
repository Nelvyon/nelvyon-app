import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

export function HomeQueEs() {
  const { eyebrow, title, body } = HOME_COPY.queEs;

  return (
    <section
      className="nelvyon-home-block nelvyon-home-block--manifesto nelvyon-home-que-es"
      aria-labelledby="home-que-es-title"
    >
      <Container>
        <article className="nelvyon-home-manifesto">
          <p className="nelvyon-home-story__eyebrow">{eyebrow}</p>
          <h2 id="home-que-es-title" className="nelvyon-home-manifesto__title">
            {title}
          </h2>
          <p className="nelvyon-home-manifesto__body">{body}</p>
        </article>
      </Container>
    </section>
  );
}
