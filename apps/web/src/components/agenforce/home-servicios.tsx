import { GlowingEffect } from "@/components/premium/glowing-effect";

import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

export function HomeServicios() {
  return (
    <section className="nelvyon-home-block nelvyon-home-servicios nelvyon-home-servicios--v3" aria-label="Servicios">
      <Container>
        <ul className="nelvyon-home-servicios__grid">
          {HOME_COPY.servicios.items.map((item) => (
            <li key={item.name}>
              <GlowingEffect className="nelvyon-home-servicios__glow">
                <div className="nelvyon-home-servicios__cell">
                  <h3 className="nelvyon-home-servicios__name">{item.name}</h3>
                  <p className="nelvyon-home-servicios__phrase">{item.phrase}</p>
                </div>
              </GlowingEffect>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
