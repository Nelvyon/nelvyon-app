"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense } from "react";

import { SkeletonMetricGrid } from "@/features/dashboard/components/EliteUi";

function DashboardLoadingFallback() {
  return (
    <div className="space-y-6 py-2">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <SkeletonMetricGrid count={4} />
      <motion.div animate={{ opacity: 1 }} className="h-64 animate-pulse rounded-xl bg-muted" initial={{ opacity: 0.5 }} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          initial={{ opacity: 0, y: 8 }}
          key={pathname}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}
