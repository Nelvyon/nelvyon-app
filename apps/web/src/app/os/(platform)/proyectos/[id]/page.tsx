import { OsProjectDetailView } from "@/features/os-shell/projects/OsProjectDetailView";

export const metadata = {
  title: "Proyecto · NELVYON OS",
};

export default async function OsProyectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return <p className="p-8 text-white">ID de proyecto inválido</p>;
  }
  return <OsProjectDetailView projectId={projectId} />;
}
