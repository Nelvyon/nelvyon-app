"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

export type FeaturedTemplateMeta = {
  id: string;
  name: string;
  headline: string;
  description: string;
  preview_url: string;
  envato_id: string;
};

export function FeaturedEnvatoTemplateCard({
  template,
  onImported,
}: {
  template: FeaturedTemplateMeta;
  onImported?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importTemplate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-template", template_id: template.id }),
      });
      const d = (await res.json()) as { page?: { id: string }; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Error al importar");
      onImported?.();
      if (d.page?.id) router.push(`/saas/web-builder/${d.page.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <NelvyonDsCard className="overflow-hidden border-[#0084ff]/30 bg-gradient-to-br from-[#0084ff]/10 to-transparent">
      <div className="grid gap-0 md:grid-cols-2">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[280px] bg-[#0a1628]">
          <Image
            src={template.preview_url}
            alt={template.name}
            fill
            className="object-cover object-top"
            unoptimized
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Envato #{template.envato_id}
          </span>
        </div>
        <div className="flex flex-col justify-center p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]">Plantilla premium oficial</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">{template.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{template.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{template.headline}</p>
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <NelvyonDsButton disabled={loading} onClick={() => void importTemplate()}>
              {loading ? "Importando…" : "Importar en 1 clic →"}
            </NelvyonDsButton>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Licencia Envato Market · Adaptación oficial Nelvyon · Lista para publicar
          </p>
        </div>
      </div>
    </NelvyonDsCard>
  );
}
