import { ServicePackDetail } from "@/features/packs/ServicePackDetail";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ");
  return {
    title: `${title} · NELVYON Packs`,
  };
}

export default async function PackDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ServicePackDetail slug={slug} />;
}
