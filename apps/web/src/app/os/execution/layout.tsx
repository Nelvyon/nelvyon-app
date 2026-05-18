import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "OS execution · Operations · NELVYON",
  description: "Motor de ejecución automática NELVYON OS — jobs y progreso en tiempo real (v1).",
  robots: { index: false, follow: false },
};

export default function OsExecutionLayout({ children }: { children: ReactNode }) {
  return children;
}
