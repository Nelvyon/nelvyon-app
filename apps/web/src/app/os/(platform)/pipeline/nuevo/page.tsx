import { Suspense } from "react";

import { OsLoadingBlock } from "@/features/os-shell/components/ui/OsUi";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsDealCreateView } from "@/features/os-shell/pipeline/OsDealCreateView";

export const metadata = {
  title: "Nueva oportunidad · NELVYON OS",
};

export default function OsPipelineNuevoPage() {
  return (
    <Suspense
      fallback={
        <OsShellLayout>
          <OsLoadingBlock />
        </OsShellLayout>
      }
    >
      <OsDealCreateView />
    </Suspense>
  );
}
