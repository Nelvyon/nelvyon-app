import Link from "next/link";

import { getMDXComponents } from "@/mdx-components-pa";

import type { blog } from "@/lib/pa/source";

type BlogPage = NonNullable<ReturnType<typeof blog.getPage>>;

/** Cuerpo de artículo blog — piel AIOR blanca, sin shell PA oscuro. */
export function AiorBlogContent({ page }: { page: BlogPage }) {
  const Mdx = page.data.body;
  const toc = page.data.toc ?? [];

  return (
    <div className="row gy-4">
      {toc.length > 0 ? (
        <aside className="col-lg-4 d-none d-lg-block">
          <div
            style={{
              position: "sticky",
              top: 96,
              padding: 20,
              borderRadius: 16,
              border: "1px solid #E0E0E0",
              background: "#fff",
            }}
          >
            <span className="sub-title style3">Índice</span>
            <nav aria-label="Índice del artículo">
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {toc.map((item, index) => (
                  <li key={item.url} style={{ marginBottom: 10 }}>
                    <Link href={item.url} style={{ color: "#06050B", textDecoration: "none", fontSize: 14 }}>
                      <span style={{ color: "#0084FF", fontWeight: 600, marginRight: 8 }}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 12,
                background: "#F4F7FF",
              }}
            >
              <p className="mb-2" style={{ fontWeight: 600, color: "#06050B" }}>
                ¿Quiere operar con NELVYON?
              </p>
              <p style={{ fontSize: 14, color: "#484848" }}>
                SaaS B2B y agencia con precios separados. Sin testimonios inventados.
              </p>
              <Link href="/contacto" className="th-btn2 btn-gradient2 d-inline-block mt-2">
                Contactar
              </Link>
            </div>
          </div>
        </aside>
      ) : null}
      <div className={toc.length > 0 ? "col-lg-8" : "col-12"}>
        <article
          className="nv-aior-blog-prose"
          style={{ color: "#484848", lineHeight: 1.75, fontSize: 16 }}
        >
          <Mdx components={getMDXComponents()} />
        </article>
        <style>{`
          .nv-aior-blog-prose h2 { color: #06050B; margin-top: 2rem; font-size: 1.35rem; font-weight: 700; }
          .nv-aior-blog-prose h3 { color: #06050B; margin-top: 1.5rem; font-size: 1.15rem; font-weight: 600; }
          .nv-aior-blog-prose a { color: #0084FF; }
          .nv-aior-blog-prose ul, .nv-aior-blog-prose ol { padding-left: 1.25rem; }
          .nv-aior-blog-prose p { margin-bottom: 1rem; }
          .nv-aior-blog-prose strong { color: #06050B; }
        `}</style>
      </div>
    </div>
  );
}
