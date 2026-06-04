import { Suspense } from "react";

import { OsLoadingBlock } from "@/features/os-shell/components/ui/OsUi";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsTaskCreateView } from "@/features/os-shell/tareas/OsTaskCreateView";

export const metadata = {
  title: "Nueva tarea · NELVYON OS",
};

export default function OsTareasNuevoPage() {
  return (
    <Suspense
      fallback={
        <OsShellLayout>
          <OsLoadingBlock />
        </OsShellLayout>
      }
    >
      <OsTaskCreateView />
    </Suspense>
  );
}
