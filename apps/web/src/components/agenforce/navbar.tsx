"use client";
import React, { useState } from "react";
import { Logo } from "./logo";
import { Container } from "./container";
import Link from "next/link";
import { Button } from "./ui/button";
import { IconLayoutSidebar, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

const navlinks = [
  { title: "Plataforma", href: "/#features" },
  { title: "Servicios", href: "/servicios" },
  { title: "Precios", href: "/precios" },
  { title: "Blog", href: "/blog" },
];

export const Navbar = () => {
  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <DesktopNavbar />
      <MobileNavbar />
    </div>
  );
};

export const MobileNavbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex md:hidden px-4 py-2 justify-between relative">
      <Logo />
      <button type="button" onClick={() => setOpen(!open)} aria-label="Abrir menú">
        <IconLayoutSidebar className="size-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              backdropFilter: "blur(15px)",
            }}
            exit={{
              opacity: 0,
              backdropFilter: "blur(0px)",
            }}
            transition={{
              duration: 0.2,
            }}
            className="fixed inset-0 h-full w-full z-50 px-4 py-1.5 flex flex-col justify-between bg-background"
          >
            <div>
              <div className="flex justify-between">
                <Logo />
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú">
                  <IconX />
                </button>
              </div>

              <div className="flex flex-col gap-6 my-10">
                {navlinks.map((item, index) => (
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: -4,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.1,
                    }}
                    key={item.title}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="text-2xl text-neutral-600 dark:text-neutral-400 font-medium"
                    >
                      {item.title}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-end gap-4">
                <Link
                  href="/login"
                  className="text-sm px-4 inline-block py-2 rounded-md text-neutral-600 dark:text-neutral-400 font-medium"
                >
                  Login
                </Link>
                <Button asChild>
                  <Link href="/registro">Empieza gratis</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DesktopNavbar = () => {
  return (
    <Container className="py-4 items-center justify-between hidden lg:flex">
      <Logo />
      <div className="flex items-center gap-10">
        {navlinks.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="text-sm text-neutral-600 dark:text-neutral-400 font-medium"
          >
            {item.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="text-sm px-4 inline-block py-2 rounded-md text-neutral-600 dark:text-neutral-400 font-medium"
        >
          Login
        </Link>
        <Button asChild>
          <Link href="/registro">Empieza gratis</Link>
        </Button>
      </div>
    </Container>
  );
};
