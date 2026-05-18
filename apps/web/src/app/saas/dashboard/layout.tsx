import type { ReactNode } from "react";

import { FeedbackButton, NpsWidget } from "@/components/feedback";

export default function SaasDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <NpsWidget />
      <FeedbackButton />
    </>
  );
}
