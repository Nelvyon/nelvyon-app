import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { LandingImages } from "./landing-images";
import { GradientDivider } from "./gradient-divider";

export const Speed = () => {
  return (
    <section className="pt-10 md:pt-20 lg:pt-10 relative overflow-hidden">
      <Container>
        <Heading>Automatización que trabaja mientras duermes</Heading>
        <Subheading className="py-8">
          Secuencias de email, seguimiento de leads, recordatorios y reportes — tus agentes ejecutan el
          trabajo operativo para que tu equipo se enfoque en cerrar.
        </Subheading>
        <LandingImages
          firstImageSrc="https://assets.aceternity.com/screenshots/3.jpg"
          secondImageSrc="https://assets.aceternity.com/screenshots/4.jpg"
        />
      </Container>
      <GradientDivider />
    </section>
  );
};
