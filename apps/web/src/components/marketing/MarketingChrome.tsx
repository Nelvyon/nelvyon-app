"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Footer } from "@/components/pa/footer";
import { Navbar } from "@/components/pa/navbar";

/** Nelvyon enterprise home ships its own shell; other marketing routes keep PA chrome. */
export function MarketingChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const nelvyonLanding = pathname === "/";

  if (nelvyonLanding) {
    return <>{children}</>;
  }

  return (
    <div className="pa-theme">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
