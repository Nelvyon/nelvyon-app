"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "motion/react";

import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);

import { Container } from "@/components/container";
import { RightArrow } from "@/components/icons/general";
import { PageHeader } from "@/components/page-header";

type Project = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  title: string;
  summary: string;
  client: string;
  category: string;
  timeline: string;
  deliverables: string[];
  impact: string;
};

const projects = [
  {
    src: "/assets/project-1.webp",
    alt: "Project 1",
    width: 2400,
    height: 1564,
    className: "col-span-14 md:col-span-7 lg:col-span-9",
    title: "AI search landing page",
    summary:
      "A conversion-focused landing page designed to explain a complex AI product in under 10 seconds.",
    client: "Cursor AI",
    category: "Figma Design, Next.js Development",
    timeline: "2 weeks",
    deliverables: [
      "Art direction",
      "Landing page system",
      "Motion-ready components",
    ],
    impact:
      "Built around a single CTA and social proof blocks to support a high-intent launch.",
  },
  {
    src: "/assets/project-2.webp",
    alt: "Project 2",
    width: 1248,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-5",
    title: "SaaS homepage refresh",
    summary:
      "A tighter homepage structure that helps visitors understand product value without reading a wall of text.",
    client: "Stealth SaaS",
    category: "Strategy, Design System, Frontend Build",
    timeline: "10 days",
    deliverables: [
      "Homepage redesign",
      "Messaging hierarchy",
      "Responsive sections",
    ],
    impact:
      "Reduced friction in the hero and highlighted the most important product proof points earlier.",
  },
  {
    src: "/assets/project-3.webp",
    alt: "Project 3",
    width: 1824,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-7",
    title: "Agency portfolio upgrade",
    summary:
      "A premium portfolio layout that feels editorial while still being easy to scan for leads.",
    client: "Productized Agency",
    category: "Brand Refresh, Web Design",
    timeline: "1 week",
    deliverables: [
      "Portfolio layout",
      "Case study blocks",
      "Lead capture sections",
    ],
    impact:
      "Turned previous work into proof that supports outbound and inbound sales conversations.",
  },
  {
    src: "/assets/project-4.webp",
    alt: "Project 4",
    width: 1824,
    height: 1320,
    className: "group relative col-span-14 md:col-span-7 lg:col-span-7",
    title: "Funding launch page",
    summary:
      "A narrative-led launch page built to support credibility, conversions, and investor attention.",
    client: "Cursor AI",
    category: "Figma Design, Next.js Development",
    timeline: "2 weeks",
    deliverables: ["Launch page", "Case study copy", "Conversion sections"],
    impact:
      "Framed the product story around traction, trust, and a clear next step for the visitor.",
  },
  {
    src: "/assets/project-5.webp",
    alt: "Project 5",
    width: 1248,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-5",
    title: "Conversion page redesign",
    summary:
      "A cleaner layout that guides the user from awareness to action with fewer distractions.",
    client: "B2B product team",
    category: "UX Strategy, UI Design",
    timeline: "12 days",
    deliverables: ["Wireframes", "Final UI", "Responsive handoff"],
    impact:
      "Improved clarity in the offer and made the page easier to trust at first glance.",
  },
  {
    src: "/assets/project-6.webp",
    alt: "Project 6",
    width: 2400,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-9",
    title: "Productized service homepage",
    summary:
      "A homepage that positions a service like a product, making the offer easier to buy.",
    client: "Template studio",
    category: "Positioning, Design, Development",
    timeline: "2 weeks",
    deliverables: ["Homepage build", "Offer stack", "Testimonials and proof"],
    impact:
      "Helped the service read as a repeatable product instead of a custom agency pitch.",
  },
] satisfies Project[];

const overlayVariants: Variants = {
  rest: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 30,
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const overlayItemVariants: Variants = {
  rest: { opacity: 0, y: 18 },
  hover: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export const Projects = ({
  disabelHeader = false,
}: {
  disabelHeader?: boolean;
}) => {
  return (
    <section className="w-full">
      <Container className="relative flex w-full flex-col gap-20 overflow-hidden pt-40 pb-20 md:pt-65 md:pb-30 lg:pt-80 lg:pb-30">
        {!disabelHeader && (
          <div>
            <PageHeader>Projects</PageHeader>
          </div>
        )}
        {/* grids */}
        <div
          className={cn(
            "z-10 grid grid-cols-14 gap-6",
            "[--card-height:440px]",
            "*:data-[slot='card']:max-h-(--card-height) *:data-[slot='card']:min-h-(--card-height) *:data-[slot='card']:overflow-hidden *:data-[slot='card']:rounded-3xl",
          )}
        >
          {projects.map((project) => (
            <MotionLink
              key={project.src}
              href="#"
              data-slot="card"
              initial="rest"
              animate="rest"
              whileHover="hover"
              className={cn("group relative block text-left", project.className)}
            >
              <Image
                src={project.src}
                alt={project.alt}
                fill
                sizes="(min-width: 1024px) 68vw, 100vw"
                className="rounded-3xl object-cover object-center"
                priority
              />
              <motion.div
                variants={overlayVariants}
                className="bg-natural-black/50 absolute inset-0 flex flex-col justify-between rounded-3xl p-6 backdrop-blur-md md:p-8"
              >
                <motion.div variants={overlayItemVariants} className="space-y-2">
                  <div className="text-natural-white -tracking-sm text-2xl leading-8 font-medium">
                    {project.title}
                  </div>
                  <p className="text-natural-white/80 text-base leading-6 font-medium">
                    {project.summary}
                  </p>
                </motion.div>
                <motion.div
                  variants={overlayItemVariants}
                  className="flex w-full items-end justify-between gap-4"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-natural-white tracking-xs text-sm leading-3.5 font-medium">
                      View Project
                    </span>
                    <RightArrow />
                  </div>
                  <span className="-tracking-xs text-natural-white/80 text-right text-sm leading-3.5 font-medium">
                    {project.category}
                  </span>
                </motion.div>
              </motion.div>
            </MotionLink>
          ))}
        </div>
      </Container>
    </section>
  );
};
