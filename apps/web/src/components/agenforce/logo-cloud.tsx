"use client";
import Image from "next/image";
import React from "react";
import { motion } from "motion/react";

export const LogoCloud = () => {
  const logos = [
    { title: "Meta Ads", src: "https://assets.aceternity.com/logos/openai.png" },
    { title: "Google Ads", src: "https://assets.aceternity.com/logos/oracle.png" },
    { title: "WhatsApp", src: "https://assets.aceternity.com/logos/granola.png" },
    { title: "Stripe", src: "https://assets.aceternity.com/logos/characterai.png" },
    { title: "Twilio", src: "https://assets.aceternity.com/logos/portola.png" },
    { title: "Zapier", src: "https://assets.aceternity.com/logos/hello-patient.png" },
  ];
  return (
    <section className="pb-10 md:pb-10">
      <h2 className="text-neutral-600 font-medium dark:text-neutral-400 text-lg text-center max-w-xl mx-auto">
        Conectado con las herramientas que ya usas.
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 max-w-3xl mx-auto mt-10">
        {logos.map((logo, index) => (
          <motion.div
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
            transition={{
              duration: 0.5,
              ease: "easeOut",
              delay: index * 0.1,
            }}
            key={logo.title}
          >
            <Image
              src={logo.src}
              width={100}
              height={100}
              alt={logo.title}
              className="size-20 object-contain mx-auto dark:filter dark:invert"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
};
