"use client";

import dynamic from "next/dynamic";

import type { WorldMapDot } from "@/components/ui/world-map";

import { Container } from "./container";
import { HOME_COPY } from "./home-copy";

const OPERATION_DOTS: WorldMapDot[] = [
  { start: { lat: 40.4168, lng: -3.7038 }, end: { lat: 48.8566, lng: 2.3522 } },
  { start: { lat: 40.4168, lng: -3.7038 }, end: { lat: 51.5074, lng: -0.1278 } },
  { start: { lat: 48.8566, lng: 2.3522 }, end: { lat: 52.52, lng: 13.405 } },
];

const WorldMapCanvas = dynamic(() => import("@/components/ui/world-map"), {
  ssr: false,
  loading: () => <div className="nelvyon-home-world__skeleton" aria-hidden />,
});

export function HomeWorldMap() {
  const { title, subtitle } = HOME_COPY.worldMap;

  return (
    <section className="nelvyon-home-block nelvyon-home-world nelvyon-home-world--v3" aria-labelledby="home-world-map-title">
      <Container className="nelvyon-home-world__container">
        <header className="nelvyon-home-world__head">
          <h2 id="home-world-map-title" className="nelvyon-home-world__title">
            {title}
          </h2>
          <p className="nelvyon-home-world__subtitle">{subtitle}</p>
        </header>
        <div className="nelvyon-home-world__canvas-wrap">
          <WorldMapCanvas dots={OPERATION_DOTS} className="nelvyon-home-world__map" />
        </div>
      </Container>
    </section>
  );
}
