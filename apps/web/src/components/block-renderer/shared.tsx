"use client";

import { motion } from "framer-motion";

import type { LandingBlock } from "@/features/builders/types";
import { cn } from "@/core/ui/utils";

export const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-48px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

export function str(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : fb;
}

export function BlockSection({
  block,
  children,
  className,
}: {
  block: LandingBlock;
  children: React.ReactNode;
  className?: string;
}) {
  const hideMobile = block.responsive?.hideOnMobile;
  const padding = str(block.props.padding, "48px 24px");
  const bg = str(block.props.backgroundColor);
  return (
    <motion.section
      {...fade}
      className={cn("w-full", hideMobile && "hidden md:block", className)}
      style={{ padding, backgroundColor: bg || undefined }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </motion.section>
  );
}
