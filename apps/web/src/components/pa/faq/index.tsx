import React from "react";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { CTACard } from "@/components/pa/faq/cta-card";
import {
  AccordionContent,
  AccordionTrigger,
  Accordion,
  AccordionItem,
} from "@/components/pa/ui/accordion";
import Link from "next/link";
import { nelvyonContact, nelvyonFaq } from "@/config/nelvyon-pa-content";

const data = [...nelvyonFaq];

export const FAQ = () => {
  return (
    <section className="w-full">
      <Container className="grid grid-cols-1 gap-15 py-20 md:py-30 lg:grid-cols-2">
        <div className="flex flex-col gap-15 pt-8">
          <div className="flex flex-col gap-4">
            <Header>Preguntas frecuentes</Header>
            <div className="-tracking-xs text-base leading-6 font-medium text-white/75 md:text-nowrap">
              Tienes mas preguntas? Escribenos a{" "}
              <Link
                href={`mailto:${nelvyonContact.email}`}
                className="text-[#0084FF] underline underline-offset-3"
              >
                {nelvyonContact.email}
              </Link>
            </div>
          </div>
          <CTACard />
        </div>
        <div className="h-full w-full">
          <Accordion defaultValue={["item-1"]}>
            {data.map((item, index) => (
              <React.Fragment key={`${item.question}-${index}`}>
                <AccordionItem
                  value={`${item.question}-${index}`}
                  className="py-8"
                >
                  <AccordionTrigger className="-tracking-xs text-base leading-6 font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
                {data.length - 1 !== index && (
                  <div className="bg-natural-black/15 h-px w-full" />
                )}
              </React.Fragment>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
};

