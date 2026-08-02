import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ModuleDetailPage, getModule, saasModules } from "@/features/public-web";

type Props = { params: Promise<{ slug: string }> };

const AIOR_SLUG: Record<string, string> = {
  ia: "/www/home-ai-agent.html",
  agentes: "/www/home-ai-agent.html",
  inbox: "/www/home-ai-chatbot.html",
  workflows: "/www/home-productivity-tools.html",
  whatsapp: "/www/home-ai-chatbot-tool.html",
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
