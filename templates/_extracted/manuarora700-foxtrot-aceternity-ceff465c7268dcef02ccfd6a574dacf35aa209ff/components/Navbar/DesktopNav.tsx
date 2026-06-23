"use client";
import { CustomLink } from "@components/CustomLink";
import Logo from "@components/Logo";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import React, { useState } from "react";

export const DesktopNav = ({ navItems }: any) => {
  let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  return (
    <div className="flex flex-row space-x-8 items-center antialiased border px-2 py-2 rounded-2xl bg-vulcan-800">
      <Logo />
      {navItems.map((navItem: any, idx: number) => (
        <CustomLink
          key={`link=${idx}`}
          href={navItem.link}
          className="text-white text-sm relative"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0  transform  bg-gradient-to-b from-[#464d55] to-[#25292e] scale-105 rounded-xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <span className="relative z-10 px-2 py-2 inline-block">
            {navItem.name}
          </span>
        </CustomLink>
      ))}
      <Link
        href="/signup"
        className="font-medium text-white inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#464d55] to-[#25292e] text-sm px-4 py-2 transition duration-150 shadow-[0_10px_20px_rgba(0,_0,_0,_.1),0_3px_6px_rgba(0,_0,_0,_.05)] hover:shadow-[rgba(0,_1,_0,_.2)_0_2px_8px] active:outline-none hover:opacity-80 "
      >
        Sign Up
      </Link>
    </div>
  );
};
