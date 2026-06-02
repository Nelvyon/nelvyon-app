import { Container } from "@/components/pa/container";
import { getMDXComponents } from "@/mdx-components-pa";
import Link from "next/link";
import { Button } from "@/components/pa/button";

import type { blog } from "@/lib/pa/source";

type BlogPage = NonNullable<ReturnType<typeof blog.getPage>>;

export const Content = ({ page }: { page: BlogPage }) => {
  const Mdx = page.data.body;

  return (
    <section className="w-full">
      <Container className="relative grid w-full grid-cols-1 lg:grid-cols-10">
        <div className="hidden lg:flex sticky top-10 col-span-4 h-full max-h-[calc(100vh-80px)] flex-col justify-between">
          <div className="flex flex-col gap-4">
            {page.data.toc.map((item, index) => {
              return (
                <Link
                  key={item.url}
                  href={item.url}
                  className="_bg-[#F7F7F7] border-natural-black/10 flex w-full max-w-96 items-center gap-2 rounded-lg border px-4 py-4"
                >
                  <div className="-tracking-sm text-muted-foreground line-clamp-1 shrink-0 font-mono text-lg leading-7 font-medium tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="-tracking-sm line-clamp-1 text-lg leading-7 font-medium">
                    {item.title}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="bg-secondary flex w-full max-w-115 flex-col items-start justify-start gap-8 overflow-hidden rounded-3xl px-6 py-8">
            <div className="flex flex-col items-start justify-start gap-3 self-stretch">
              <div className="flex flex-col items-start justify-start gap-6 self-stretch">
                <div className="-tracking-xs text-2xl leading-8 font-medium">
                  Necesitas ejecutar marketing y operacion sin caos?
                </div>
              </div>
              <div className="text-muted-foreground -tracking-xs text-base leading-6 font-medium">
                NELVYON integra estrategia, servicios y plataforma para pasar de
                ideas a ejecucion sostenible.
              </div>
            </div>
            <div>
              <Button />
            </div>
          </div>
        </div>
        <div className="prose lg:col-span-6 mx-auto max-w-none min-w-0">
          <Mdx components={getMDXComponents()} />
        </div>
      </Container>
    </section>
  );
};

