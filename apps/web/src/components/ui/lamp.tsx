"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type LampContainerProps = {
  children: ReactNode;
  className?: string;
  /** CTA compacto en home (sin min-h-screen). */
  compact?: boolean;
};

export function LampContainer({ children, className, compact = false }: LampContainerProps) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-start overflow-hidden rounded-md bg-[#020817]",
        compact ? "min-h-0" : "min-h-screen",
        className,
      )}
    >
      <div
        className={cn(
          "lamp-container relative flex w-full items-center justify-center",
          compact ? "h-[min(280px,42vw)]" : "h-[60vh]",
        )}
      >
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          viewport={{ once: true }}
          className="absolute inset-auto right-1/2 h-56 w-[30rem] overflow-visible"
          style={{
            backgroundImage:
              "conic-gradient(from 70deg at center top, #0084FF 0deg, transparent 120deg, transparent 360deg)",
          }}
        >
          <div className="absolute bottom-0 left-0 z-20 h-40 w-full bg-[#020817] [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute bottom-0 left-0 z-20 h-full w-40 bg-[#020817] [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          viewport={{ once: true }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem]"
          style={{
            backgroundImage:
              "conic-gradient(from 290deg at center top, transparent 0deg, transparent 240deg, #0047AB 300deg)",
          }}
        >
          <div className="absolute bottom-0 right-0 z-20 h-full w-40 bg-[#020817] [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute bottom-0 right-0 z-20 h-40 w-full bg-[#020817] [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-[#020817] blur-2xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />

        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-[#0084FF] opacity-40 blur-3xl" />
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "25rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          viewport={{ once: true }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-[#0084FF] opacity-35 blur-2xl"
        />
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          viewport={{ once: true }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-[#0084FF]"
        />
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-transparent" />
      </div>

      <div
        className={cn(
          "relative z-50 flex w-full flex-col items-center px-5",
          compact ? "-mt-20 py-6" : "-mt-48",
        )}
      >
        {children}
      </div>
    </div>
  );
}
