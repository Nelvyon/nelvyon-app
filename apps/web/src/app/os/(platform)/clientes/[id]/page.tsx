import { OsClientDetailView } from "@/features/os-shell/clients/OsClientDetailView";

export const metadata = {
  title: "Cliente · NELVYON OS",
};

export default async function OsClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OsClientDetailView clientId={id} />;
}
