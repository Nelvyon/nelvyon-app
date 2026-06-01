import Link from "next/link";

import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

export function HomeSaasTeaser() {
  const { title, body, cta } = HOME_COPY.saas;

  return (
    <section
      className="nelvyon-home-block nelvyon-home-block--compact nelvyon-home-block--alt nelvyon-home-saas"
      aria-labelledby="home-saas-title"
    >
      <Container>
        <div className="nelvyon-home-saas__inner">
          <h2 id="home-saas-title" className="nelvyon-home-saas__title">
            {title}
          </h2>
          <p className="nelvyon-home-saas__body">{body}</p>
          <Link href="/saas" className="mkt-btn nelvyon-btn-primary nelvyon-home-saas__cta">
            {cta}
          </Link>
        </div>
      </Container>
    </section>
  );
}
