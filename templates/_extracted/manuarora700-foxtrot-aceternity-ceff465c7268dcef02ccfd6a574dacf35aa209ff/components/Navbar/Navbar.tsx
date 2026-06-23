"use client";
import { navItems } from "constants/navItems";
import React from "react";

import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";

const Navbar = () => {
  return (
    <div className="flex flex-row items-center justify-between sm:justify-center py-8 max-w-[83rem] mx-auto px-4 relative z-50">
      <div className="hidden sm:flex justify-center">
        <DesktopNav navItems={navItems} />
      </div>

      <div className="flex sm:hidden w-full">
        <MobileNav navItems={navItems} />
      </div>
    </div>
  );
};

export default Navbar;
