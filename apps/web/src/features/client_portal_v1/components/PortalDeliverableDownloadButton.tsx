"use client";

import { useState } from "react";

import { Button } from "@/core/ui/button";
import { downloadPortalDeliverable } from "@/features/client_portal_v1/download";

export function PortalDeliverableDownloadButton({
  deliverableId,
  title,
}: {
  deliverableId: string;
  title: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      await downloadPortalDeliverable(deliverableId, title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void handleDownload()}>
        {loading ? "Preparing download…" : "Download file"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
