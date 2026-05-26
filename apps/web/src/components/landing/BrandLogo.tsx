"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function BrandLogo({ href = "/", className = "" }: { href?: string; className?: string }) {
  const [src, setSrc] = useState("/logo.png");

  return (
    <Link className={`relative flex shrink-0 items-center ${className}`} href={href}>
      <Image
        alt="NELVYON"
        className="h-[45px] w-auto object-contain"
        height={45}
        onError={() => {
          if (src !== "/logo.svg") setSrc("/logo.svg");
        }}
        priority
        src={src}
        width={150}
      />
    </Link>
  );
}
