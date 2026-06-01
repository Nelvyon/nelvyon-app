"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LogoIcon } from "./logo";

const LOGO_FULL = "/logo.png.png";
const LOGO_FALLBACK = "/logo.svg";

type NelvyonLogoProps = {
  height?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  href?: string;
  priority?: boolean;
  className?: string;
};

export function NelvyonLogo({
  height = 40,
  showWordmark = false,
  wordmarkClassName = "",
  href = "/",
  priority = false,
  className = "",
}: NelvyonLogoProps) {
  const [useFallback, setUseFallback] = useState(false);

  const content = useFallback ? (
    <>
      <LogoIcon className="nelvyon-logo__icon" style={{ height, width: "auto" }} />
      {showWordmark ? (
        <span className={`nelvyon-logo-wordmark ${wordmarkClassName}`.trim()}>NELVYON</span>
      ) : null}
    </>
  ) : (
    <Image
      src={LOGO_FULL}
      alt="NELVYON"
      width={Math.round(height * 3.4)}
      height={height}
      className="nelvyon-logo__image"
      style={{ height, width: "auto" }}
      priority={priority}
      onError={() => setUseFallback(true)}
    />
  );

  const wrapClass = `nelvyon-logo ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={wrapClass}>
        {content}
      </Link>
    );
  }

  return <div className={wrapClass}>{content}</div>;
}
