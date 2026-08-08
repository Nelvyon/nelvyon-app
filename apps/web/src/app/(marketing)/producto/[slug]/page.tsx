import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ModuleDetailPage, getModule, saasModules } from "@/features/public-web";

type Props = { params: Promise<{ slug: string }> };

/**
 * Slugs de /producto/* que no tienen ficha propia y se resuelven a otra ruta.
 *
 * Antes apuntaban a Homes AIOR (`home-ai-agent.html`, `home-ai-chatbot.html`,
 * `home-productivity-tools.html`, `home-ai-chatbot-tool.html`) que se
 * consolidaron en Home 08 y SaaS 02 y devuelven 404. Ahora apuntan a rutas
 * vigentes de NELVYON: `/saas` (que sirve SaaS 02) para lo generico y el
 * modulo real cuando existe.
 */
const AIOR_SLUG: Record<string, string> = {
  ia: "/saas",
  agentes: "/saas",
  inbox: "/saas/inbox",
  workflows: "/saas/workflows",
  whatsapp: "/saas/whatsapp",
};

export function generateStaticParams() {
  return saasModules.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mod = getModule(slug);
  if (!mod) return {};
  return {
    title: { absolute: mod.seoTitle },
    description: mod.seoDescription,
    alternates: { canonical: `/producto/${mod.slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (AIOR_SLUG[slug]) redirect(AIOR_SLUG[slug]);
  if (!getModule(slug)) notFound();
  return <ModuleDetailPage slug={slug} />;
}
