import { OsTaskDetailView } from "@/features/os-shell/tareas/OsTaskDetailView";

export const metadata = {
  title: "Tarea · NELVYON OS",
};

export default async function OsTareaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OsTaskDetailView taskId={Number(id)} />;
}
