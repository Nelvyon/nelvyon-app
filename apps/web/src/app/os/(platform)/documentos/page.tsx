import { Suspense } from "react";

import { OsLoadingBlock } from "@/features/os-shell/components/ui/OsUi";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsDocumentosView } from "@/features/os-shell/documents/OsDocumentosView";

export const metadata = {
  title: "Documentos · NELVYON OS",
};

export default function OsDocumentosPage() {
  return (
    <Suspense
      fallback={
        <OsShellLayout>
          <OsLoadingBlock />
        </OsShellLayout>
      }
    >
      <OsDocumentosView />
    </Suspense>
  );
}
