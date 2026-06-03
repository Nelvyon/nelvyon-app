import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { nelvyonBlogCategories } from "@/config/nelvyon-marketing-pages";
import { blog } from "@/lib/pa/source";

export const metadata: Metadata = {
  title: "Blog | NELVYON",
  description: "Recursos sobre IA, automatización, marketing, ventas, CRM y SaaS operativo.",
};

const CATEGORY_LABEL_MAP: Record<string, string[]> = {
  ia: ["IA", "Inteligencia"],
  automatizacion: ["Automatización", "Operaciones"],
  marketing: ["Marketing", "Plataforma"],
  ventas: ["Ventas"],
  crm: ["CRM", "Operaciones"],
  saas: ["SaaS", "Plataforma"],
};

const MIN_POSTS_FOR_LISTING = 2;

export default function BlogPage() {
  const posts = [...blog.getPages()].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const postsByCategory = (categoryId: string) => {
    const labels = CATEGORY_LABEL_MAP[categoryId] ?? [];
    return posts.filter((post) =>
      post.data.labels?.some((l) => labels.some((lb) => l.name.toLowerCase().includes(lb.toLowerCase()))),
    );
  };

  return (
    <section className="w-full py-28 md:py-36">
      <Container className="flex flex-col gap-12">
        <Header>Blog NELVYON</Header>
        <p className="text-muted-foreground -tracking-xs max-w-2xl text-base leading-6">
          Recursos por área de operación digital. Publicamos cuando hay contenido útil; las
          categorías sin artículos muestran estado «Próximamente».
        </p>

        {posts.length >= MIN_POSTS_FOR_LISTING ? (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-white">Últimas publicaciones</h2>
            <div className="grid grid-cols-1 gap-4">
              {posts.map((post) => (
                <Link
                  key={post.url}
                  href={post.url}
                  className="rounded-2xl border border-white/10 bg-[#020817] p-5 text-white transition hover:border-[#0084FF]/40"
                >
                  <h3 className="text-xl font-semibold">{post.data.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{post.data.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {nelvyonBlogCategories.map((cat) => {
            const catPosts = postsByCategory(cat.id);
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-white/10 bg-[#020817] p-6"
              >
                <h3 className="text-lg font-medium text-[#0084FF]">{cat.label}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">{cat.description}</p>
                {catPosts.length > 0 ? (
                  <ul className="mt-4 flex flex-col gap-2">
                    {catPosts.map((post) => (
                      <li key={post.url}>
                        <Link href={post.url} className="text-sm text-white hover:text-[#0084FF]">
                          {post.data.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    Próximamente — estamos preparando contenido en esta categoría.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
