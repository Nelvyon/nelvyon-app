"use client";
import React, { useState } from "react";
import { Logo } from "./logo";
import { Container } from "./container";
import Link from "next/link";
import { Button } from "./ui/button";
import { IconLayoutSidebar, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
const navlinks = [
  { title: "Inicio", href: "/" },
  { title: "Servicios", href: "/servicios" },
  { title: "SaaS", href: "/saas" },
  { title: "Nosotros", href: "/nosotros" },
  { title: "Precios", href: "/pricing" },
  { title: "Contacto", href: "/contacto" },
];
export const Navbar = () => {
  return (
    <div className="border-b border-neutral-200 bg-white sticky top-0 z-50">
      <DesktopNavbar />
      <MobileNavbar />
    </div>
  );
};
export const MobileNavbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex md:hidden px-4 py-3 justify-between relative bg-white">
      <Logo />
      <button onClick={() => setOpen(!open)}>
        <IconLayoutSidebar className="size-5 text-neutral-700" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 h-full w-full z-50 px-4 py-4 bg-white flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-8">
                <Logo />
                <button onClick={() => setOpen(false)}><IconX className="size-5" /></button>
              </div>
              <div className="flex flex-col gap-6">
                {navlinks.map((item, index) => (
                  <Link key={index} href={item.href} onClick={() => setOpen(false)}
                    className="text-xl text-neutral-700 font-medium hover:text-[#1a7fc4] transition-colors">
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 pb-4">
              <Link href="/login" className="text-sm px-4 py-2 text-neutral-600 font-medium">Acceder</Link>
              <Button asChild><Link href="/registro">Empieza gratis</Link></Button>
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
      <div className="flex items-center gap-8">
        {navlinks.map((item, index) => (
          <Link key={index} href={item.href}
            className="text-sm text-neutral-600 font-medium hover:text-[#1a7fc4] transition-colors">
            {item.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-sm px-4 py-2 text-neutral-600 font-medium hover:text-[#1a7fc4] transition-colors">Acceder</Link>
        <Button asChild style={{ background: "#1a7fc4" }}>
          <Link href="/registro">Empieza gratis</Link>
        </Button>
      </div>
    </Container>
  );
};
