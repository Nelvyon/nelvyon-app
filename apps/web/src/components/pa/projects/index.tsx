"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "motion/react";

import { cn } from "@/lib/pa/utils";

const MotionLink = motion.create(Link);

import { Container } from "@/components/pa/container";
import { RightArrow } from "@/components/pa/icons/general";
import { PageHeader } from "@/components/pa/page-header";

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
    src: "/pa/assets/project-1.webp",
    alt: "Arquitectura CRM y funnels",
    width: 2400,
    height: 1564,
    className: "col-span-14 md:col-span-7 lg:col-span-9",
    title: "Arquitectura CRM y funnels",
    summary:
      "Implementacion de captacion, seguimiento comercial y automatizaciones conectadas.",
    client: "Operacion comercial",
    category: "CRM, funnels y automatizacion",
    timeline: "4 semanas",
    deliverables: [
      "Mapeo de pipeline",
      "Integraciones clave",
      "Panel operativo",
    ],
    impact:
      "Visibilidad completa del proceso de lead a cliente.",
  },
  {
    src: "/pa/assets/project-2.webp",
    alt: "Sistema SEO y contenido",
    width: 1248,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-5",
    title: "Sistema SEO y contenido",
    summary:
      "Plan editorial, optimizacion tecnica y ejecucion continua para captar demanda organica.",
    client: "Marca en crecimiento",
    category: "SEO, contenido y analitica",
    timeline: "6 semanas",
    deliverables: [
      "Roadmap SEO",
      "Clusters de contenido",
      "Tracking de rendimiento",
    ],
    impact:
      "Mayor claridad en prioridades y ejecucion sostenida.",
  },
  {
    src: "/pa/assets/project-3.webp",
    alt: "Lanzamiento de oferta SaaS",
    width: 1824,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-7",
    title: "Lanzamiento de oferta SaaS",
    summary:
      "Definicion de posicionamiento, pricing y recorridos de conversion para planes Starter, Growth y Elite.",
    client: "Unidad SaaS",
    category: "Go-to-market y pricing",
    timeline: "3 semanas",
    deliverables: [
      "Estructura de oferta",
      "Flujo de captacion",
      "Base de automatizaciones",
    ],
    impact:
      "Oferta lista para operar con foco en conversion y retencion.",
  },
  {
    src: "/pa/assets/project-4.webp",
    alt: "Operacion multi-canal",
    width: 1824,
    height: 1320,
    className: "group relative col-span-14 md:col-span-7 lg:col-span-7",
    title: "Operacion multi-canal",
    summary:
      "Orquestacion de paid media, contenidos y automatizaciones en un mismo sistema operativo.",
    client: "Equipo de marketing",
    category: "Paid media y automatizacion",
    timeline: "8 semanas",
    deliverables: ["Ejecucion multi-canal", "Automatizaciones", "Cadencia de optimizacion"],
    impact:
      "Menos friccion entre canales y mejor continuidad en la ejecucion.",
  },
  {
    src: "/pa/assets/project-5.webp",
    alt: "Analitica y reporting",
    width: 1248,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-5",
    title: "Analitica y reporting",
    summary:
      "Definicion de KPIs, cuadros de mando y rituales de decision para direccion comercial y marketing.",
    client: "Direccion general",
    category: "Data, dashboards y gobierno",
    timeline: "5 semanas",
    deliverables: ["Mapa de KPIs", "Dashboards", "Rituales de revision"],
    impact:
      "Decisiones mas rapidas con informacion unificada.",
  },
  {
    src: "/pa/assets/project-6.webp",
    alt: "Escalado ecommerce",
    width: 2400,
    height: 1320,
    className: "col-span-14 md:col-span-7 lg:col-span-9",
    title: "Escalado ecommerce",
    summary:
      "Optimizacion de captacion, conversion y operaciones post-venta en una arquitectura integrada.",
    client: "Equipo ecommerce",
    category: "Ecommerce y automatizacion",
    timeline: "7 semanas",
    deliverables: ["Funnel ecommerce", "Workflows", "Soporte operativo"],
    impact:
      "Operacion mas estable y escalable para crecer sin caos.",
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
            <PageHeader>Capacidades</PageHeader>
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
