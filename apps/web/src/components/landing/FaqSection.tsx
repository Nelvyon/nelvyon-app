"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";

export function FaqSection({
  title = "Preguntas frecuentes",
  items,
  dark = false,
}: {
  title?: string;
  items: readonly { q: string; a: string }[];
  dark?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      className="py-20 md:py-28"
      style={{ backgroundColor: dark ? BRAND.bgSoft : BRAND.white }}
    >
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <FadeIn>
          <h2
            className={`text-center text-3xl font-bold md:text-4xl ${dark ? "text-white" : "text-zinc-900"}`}
          >
            {title}
          </h2>
        </FadeIn>
        <div className="mt-10 divide-y divide-[#E5E7EB]">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <FadeIn delay={i * 0.04} key={item.q}>
                <button
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                  type="button"
                >
                  <span className={`font-medium ${dark ? "text-white" : "text-zinc-900"}`}>{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
                    style={{ color: BRAND.blue }}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className={`pb-5 text-sm leading-relaxed ${dark ? "" : "text-zinc-600"}`} style={{ color: dark ? BRAND.textMuted : undefined }}>
                        {item.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
