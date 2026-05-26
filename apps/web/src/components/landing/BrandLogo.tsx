"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { BRAND } from "./shared";

export function BrandLogo({ href = "/", className = "" }: { href?: string; className?: string }) {
  const [src, setSrc] = useState("/logo.png");

  return (
    <Link className={`relative flex shrink-0 items-center ${className}`} href={href}>
      <Image
        alt="NELVYON"
        className="h-9 w-auto object-contain md:h-10"
        height={40}
        onError={() => {
          if (src !== "/logo.svg") setSrc("/logo.svg");
        }}
        priority
        src={src}
        width={140}
      />
      <span className="sr-only" style={{ color: BRAND.blue }}>
        NELVYON
      </span>
    </Link>
  );
}
