"use client";

import { cn } from "@/lib/utils";
import { Container } from "@/components/container";
import { Header } from "@/components/header";
import { GoogleLogo } from "@/components/icons/logo";
import { PricingCard, PricingCardType, } from "@/components/pricing/pricing-card";
import { PricingBadge } from "@/components/pricing/pricing-badge";
import { Button } from "@/components/button";
import Link from "next/link";
import { getCalApi } from "@calcom/embed-react";

const data: PricingCardType[] = [
  {
    category: "Components",
    badge: {
      text: "All slots booked for November.",
      variant: "danger",
    },
    title: "Tailored Website Components",
    subtitle: "for Fast Moving Brands",
    price: 4995,
    billing: "/mo",
    cta: "Select Plan",
    testimonial: {
      name: "Jason Ray",
      role: "CEO",
      message: "Aceternity and Manu are Cracked Devs!",
      avatar: "/avatar/avatar-1.webp",
      brand: <GoogleLogo />,
    },
    features: [
      "Custom Strategy & Wireframe",
      "High-Fidelity Design in Figma",
      "Development in Framer or Webflow",
      "Conversion-Focused Copywriting",
      "Smooth Animations & Interactions",
      "Basic SEO & Performance Optimization",
      "Unlimited Revisions",
      "Conversion-Focused Copywriting",
    ],
    theme: "light",
  },
  {
    category: "Website Pages",
    badge: {
      text: "2 Spots Available",
      variant: "success",
    },
    title: "Tailored Website Components",
    subtitle: "for Fast Moving Brands",
    price: 6995,
    billing: "/mo",
    cta: "Select Plan",
    testimonial: {
      name: "Steve Wozniak",
      role: "CTO",
      message: "Aceternity and Manu are Cracked Devs!",
      avatar: "/avatar/avatar-2.webp",
      brand: <GoogleLogo />,
    },
    features: [
      "Custom Strategy & Wireframe",
      "High-Fidelity Design in Figma",
      "Development in Framer or Webflow",
      "Conversion-Focused Copywriting",
      "Smooth Animations & Interactions",
      "Basic SEO & Performance Optimization",
      "Unlimited Revisions",
      "Conversion-Focused Copywriting",
    ],
    theme: "dark",
  },
];

const secondCard: Partial<PricingCardType> = {
  category: "Multi Pages",
  badge: {
    text: "All slots booked for November.",
    variant: "danger",
  },
  title: "Tailored Multi Page Websites",
  subtitle: "for Best Conversion Rates",
  price: 12499,
  billing: "/mo",
  cta: "Select Plan",
  features: [
    "Custom Strategy & Wireframe",
    "High-Fidelity Design in Figma",
    "Development in Framer or Webflow",
    "High-Fidelity Design in Figma",
    "Conversion-Focused Copywriting",
    "Development in Framer or Webflow",
    "Conversion-Focused Copywriting",
    "High-Fidelity Design in Figma",
    "Unlimited Revisions",
    "Smooth Animations & Interactions",
    "Basic SEO & Performance Optimization",
    "Unlimited Revisions",
    "Conversion-Focused Copywriting",
    "Basic SEO & Performance Optimization",
  ],
};

export const Pricing = ({ disabelHeader = false }: { disabelHeader?: boolean }) => {
  return (
    <section className="w-full">
      <Container className="flex flex-col gap-20 py-20 md:py-30">
        {!disabelHeader && (
          <div className="flex w-full flex-col justify-between gap-4 lg:flex-row">
            <Header>Extensive Pricing Plans</Header>
            <div className="-tracking-xs text-base leading-6 font-medium md:text-nowrap">
              Doubts? Reach out to us at{" "}
              <Link
                href="mailto:contact@aceternity.com"
                className="text-dusty-green underline underline-offset-3"
              >
                contact@aceternity.com
              </Link>{" "}
              or{" "}
              <button
                onClick={async () => {
                  const cal = await getCalApi();
                  cal("modal", {
                    calLink:
                      "manu-arora-lacvgj/project-discussion-with-aceternity",
                  });
                }}
                className="cursor-pointer text-dusty-green underline underline-offset-3"
              >
                chat with us
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.map((card, index) => (
              <PricingCard key={index} card={card} />
            ))}
          </div>
          <div
            className={cn(
              "relative grid grid-cols-1 gap-6 overflow-hidden rounded-3xl px-4 py-4 lg:grid-cols-2 lg:gap-2.5 lg:px-5 lg:py-5",
              "bg-natural-white text-natural-black",
            )}
          >
            <div className="flex h-full flex-col justify-between gap-16 lg:pl-4">
              <div className="flex flex-col gap-6">
                <div className="flex w-fit flex-col gap-3 md:flex-row md:items-center">
                  <span className="-tracking-sm text-lg leading-5">
                    {secondCard.category}
                  </span>
                  <PricingBadge variant={secondCard.badge?.variant}>
                    {secondCard.badge?.text}
                  </PricingBadge>
                </div>
                <div className="-tracking-xl text-2xl leading-8 font-medium">
                  <span>{secondCard.title}</span>
                  <br />
                  <span className="text-muted-foreground">
                    {secondCard.subtitle}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="-tracking-xs text-3xl leading-9 font-medium">
                  <span className="text-2xl">$</span>
                  <span>{secondCard.price?.toLocaleString()}</span>
                  <span className="text-2xl">{secondCard.billing}</span>
                </div>
                <div>
                  <Button text={secondCard.cta} />
                </div>
              </div>
            </div>
            <div className="bg-secondary grid grid-cols-1 gap-4.5 rounded-xl px-8 py-6 md:grid-cols-2">
              {secondCard.features?.map((feature, index) => (
                <div
                  key={`${feature}-${index}`}
                  className="text-muted-foreground flex items-center gap-2 text-sm leading-3.5 font-medium"
                >
                  <div className="bg-muted-foreground/50 size-2.5 rounded-full" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

