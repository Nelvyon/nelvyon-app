"use client";

import { useEffect, useState } from "react";

import type { UsageSummary } from "@/types/usage";

export function useUsage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage/summary", { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: UsageSummary) => setUsage(data))
      .catch(() => setUsage(null))
      .finally(() => setLoading(false));
  }, []);

  return { usage, loading };
}
