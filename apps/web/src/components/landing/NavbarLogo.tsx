"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { BRAND } from "./shared";

export function NavbarLogo() {
  const [imgError, setImgError] = useState(false);

  return (
    <Link className="relative flex shrink-0 items-center" href="/">
      {!imgError ? (
        <Image
          alt="NELVYON"
          className="h-9 w-auto object-contain md:h-10"
          height={40}
          onError={() => setImgError(true)}
          priority
          src="/logo.png.png"
          width={140}
        />
      ) : (
        <span className="text-xl font-bold tracking-tight" style={{ color: BRAND.blue }}>
          NELVYON
        </span>
      )}
    </Link>
  );
}
