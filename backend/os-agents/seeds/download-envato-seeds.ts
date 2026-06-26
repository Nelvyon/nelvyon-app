#!/usr/bin/env npx tsx
/**
 * download-envato-seeds.ts — Descarga 50 items × 10 sectores TOP_10 de Envato Elements.
 * Requiere: ENVATO_ELEMENTS_TOKEN (Bearer token de la API de Envato Elements).
 *
 * Uso:
 *   ENVATO_ELEMENTS_TOKEN=xxx npx tsx backend/os-agents/seeds/download-envato-seeds.ts
 *
 * Sectores objetivo (TOP_10 — 50 items cada uno, 500 total):
 *   dental, legal, fitness, beauty, restaurant, real_estate,
 *   ecommerce, solar, coaching, saas_b2b
 *
 * Output (ZIPs gitignored): backend/data/envato-seeds/{sector}/{item_id}.zip
 * Output (metadata commiteable): backend/data/envato-seeds-metadata.json
 *
 * API docs: https://elements.envato.com/api/reference
 * Requires: Professional or Unlimited subscription for API access.
 */

import { createWriteStream, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, "../../data/envato-seeds");
const METADATA_FILE = join(__dir, "../../data/envato-seeds-metadata.json");
const API_BASE = "https://elements.envato.com/api";
const TOKEN = process.env.ENVATO_ELEMENTS_TOKEN?.trim();

const ITEMS_PER_SECTOR = 50;

const SECTORS: Array<{ id: string; label: string; query: string; category: string }> = [
  { id: "dental",      label: "Clínicas Dentales",      query: "dental clinic teeth",        category: "website-templates" },
  { id: "legal",       label: "Despachos Legales",       query: "law firm legal attorney",    category: "website-templates" },
  { id: "fitness",     label: "Gimnasios / Fitness",     query: "gym fitness sport wellness", category: "website-templates" },
  { id: "beauty",      label: "Estética & Belleza",      query: "beauty salon spa cosmetic",  category: "website-templates" },
  { id: "restaurant",  label: "Restaurantes",            query: "restaurant food cafe",       category: "website-templates" },
  { id: "real_estate", label: "Inmobiliarias",           query: "real estate property realty",category: "website-templates" },
  { id: "ecommerce",   label: "eCommerce",               query: "shop store ecommerce",       category: "website-templates" },
  { id: "solar",       label: "Energía Solar",           query: "solar energy green power",   category: "website-templates" },
  { id: "coaching",    label: "Coaching & Mentoring",    query: "coaching consultant mentor",  category: "website-templates" },
  { id: "saas_b2b",   label: "SaaS B2B",               query: "saas software app dashboard", category: "website-templates" },
];

interface EnvatoSearchResult {
  total_count: number;
  items: Array<{
    id: string;
    name: string;
    description: string;
    previews?: { icon_with_landscape_preview?: { landscape_url: string } };
    attributes?: Record<string, unknown>;
  }>;
}

interface EnvatoDownloadResult {
  download_url: string;
}

interface MetadataEntry {
  id: string;
  sector: string;
  source: "envato" | "synthetic";
  headline: string;
  meta_title: string;
  cta_label: string;
  chatbot_greeting: string;
  downloaded_at: string | null;
  envato_id: string | null;
  preview_url?: string | null;
}

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
    },
    signal,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Envato API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function downloadZip(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  if (!res.body) throw new Error("Empty response body");
  await pipeline(Readable.fromWeb(res.body as import("stream/web").ReadableStream), createWriteStream(dest));
}

async function downloadSector(
  sector: (typeof SECTORS)[number],
  metadata: MetadataEntry[],
  perSector: number = ITEMS_PER_SECTOR,
): Promise<void> {
  const dir = join(OUTPUT_DIR, sector.id);
  mkdirSync(dir, { recursive: true });

  console.log(`\n[${sector.label}] Buscando ${perSector} items…`);

  const searchParams = new URLSearchParams({
    q: sector.query,
    page_size: String(perSector),
    page: "1",
    category: sector.category,
    sort_by: "downloads",
  });

  const results = await apiFetch<EnvatoSearchResult>(`/catalog/search?${searchParams}`);
  const items = results.items ?? [];
  console.log(`  Found ${results.total_count} total, processing ${items.length}…`);

  for (const item of items) {
    const existingEntry = metadata.find((m) => m.envato_id === item.id && m.sector === sector.id);
    try {
      const dl = await apiFetch<EnvatoDownloadResult>(`/items/${item.id}/download`);
      const dest = join(dir, `${item.id}.zip`);
      await downloadZip(dl.download_url, dest);
      const downloadedAt = new Date().toISOString();
      console.log(`  ✅ ${item.id}  ${item.name.slice(0, 50)}`);

      const entry: MetadataEntry = {
        id: `${sector.id}-env-${item.id}`,
        sector: sector.id,
        source: "envato",
        headline: item.name,
        meta_title: `${item.name} — Template ${sector.label}`,
        cta_label: "Ver más",
        chatbot_greeting: `¡Hola! Soy el asistente de {{business_name}}. ¿En qué puedo ayudarte?`,
        downloaded_at: downloadedAt,
        envato_id: item.id,
        preview_url: item.previews?.icon_with_landscape_preview?.landscape_url ?? null,
      };
      if (existingEntry) {
        Object.assign(existingEntry, entry);
      } else {
        metadata.push(entry);
      }

      await new Promise((r) => setTimeout(r, 300)); // Envato rate limit: 5 req/s
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠️  ${item.id}: ${msg.slice(0, 100)}`);
      if (!existingEntry) {
        metadata.push({
          id: `${sector.id}-env-${item.id}`,
          sector: sector.id,
          source: "envato",
          headline: item.name,
          meta_title: `${item.name} — Template ${sector.label}`,
          cta_label: "Ver más",
          chatbot_greeting: `¡Hola! Soy el asistente de {{business_name}}. ¿En qué puedo ayudarte?`,
          downloaded_at: null,
          envato_id: item.id,
        });
      }
    }
  }
}

/** Parse CLI flags: --lite, --sector <id>, --limit <n>. */
function parseArgs(argv: string[]): { lite: boolean; sector: string | null; limit: number | null } {
  let lite = false;
  let sector: string | null = null;
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--lite") lite = true;
    else if (a === "--sector") sector = argv[++i] ?? null;
    else if (a === "--limit") {
      const n = parseInt(argv[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { lite, sector, limit };
}

async function main() {
  const { lite, sector: sectorFilter, limit } = parseArgs(process.argv.slice(2));

  if (!TOKEN) {
    // CI-safe: exit 0 (no throw) — metadata catalog already committed works without ZIPs.
    console.log(
      [
        "ℹ️  ENVATO_ELEMENTS_TOKEN no configurado — modo metadata only.",
        "",
        "El catálogo de 500 seeds (backend/data/envato-seeds-metadata.json) ya está commiteado",
        "y es usable sin ZIPs. Los packs usarán los seeds sintéticos/metadata.",
        "",
        "Para descargar ZIPs reales:",
        "  1. Suscripción Envato Elements (Professional/Unlimited).",
        "  2. Token: https://elements.envato.com/user/settings/api",
        "  3. ENVATO_ELEMENTS_TOKEN=xxx npx tsx backend/os-agents/seeds/download-envato-seeds.ts [--lite] [--sector dental --limit 5]",
      ].join("\n"),
    );
    process.exit(0);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load existing metadata to preserve synthetic entries
  let metadata: MetadataEntry[] = [];
  if (existsSync(METADATA_FILE)) {
    try {
      metadata = JSON.parse(readFileSync(METADATA_FILE, "utf-8")) as MetadataEntry[];
    } catch { metadata = []; }
  }

  // Lite mode: 1 item per sector (pilot). Otherwise ITEMS_PER_SECTOR (or --limit).
  const perSector = lite ? 1 : (limit ?? ITEMS_PER_SECTOR);
  const targets = sectorFilter ? SECTORS.filter((s) => s.id === sectorFilter) : SECTORS;
  if (sectorFilter && targets.length === 0) {
    console.error(`❌ Sector desconocido: ${sectorFilter}. Opciones: ${SECTORS.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`Modo: ${lite ? "LITE (1/sector)" : `${perSector}/sector`}${sectorFilter ? ` · sector=${sectorFilter}` : ""}`);

  for (const sector of targets) {
    await downloadSector(sector, metadata, perSector);
  }

  writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  const downloaded = metadata.filter((m) => m.downloaded_at !== null).length;
  console.log(`\n✅ ${downloaded}/${metadata.length} items con ZIP descargado en ${OUTPUT_DIR}`);
  console.log(`📄 Metadatos actualizados: ${METADATA_FILE}`);

  // Best-effort: sync the registry if a DATABASE_URL is available.
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const { getOsEnvatoSeedService } = await import("./OsEnvatoSeedService");
      const res = await getOsEnvatoSeedService().syncFromMetadataFile();
      console.log(`🗄️  Registry sincronizado: ${res.synced} (insertados ${res.inserted}, actualizados ${res.updated})`);
    } catch (e) {
      console.warn(`⚠️  No se pudo sincronizar el registry: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
