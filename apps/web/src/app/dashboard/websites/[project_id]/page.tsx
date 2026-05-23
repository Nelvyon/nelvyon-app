"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { landingApi, osWebApi } from "@/features/builders/api";
import { BlockRenderer } from "@/features/builders/components/BlockRenderer";
import { StatusBadge } from "@/features/builders/components/DashboardUi";
import type { LandingBlock, WebProject } from "@/features/builders/types";

export default function WebsiteEditorPage() {
  const params = useParams<{ project_id: string }>();
  const id = params?.project_id ?? "";
  const [project, setProject] = useState<WebProject | null>(null);
  const [previewBlocks, setPreviewBlocks] = useState<LandingBlock[]>([]);

  useEffect(() => {
    if (!id) return;
    osWebApi.get(id).then(setProject).catch(() => setProject(null));
  }, [id]);

  async function loadPreview(lpId?: string) {
    if (!lpId) return;
    const page = await landingApi.get(lpId);
    setPreviewBlocks(page.blocks ?? []);
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="text-sm text-muted-foreground" href="/dashboard/websites">
              ← Webs
            </Link>
            <h1 className="text-2xl font-bold">{project?.name ?? "Editor"}</h1>
            {project ? <StatusBadge status={project.status} /> : null}
          </div>
          <Button
            disabled={project?.status !== "ready"}
            onClick={() => osWebApi.publish(id).then(() => osWebApi.get(id).then(setProject))}
          >
            Publicar todo
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="font-semibold">Páginas</h2>
            {(project?.pages ?? []).map((page) => (
              <div className="flex items-center justify-between rounded-lg border p-3" key={page.id}>
                <div>
                  <p className="font-medium">{page.page_type}</p>
                  <p className="text-xs text-muted-foreground">/{page.page_slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => loadPreview(page.landing_page_id)} size="sm" variant="outline">
                    Preview
                  </Button>
                  <Button
                    onClick={() =>
                      osWebApi.updatePage(id, page.id, { regenerate: true }).then(() => osWebApi.get(id).then(setProject))
                    }
                    size="sm"
                  >
                    Regenerar IA
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <h2 className="mb-4 font-semibold">Vista previa</h2>
            <BlockRenderer blocks={previewBlocks} />
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
