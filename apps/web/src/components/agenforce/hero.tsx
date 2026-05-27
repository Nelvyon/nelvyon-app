import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { Button } from "./ui/button";
import Link from "next/link";
import { LandingImages } from "./landing-images";
import { GradientDivider } from "./gradient-divider";

export const Hero = () => {
  return (
    <section className="pt-10 md:pt-20 lg:pt-32 relative overflow-hidden">
      <Container>
        <Heading as="h1">El sistema operativo de tu negocio</Heading>
        <p className="mt-4 text-center lg:text-left text-neutral-500 dark:text-neutral-400 italic text-sm md:text-base max-w-2xl mx-auto lg:mx-0">
          Donde nace tu imperio, crece tu marca y se impone tu legado
        </p>
        <Subheading className="py-8">
          Capta leads, cierra ventas y escala tu agencia — todo ejecutado por agentes expertos dentro de
          una sola plataforma.
        </Subheading>
        <div className="flex items-center gap-6 flex-wrap justify-center lg:justify-start">
          <Button className="shadow-brand" asChild>
            <Link href="/registro">Empieza gratis 14 días</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/demo">Ver demo →</Link>
          </Button>
        </div>
        <LandingImages />
      </Container>
      <GradientDivider />
    </section>
  );
};
