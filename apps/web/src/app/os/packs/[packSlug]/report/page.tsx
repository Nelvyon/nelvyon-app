"use client";

import { notFound } from "next/navigation";
import { use } from "react";

import { PackReportDashboard } from "@/features/packs/PackReportDashboard";
import { PACK_REGISTRY } from "@/lib/packs/packRegistry";
import type { PackId } from "@/lib/packs/types";

function resolvePackIdFromSlug(packSlug: string): PackId | null {
  for (const meta of Object.values(PACK_REGISTRY)) {
    const slug = meta.kickoffPath.replace(/^\/os\/packs\//, "").split("?")[0];
    if (slug === packSlug) return meta.id;
  }
  return null;
}

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
