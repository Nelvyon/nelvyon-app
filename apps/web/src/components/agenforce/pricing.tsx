import React from "react";
import { Container } from "./container";
import { Heading } from "./heading";
import { Subheading } from "./subheading";
import { LoopIcon, UsersIcon, LockIcon } from "@/icons";
import { Button } from "./ui/button";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import Link from "next/link";

export const Pricing = () => {
  return (
    <section className="py-10 md:py-20 lg:py-32 relative overflow-hidden">
      <Container className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        <div className="flex flex-col gap-4">
          <Subheading className="mt-2">Elige el plan que se adapta a tu agencia</Subheading>
          <Heading>
            Precios claros. <br />
            Sin sorpresas.
          </Heading>
          <ul className="list-none *:flex *:items-center *:gap-2 *:font-medium mt-4 flex flex-col gap-2">
            <li>
              <LoopIcon />
              <p>Automatización real</p>
            </li>
            <li>
              <UsersIcon />
              <p>Agentes expertos</p>
            </li>
            <li>
              <LockIcon />
              <p>Sin límite de contactos</p>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <PricingCard
            price="97"
            ctaLink="/registro"
            ctaText="Empezar con Starter"
            steps={[
              "CRM y Pipeline incluido",
              "Email marketing automatizado",
              "Hasta 3 agentes expertos",
              "Soporte por email",
              "14 días gratis",
            ]}
          />
          <PricingCard
            price="297"
            ctaLink="/registro"
            ctaText="Empezar con Growth"
            steps={[
              "Todo lo de Starter",
              "Hasta 15 agentes expertos",
              "Integraciones avanzadas (Meta, Google, TikTok)",
              "Funnels y sitios web ilimitados",
              "Soporte prioritario",
            ]}
          />
          <PricingCard
            price="797"
            ctaLink="/contacto"
            ctaText="Contactar ventas"
            steps={[
              "Todo lo de Growth",
              "Agentes expertos ilimitados",
              "White-label completo",
              "Manager de cuenta dedicado",
              "SLA garantizado",
            ]}
          />
        </div>
      </Container>
    </section>
  );
};

const PricingCard = ({
  price,
  ctaLink,
  ctaText,
  steps,
}: {
  price: string;
  ctaLink: string;
  ctaText: string;
  steps: string[];
}) => {
  return (
    <div className="p-4 md:p-8 rounded-2xl bg-neutral-100 dark:bg-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
      <div>
        <Heading>
          {price}€
          <span className="text-neutral-400 text-sm md:text-xl lg:text-3xl">/mes</span>
        </Heading>
        <Button asChild className="mt-4">
          <Link href={ctaLink}>{ctaText}</Link>
        </Button>
      </div>
      <ul className="list-none *:flex *:items-center *:gap-2 *:font-medium mt-4 flex flex-col gap-2">
        {steps.map((step) => (
          <Step key={step} title={step} />
        ))}
      </ul>
    </div>
  );
};

const Step = ({ title }: { title: string }) => {
  return (
    <li>
      <IconCircleCheckFilled className="size-5 text-neutral-500" />
      <p className="text-sm md:text-base">{title}</p>
    </li>
  );
};
