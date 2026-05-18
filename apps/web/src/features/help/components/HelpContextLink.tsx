"use client";

import Link from "next/link";
import React from "react";

import { trackProductEvent } from "@/core/telemetry/productEvents";

interface HelpContextLinkProps {
  href: string;
  label: string;
}

export function HelpContextLink({ href, label }: HelpContextLinkProps) {
  return (
    <Link
      className="inline-flex text-xs text-link underline underline-offset-2"
      href={href}
      onClick={() => trackProductEvent("help_article_opened", { route: href })}
    >
      {label}
    </Link>
  );
}
