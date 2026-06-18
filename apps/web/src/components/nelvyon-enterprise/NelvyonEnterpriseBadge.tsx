"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@/core/ui/utils";

export function NelvyonEnterpriseBadge({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const classNames = cn("nv-enterprise-badge", className);

  if (href) {
    return (
      <motion.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
        <Link className={cn(classNames, "transition hover:border-[#0066FF]/60 hover:bg-[#0066FF]/15")} href={href}>
          {children}
          <ArrowRight aria-hidden className="h-3.5 w-3.5 opacity-70" />
        </Link>
      </motion.div>
    );
  }

  return <span className={classNames}>{children}</span>;
}
