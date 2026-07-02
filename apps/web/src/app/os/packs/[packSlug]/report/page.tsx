"use client";

import { notFound } from "next/navigation";
import { use } from "react";

import { PackReportDashboard } from "@/features/packs/PackReportDashboard";
import { resolvePackIdFromSlug } from "@/lib/packs/resolvePackSlug";

export default function OsPackReportPage({
  params,
}: {
  params: Promise<{ packSlug: string }>;
}) {
  const { packSlug } = use(params);
  const packId = resolvePackIdFromSlug(packSlug);
  if (!packId) notFound();
  return <PackReportDashboard packId={packId} />;
}
