import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Changelog | NELVYON",
  description: "Últimas actualizaciones y mejoras de NELVYON",
};

export default function ChangelogLayout({ children }: { children: ReactNode }) {
  return children;
}
