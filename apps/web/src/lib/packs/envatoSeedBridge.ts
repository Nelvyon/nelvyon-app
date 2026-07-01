/**
 * Envato seed bridge — reads committed metadata catalog for pack deliverables.
 * Priority: on-disk ZIP JSON > envato-seeds-metadata.json > synthetic sectorSeeds.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { SectorSeed } from "./sectorSeeds";

type MetadataEntry = {
  id: string;
  sector: string;
  source: "envato" | "synthetic";
  headline: string;
  meta_title: string;
  cta_label: string;
  chatbot_greeting: string;
};

function metadataPath(): string {
  return path.join(process.cwd(), "backend", "data", "envato-seeds-metadata.json");
}

function onDiskDir(sector: string): string {
  return path.join(process.cwd(), "backend", "data", "envato-seeds", sector);
}

export function loadEnvatoSectorSeed(sectorId: string, index: number): SectorSeed | null {
  const diskDir = onDiskDir(sectorId);
  if (fs.existsSync(diskDir)) {
    try {
      const files = fs.readdirSync(diskDir).filter((f) => f.endsWith(".json"));
      const file = files[index];
      if (file) {
        const raw = JSON.parse(fs.readFileSync(path.join(diskDir, file), "utf8")) as Record<string, unknown>;
        return metadataToSeed(sectorId, {
          id: String(raw.id ?? file.replace(".json", "")),
          sector: sectorId,
          source: "envato",
          headline: String(raw.headline ?? raw.name ?? ""),
          meta_title: String(raw.meta_title ?? raw.title ?? ""),
          cta_label: String(raw.cta_label ?? "Ver más"),
          chatbot_greeting: String(raw.chatbot_greeting ?? "¡Hola! ¿En qué puedo ayudarte?"),
        });
      }
    } catch {
      /* fall through */
    }
  }

  const metaFile = metadataPath();
  if (!fs.existsSync(metaFile)) return null;
  try {
    const entries = JSON.parse(fs.readFileSync(metaFile, "utf8")) as MetadataEntry[];
    const sectorEntries = entries
      .filter((e) => e.sector === sectorId && e.headline)
      .sort((a, b) => {
        const ae = a.source === "envato" ? 0 : 1;
        const be = b.source === "envato" ? 0 : 1;
        return ae - be;
      });
    const entry = sectorEntries[index];
    if (!entry) return null;
    return metadataToSeed(sectorId, entry);
  } catch {
    return null;
  }
}

function metadataToSeed(sectorId: string, e: MetadataEntry): SectorSeed {
  return {
    seed_id: e.id,
    sector: sectorId,
    source: e.source === "envato" ? "envato" : "synthetic",
    prompt:
      `Genera contenido de marketing para el sector ${sectorId} inspirado en el template Envato ` +
      `"${e.headline}". Meta: ${e.meta_title}. CTA: ${e.cta_label}. Tono profesional, localizado es-ES.`,
    output_schema: { fields: ["landing_headline", "meta_title", "meta_desc", "chatbot_greeting", "blog_h1_ideas", "cta_text"] },
    landing_headline: e.headline,
    landing_subheadline: e.meta_title,
    meta_title: e.meta_title,
    meta_desc: e.meta_title,
    chatbot_greeting: e.chatbot_greeting,
    blog_h1_ideas: [e.headline, e.meta_title].filter(Boolean),
  };
}
