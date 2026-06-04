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
  const clientId = Number(id);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return <p className="p-8 text-white">ID de cliente inválido</p>;
  }
  return <OsClientDetailView clientId={clientId} />;
}
