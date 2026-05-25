import type { ReactNode } from "react";

import { FeedbackButton, NpsWidget } from "@/components/feedback";

export const dynamic = "force-dynamic";

export default function SaasDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <NpsWidget />
      <FeedbackButton />
    </>
  );
}
