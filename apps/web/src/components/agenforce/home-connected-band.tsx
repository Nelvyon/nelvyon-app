import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

/** Banda estática — sin World Map animado (rendimiento). */
export function HomeConnectedBand() {
  return (
    <section className="nelvyon-home-block nelvyon-home-connected-band" aria-label="Conexión operativa">
      <Container>
        <div className="nelvyon-home-connected-band__inner" aria-hidden>
          <svg className="nelvyon-home-connected-band__svg" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="nelvyon-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0047AB" stopOpacity="0" />
                <stop offset="35%" stopColor="#0084FF" stopOpacity="0.55" />
                <stop offset="65%" stopColor="#0084FF" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#0047AB" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 120 Q300 40 600 100 T1200 80"
              fill="none"
              stroke="url(#nelvyon-line-grad)"
              strokeWidth="1.5"
            />
            <path
              d="M0 140 Q400 180 800 110 T1200 130"
              fill="none"
              stroke="url(#nelvyon-line-grad)"
              strokeWidth="1"
              opacity="0.5"
            />
            <circle cx="200" cy="95" r="4" fill="#0084FF" opacity="0.9" />
            <circle cx="600" cy="100" r="5" fill="#0084FF" />
            <circle cx="950" cy="115" r="4" fill="#0084FF" opacity="0.85" />
          </svg>
        </div>
        <p className="nelvyon-home-connected-band__caption">{HOME_COPY.connected.caption}</p>
      </Container>
    </section>
  );
}
