import { Suspense } from "react";

import { OsLoadingBlock } from "@/features/os-shell/components/ui/OsUi";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsProjectCreateView } from "@/features/os-shell/projects/OsProjectCreateView";

export const metadata = {
  title: "Nuevo proyecto · NELVYON OS",
};

export default function OsProyectoNuevoPage() {
  return (
    <Suspense
      fallback={
        <OsShellLayout>
          <OsLoadingBlock />
        </OsShellLayout>
      }
    >
      <OsProjectCreateView />
    </Suspense>
  );
}
