import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Roadmap | NELVYON",
  description: "Funcionalidades en desarrollo y planificadas para NELVYON",
};

export default function RoadmapLayout({ children }: { children: ReactNode }) {
  return children;
}
