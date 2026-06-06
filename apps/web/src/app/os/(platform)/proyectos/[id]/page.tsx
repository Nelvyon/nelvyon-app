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
  return <OsProjectDetailView projectId={id} />;
}
