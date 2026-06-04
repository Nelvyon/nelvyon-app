"use client";

import { Container } from "@/components/pa/container";
import { Button } from "@/components/pa/button";
import { cn } from "@/lib/pa/utils";
import { motion, type Variants } from "motion/react";
import { GlobeLight } from "@/components/pa/hero/globe-light";
import { LightAbove } from "@/components/pa/hero/light-above";
import { Stars } from "@/components/pa/hero/stars";
import { GradientGrid } from "@/components/pa/hero/gradient-grid";
import { nelvyonHero } from "@/config/nelvyon-pa-content";

const layersContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.25, delayChildren: 0.2 },
  },
};

const layerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: "easeInOut" } },
};

const gridLayerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 0.05, transition: { duration: 0.8, ease: "easeInOut" } },
};

const lightAboveVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 0.85, transition: { duration: 0.8, ease: "easeInOut" } },
};

export const Hero = () => {
  return (
    <div className="h-[60vh] w-full p-2 md:h-screen">
      <div className="text-natural-white relative m-0 h-full w-full overflow-hidden rounded-3xl bg-black">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[62%] bg-[radial-gradient(ellipse_95%_85%_at_50%_0%,rgba(0,132,255,0.42),transparent_72%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[40%] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(0,71,171,0.28),transparent_68%)]"
          aria-hidden
        />
        <motion.div
          className="absolute inset-0 h-full w-full"
          variants={layersContainerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={gridLayerVariants}
            className="h-1/2 w-full mask-[linear-gradient(to_bottom,transparent_0%,black_50%,transparent_100%)]"
          >
            <GradientGrid />
          </motion.div>
          <motion.div
            variants={layerVariants}
            className="absolute -bottom-75 left-1/2 flex h-full w-full -translate-x-1/2 justify-center"
          >
            <div className="w-fit">
              <GlobeLight />
            </div>
          </motion.div>
          <motion.div
            variants={layerVariants}
            className="absolute -bottom-10 left-1/2 z-0 flex h-full w-full -translate-x-1/2 justify-center"
          >
            <div className="w-fit">
              <Stars />
            </div>
          </motion.div>
          <motion.div
            variants={lightAboveVariants}
            className="absolute bottom-0 left-1/2 z-5 flex h-full w-full -translate-x-1/2 justify-center"
          >
            <div className="w-fit">
              <LightAbove />
            </div>
          </motion.div>
        </motion.div>
        <Container className="relative z-10 flex h-full flex-col justify-between">
          <div className="pt-32 md:pt-42 lg:pt-75">
            <div className="mt-6 flex flex-col items-start gap-6 md:mt-10 lg:flex-row lg:items-start lg:gap-12">
              <h1 className="text-natural-white -tracking-xl max-w-[36rem] text-balance text-[1.55rem] font-semibold leading-[1.28] sm:max-w-[40rem] sm:text-[1.7rem] md:max-w-[42rem] md:text-[1.95rem] md:leading-[1.24] lg:max-w-[44rem] lg:text-[2.25rem] lg:leading-[1.2] xl:text-[2.4rem]">
                {nelvyonHero.title}
              </h1>
              <div className="w-full max-w-md shrink-0 lg:pt-1">
                <h2 className="text-sm font-medium text-balance text-white/80 sm:text-base lg:text-lg">
                  {nelvyonHero.subtitle}
                </h2>
                <div className="mt-6 flex flex-wrap gap-3 md:mt-8">
                  <Button containerClassName="!bg-[#0084ff]" text={nelvyonHero.ctaPrimary} />
                  <Button
                    href="/saas"
                    containerClassName="!bg-transparent"
                    text={nelvyonHero.ctaSecondary}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-18 sm:h-48 md:h-72">
            <p
              className={cn(
                "from-natural-white/10 -tracking-xl to-heading/0 bg-linear-to-r bg-clip-text text-transparent",
                "absolute -top-10 left-1/2 -translate-x-1/2 text-center text-[72px] font-semibold sm:text-[5rem] md:-top-6 md:mt-10 md:text-[120px] lg:-top-18 lg:text-[220px] xl:text-[260px]",
              )}
            >
              NELVYON
            </p>
          </div>
        </Container>
      </div>
    </div>
  );
};
