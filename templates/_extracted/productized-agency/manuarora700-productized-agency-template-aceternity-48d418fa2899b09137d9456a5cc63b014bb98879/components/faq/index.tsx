import React from "react";
import { Container } from "@/components/container";
import { Header } from "@/components/header";
import { CTACard } from "@/components/faq/cta-card";
import {
  AccordionContent,
  AccordionTrigger,
  Accordion,
  AccordionItem,
} from "@/components/ui/accordion";
import Link from "next/link";

const data = [
  {
    question: "What exactly does this platform do?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
  {
    question: "Do I need to be technical to use this tool?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
  {
    question: "What’s a typical use case of an AI agentic workflow?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
  {
    question: "Can I connect this with my existing stack?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
  {
    question: "How does AI model selection work?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
  {
    question: "Can I connect this with my existing stack?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
  {
    question: "Do I need to be technical to use this tool?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
  {
    question: "How does AI model selection work?",
    answer:
      "Our platform lets you design, deploy, and manage AI-powered agentic workflows that can combine both automated (AI) and manual steps. These workflows connect to your existing tools (like Slack, Notion, or Google Sheets) and use AI agents to complete tasks.",
  },
];

export const FAQ = () => {
  return (
    <section className="w-full">
      <Container className="grid grid-cols-1 gap-15 py-20 md:py-30 lg:grid-cols-2">
        <div className="flex flex-col gap-15 pt-8">
          <div className="flex flex-col gap-4">
            <Header>Frequently Asked Questions</Header>
            <div className="-tracking-xs text-base leading-6 font-medium md:text-nowrap">
              Have more doubts? Reach out to us at{" "}
              <Link
                href="mailto:contact@aceternity.com"
                className="text-dusty-green underline underline-offset-3"
              >
                contact@aceternity.com
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

