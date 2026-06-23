"use client";
import React, { useEffect, useState } from "react";
import { Container } from "@/components/container";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

const TOTAL_LOGOS = 20;
const DISPLAY_COUNT = 15;

const allLogos = Array.from({ length: TOTAL_LOGOS }, (_, i) => ({
  id: i + 1,
  src: `/logos/${i + 1}.webp`,
}));

export const LogoCloud = () => {
  const [displayedLogos, setDisplayedLogos] = useState(
    allLogos.slice(0, DISPLAY_COUNT),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedLogos((current) => {
        const displayedIds = new Set(current.map((logo) => logo.id));
        const availableLogos = allLogos.filter(
          (logo) => !displayedIds.has(logo.id),
        );

        if (availableLogos.length === 0) return current;

        const randomAvailableIndex = Math.floor(
          Math.random() * availableLogos.length,
        );
        const newLogo = availableLogos[randomAvailableIndex];

        const randomDisplayIndex = Math.floor(Math.random() * current.length);

        const newDisplayed = [...current];
        newDisplayed[randomDisplayIndex] = newLogo;

        return newDisplayed;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Container className="max-w-7xl py-20">
      <h2 className="font-dm-mono -tracking-xs text-muted-foreground text-center text-sm leading-4 font-normal uppercase">
        Trusted by fast-growing startups
      </h2>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-4 md:gap-x-20 md:gap-y-14">
        {displayedLogos.map((logo, index) => (
          <motion.div
            key={index}
            style={{ perspective: 800 }}
            className="relative h-6 w-30 transition-all duration-300"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={logo.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="absolute inset-0"
              >
                <Image
                  src={logo.src}
                  alt={`Company logo ${logo.id}`}
                  width={120}
                  height={40}
                  draggable={false}
                  className="h-4 w-auto object-contain transition-opacity md:h-6"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </Container>
  );
};
