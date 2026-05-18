import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mantenimiento-web-premium",
});

export default function OsMantenimientoWebPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${manrope.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
