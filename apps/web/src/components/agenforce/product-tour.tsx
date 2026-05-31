"use client";

import { useRef, useState } from "react";
import {
  IconCalendar,
  IconChartBar,
  IconFilter,
  IconInbox,
  IconReceipt,
  IconReportAnalytics,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

import { NELVYON_BLUE } from "./marketing-brand";
import { ModuleScreen, type ModuleScreenKey } from "./module-screens";
import { HomeStickyScroll, type StickyScrollItem } from "./ui/home-sticky-scroll";

type TourModule = {
  module: ModuleScreenKey;
  title: string;
  description: string;
  Icon: typeof IconUsers;
};

const TOUR_MODULES: TourModule[] = [
  {
    module: "CRM",
    title: "CRM",
    description: "Pipeline, contactos y fases comerciales en un entorno unificado.",
    Icon: IconUsers,
  },
  {
    module: "Workflows",
    title: "Workflows",
    description: "Automatización entre CRM, email y canales con reglas operativas configurables.",
    Icon: IconWebhook,
  },
  {
    module: "Campañas",
    title: "Campañas",
    description: "Meta, Google y TikTok conectados al seguimiento comercial.",
    Icon: IconChartBar,
  },
  {
    module: "Inbox",
    title: "Inbox",
    description: "Conversaciones centralizadas por canal, vinculadas al CRM.",
    Icon: IconInbox,
  },
  {
    module: "Facturación",
    title: "Facturación",
    description: "Suscripciones y cobros con Stripe integrado a la operación.",
    Icon: IconReceipt,
  },
  {
    module: "Calendario",
    title: "Calendario",
    description: "Citas y disponibilidad conectadas a la operación comercial.",
    Icon: IconCalendar,
  },
  {
    module: "Funnels",
    title: "Funnels",
    description: "Recorridos de conversión y páginas configurables dentro de la plataforma.",
    Icon: IconFilter,
  },
  {
    module: "Reporting",
    title: "Reporting",
    description: "Paneles e informes de actividad operativa por canal y módulo.",
    Icon: IconReportAnalytics,
  },
];

function ModuleFrame({ module }: { module: ModuleScreenKey }) {
  return (
    <div className="nelvyon-product-tour__screen">
      <ModuleScreen module={module} flat />
    </div>
  );
}

export function ProductTour() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const backgrounds = ["#07122a", "#060f1e", "#0a1628"];
  const [background, setBackground] = useState(backgrounds[0]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const breakpoints = TOUR_MODULES.map((_, index) => index / TOUR_MODULES.length);
    const closest = breakpoints.reduce((acc, breakpoint, index) => {
      const distance = Math.abs(latest - breakpoint);
      return distance < Math.abs(latest - breakpoints[acc]) ? index : acc;
    }, 0);
    setBackground(backgrounds[closest % backgrounds.length]);
  });

  const content: StickyScrollItem[] = TOUR_MODULES.map((item) => ({
    title: item.title,
    description: item.description,
    icon: <item.Icon size={28} stroke={1.5} color={NELVYON_BLUE} aria-hidden />,
    content: <ModuleFrame module={item.module} />,
  }));

  return (
    <motion.section
      ref={ref}
      className="nelvyon-product-tour"
      aria-labelledby="product-tour-title"
      animate={{ backgroundColor: background }}
      transition={{ duration: 0.45 }}
    >
      <div className="nelvyon-section-inner nelvyon-product-tour__head">
        <p className="mkt-eyebrow nelvyon-product-tour__eyebrow">Producto</p>
        <h2 id="product-tour-title" className="mkt-h2 mkt-h2--display mkt-h2--light fade-in">
          La plataforma NELVYON, módulo a módulo
        </h2>
        <p className="mkt-lead nelvyon-product-tour__lead fade-in">
          Interfaz representativa del entorno operativo real. Desplázate para recorrer CRM, workflows, campañas,
          comunicación y reporting.
        </p>
      </div>
      <HomeStickyScroll content={content} />
    </motion.section>
  );
}
