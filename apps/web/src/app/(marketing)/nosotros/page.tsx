import type { Metadata } from "next";
import { AboutSection } from "@/components/pa/about";
import { Container } from "@/components/pa/container";
import { PageHeader } from "@/components/pa/page-header";


export const metadata: Metadata = {
  title: "Nosotros | NELVYON",
  description: "Misión, visión, valores y metodología de NELVYON. Plataforma operativa con red de especialistas.",
};

export default function NosotrosPage() {
  return (
    <>
      <Container className="relative pt-28 md:pt-40">
        <PageHeader>Nosotros</PageHeader>
      </Container>
      <AboutSection />
    </>
  );
}
