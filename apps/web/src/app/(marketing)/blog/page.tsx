import type { Metadata } from "next";

import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { nelvyonBlogCategories } from "@/config/nelvyon-marketing-pages";

export const metadata: Metadata = {
  title: "Blog | NELVYON",
  description: "Recursos sobre IA, automatización, marketing, ventas, CRM y SaaS operativo.",
};

export default function BlogPage() {
  return (
    <section className="w-full py-28 md:py-36">
      <Container className="flex flex-col gap-12">
        <Header>Blog NELVYON</Header>
        <p className="-tracking-xs max-w-2xl text-base leading-6 text-white/75">
          Recursos por área de operación. Publicamos cuando hay contenido útil; hasta entonces,
          cada categoría muestra su estado de preparación.
        </p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {nelvyonBlogCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl border border-white/10 bg-[#07111F] p-6"
            >
              <h3 className="text-lg font-medium text-[#0084FF]">{cat.label}</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">{cat.description}</p>
              <p className="mt-4 rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white/55">
                Próximamente — estamos preparando contenido en esta categoría.
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
