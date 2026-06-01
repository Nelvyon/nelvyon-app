import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

export function HomeQueEs() {
  const { title, body } = HOME_COPY.queEs;

  return (
    <section className="nelvyon-home-block nelvyon-home-que-es" aria-labelledby="home-que-es-title">
      <Container>
        <div className="nelvyon-home-editorial">
          <h2 id="home-que-es-title" className="nelvyon-home-editorial__title">
            {title}
          </h2>
          <p className="nelvyon-home-editorial__body">{body}</p>
        </div>
      </Container>
    </section>
  );
}
