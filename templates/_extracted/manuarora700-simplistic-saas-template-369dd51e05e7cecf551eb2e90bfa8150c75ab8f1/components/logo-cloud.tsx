"use client";

import React from "react";
import { motion } from "motion/react";
import Image from "next/image";

export function LogoCloud() {
  const logos = [
    {
      title: "Open AI",
      src: "https://assets.aceternity.com/logos/openai.png",
    },
    {
      title: "Hello Patient",
      src: "https://assets.aceternity.com/logos/hello-patient.png",
    },
    {
      title: "Granola",
      src: "https://assets.aceternity.com/logos/granola.png",
    },
    {
      title: "Character AI",
      src: "https://assets.aceternity.com/logos/characterai.png",
    },
    {
      title: "Oracle",
      src: "https://assets.aceternity.com/logos/oracle.png",
    },
    {
      title: "Portola",
      src: "https://assets.aceternity.com/logos/portola.png",
    },
    {
      title: "Accel",
      src: "https://assets.aceternity.com/logos/accel.png",
    },
    {
      title: "Bloomberg",
      src: "https://assets.aceternity.com/logos/bloomberg.png",
    },
    {
      title: "Forbes",
      src: "https://assets.aceternity.com/logos/forbes.png",
    },
    {
      title: "SoftBank",
      src: "https://assets.aceternity.com/logos/softbank.png",
    },
    {
      title: "The Guardian",
      src: "https://assets.aceternity.com/logos/the-guardian.png",
    },
    {
      title: "Wired",
      src: "https://assets.aceternity.com/logos/wired.png",
    },
    {
      title: "Hulu",
      src: "https://assets.aceternity.com/logos/hulu.webp",
    },
    {
      title: "YouTube",
      src: "https://assets.aceternity.com/logos/youtube.webp",
    },
    {
      title: "Netflix",
      src: "https://assets.aceternity.com/logos/netflix.webp",
    },
    {
      title: "Spotify",
      src: "https://assets.aceternity.com/logos/spotify.webp",
    },
    {
      title: "Twitch",
      src: "https://assets.aceternity.com/logos/twitch.webp",
    },
    {
      title: "Raycast",
      src: "https://assets.aceternity.com/logos/raycast.webp",
    },
  ];
  return (
    <section className="py-10 md:py-20 lg:py-32">
      <h2 className="mx-auto max-w-xl text-center text-lg font-medium text-neutral-600 dark:text-neutral-400">
        Trusted by teams building the future of AI.{" "}
        <br className="hidden sm:block" />{" "}
        <span className="text-neutral-400 dark:text-neutral-600">
          {" "}
          From prototype to production, autonomously.
        </span>
      </h2>
      <div className="mx-auto mt-10 grid max-w-7xl grid-cols-4 md:grid-cols-6">
        {logos.map((logo, index) => (
          <motion.div
            key={logo.title}
            initial={{
              y: -10,
              opacity: 0,
              filter: "blur(10px)",
            }}
            whileInView={{
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
              delay: index * 0.1,
            }}
          >
            <Image
              key={logo.title}
              src={logo.src}
              width={100}
              height={100}
              alt={logo.title}
              className="mx-auto size-20 object-contain dark:invert dark:filter"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
