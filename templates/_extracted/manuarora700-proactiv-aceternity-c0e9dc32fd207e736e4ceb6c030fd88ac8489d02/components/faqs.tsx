"use client";
import React, { useState } from "react";
import Accordion from "./accordion";
import { Heading } from "./heading";

const questions = [
  {
    id: 1,
    title: "What is Proactic?",
    description:
      "Proactic is a social media marketing automation tool designed to help businesses streamline their social media efforts.",
  },
  {
    id: 2,
    title: "How does Proactic work?",
    description:
      "Proactic automates the process of scheduling, posting, and analyzing social media content across multiple platforms.",
  },
  {
    id: 3,
    title: "Which social media platforms does Proactic support?",
    description:
      "Proactic supports popular social media platforms such as Facebook, Twitter, Instagram, LinkedIn, and more.",
  },
  {
    id: 4,
    title: "Can I schedule posts in advance with Proactic?",
    description:
      "Yes, Proactic allows you to schedule posts in advance, ensuring your content is published at the optimal times.",
  },
  {
    id: 5,
    title: "Does Proactic provide analytics?",
    description:
      "Proactic offers detailed analytics to help you track the performance of your social media campaigns and make data-driven decisions.",
  },
  {
    id: 6,
    title: "Is Proactic suitable for small businesses?",
    description:
      "Yes, Proactic is designed to be user-friendly and scalable, making it suitable for businesses of all sizes.",
  },
  {
    id: 7,
    title: "Can I collaborate with my team on Proactic?",
    description:
      "Proactic includes collaboration features that allow team members to work together on social media campaigns.",
  },
  {
    id: 8,
    title: "Does Proactic offer customer support?",
    description:
      "Yes, Proactic provides customer support to assist you with any questions or issues you may encounter.",
  },
  {
    id: 9,
    title: "Is there a free trial available for Proactic?",
    description:
      "Proactic offers a free trial so you can explore its features and see how it can benefit your social media marketing efforts.",
  },
  {
    id: 10,
    title: "How can I get started with Proactic?",
    description:
      "To get started with Proactic, simply sign up on our website and follow the onboarding process to set up your account.",
  },
];

export const FAQs = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-3xl mx-auto py-20 px-8">
      <Heading className="pt-4">Frequently asked questions</Heading>
      <div className="grid  gap-10 pt-20">
        {questions.map((item, i) => (
          <Accordion
            key={i}
            i={i}
            expanded={expanded}
            setExpanded={setExpanded}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>
    </div>
  );
};
