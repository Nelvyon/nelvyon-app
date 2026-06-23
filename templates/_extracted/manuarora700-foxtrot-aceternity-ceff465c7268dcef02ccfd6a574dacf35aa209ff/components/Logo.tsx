import clsx from "clsx";

import Link from "next/link";
import React from "react";
import { twMerge } from "tailwind-merge";

const Logo = ({
  textClassName,
  logoClassName,
}: {
  textClassName?: string;
  logoClassName?: string;
}) => {
  return (
    <Link
      href="/"
      className={clsx(
        "font-bold   text-sm flex items-center justify-center text-white space-x-2",
        textClassName
      )}
    >
      <span className=" bg-primary w-6 h-6 flex items-center justify-center   rounded-[6px] font-mono relative overflow-hidden">
        <span className="absolute w-full h-full transform translate-x-3 bg-white/[0.2] rotate-45" />
      </span>
      <span className={twMerge("font-mono", textClassName)}>Foxtrot</span>
    </Link>
  );
};

export default Logo;
