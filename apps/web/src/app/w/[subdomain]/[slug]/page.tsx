/**
 * Public web page SSR: /w/[subdomain]/[slug]
 * Fetches published_html from API and renders it.
 */
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ subdomain: string; slug: string }> };

export default async function PublicWebPage({ params }: Props) {
  const { subdomain, slug } = await params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let html: string | null = null;
  try {
    const res = await fetch(
      `${appUrl}/api/public/site/${encodeURIComponent(subdomain)}/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      html = await res.text();
    }
  } catch {
    // fall through to notFound
  }

  if (!html) notFound();

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="min-h-screen"
    />
  );
}
