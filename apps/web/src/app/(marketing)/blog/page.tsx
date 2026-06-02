import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { blog } from "@/lib/pa/source";

export const metadata: Metadata = {
  title: "Blog | NELVYON",
  description: "Guías y reflexiones sobre automatización, campañas, CRM, contenido y reporting.",
};

export default function BlogPage() {
  const posts = [...blog.getPages()].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  return (
    <section className="w-full py-28 md:py-36">
      <Container className="flex flex-col gap-10">
        <Header>Blog NELVYON</Header>
        {posts.length === 0 ? (
          <p className="text-base text-slate-300">
            Publicaremos guías y reflexiones sobre automatización, campañas, CRM y reporting.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {posts.map((post) => (
            <Link
              key={post.url}
              href={post.url}
              className="rounded-2xl border border-white/10 bg-[#020817] p-5 text-white transition hover:border-white/25"
            >
              <h2 className="text-xl font-semibold">{post.data.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{post.data.description}</p>
            </Link>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
