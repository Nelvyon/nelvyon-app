import { Container } from "@/components/container";
import { getMDXComponents } from "@/mdx-components";
import { Page } from "fumadocs-core/source";
import { DocCollectionEntry } from "fumadocs-mdx/runtime/server";
import { BlogMetadata } from "@/source.config";
import Link from "next/link";
import { Button } from "@/components/button";

export const Content = ({
  page,
}: {
  page: Page<undefined, DocCollectionEntry<"blogPosts", BlogMetadata>>;
}) => {
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
                  Need a fast moving team of engineers for your startup?
                </div>
              </div>
              <div className="text-muted-foreground -tracking-xs text-base leading-6 font-medium">
                Aceternity is your best bet, we have designers, engineers and
                managers to take your project from 0-1.
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

