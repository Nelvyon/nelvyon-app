#!/usr/bin/env npx tsx
/**
 * download-envato-seeds.ts — Descarga 50 ZIPs reales de Envato Elements.
 * Requiere: ENVATO_ELEMENTS_TOKEN (Bearer token de la API de Envato Elements).
 *
 * Uso:
 *   ENVATO_ELEMENTS_TOKEN=xxx npx tsx backend/os-agents/seeds/download-envato-seeds.ts
 *
 * Sectores objetivo (top 3):
 *   1. restaurantes  — Wordpress themes + HTML templates
 *   2. clinicas      — Health & medical templates
 *   3. ecommerce     — eCommerce themes/templates
 *
 * Output: backend/data/envato-seeds/{sector}/{item_id}.zip
 *
 * API docs: https://elements.envato.com/api/reference
 * Requires: Professional or Unlimited subscription for API access.
 */

import { createWriteStream, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, "../../data/envato-seeds");
const API_BASE = "https://elements.envato.com/api";
const TOKEN = process.env.ENVATO_ELEMENTS_TOKEN?.trim();

const SECTORS: Array<{ id: string; label: string; query: string; category: string }> = [
  { id: "restaurantes", label: "Restaurantes & Hostelería", query: "restaurant", category: "website-templates" },
  { id: "clinicas", label: "Clínicas & Salud", query: "medical clinic health", category: "website-templates" },
  { id: "ecommerce", label: "eCommerce", query: "shop store ecommerce", category: "website-templates" },
];

const ITEMS_PER_SECTOR = Math.ceil(50 / SECTORS.length); // ~17 per sector

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

async function downloadSector(sector: (typeof SECTORS)[number], total: { count: number }): Promise<void> {
  const dir = join(OUTPUT_DIR, sector.id);
  mkdirSync(dir, { recursive: true });

  console.log(`\n[${sector.label}] Buscando ${ITEMS_PER_SECTOR} items…`);

  // Search Envato Elements catalog
  const searchParams = new URLSearchParams({
    q: sector.query,
    page_size: String(ITEMS_PER_SECTOR),
    page: "1",
    category: sector.category,
    sort_by: "downloads",
  });

  const results = await apiFetch<EnvatoSearchResult>(`/catalog/search?${searchParams}`);
  const items = results.items ?? [];
  console.log(`  Found ${results.total_count} total, downloading ${items.length}…`);

  for (const item of items) {
    try {
      // Get download URL for each item
      const dl = await apiFetch<EnvatoDownloadResult>(`/items/${item.id}/download`);
      const dest = join(dir, `${item.id}.zip`);
      await downloadZip(dl.download_url, dest);
      console.log(`  ✅ ${item.id}  ${item.name.slice(0, 50)}`);
      total.count++;
      // Envato rate limit: 5 req/s
      await new Promise((r) => setTimeout(r, 300));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠️  ${item.id}: ${msg.slice(0, 100)}`);
    }
  }
}

async function main() {
  if (!TOKEN) {
    console.error(
      [
        "❌ ENVATO_ELEMENTS_TOKEN no configurado.",
        "",
        "Para descargar ZIPs reales de Envato Elements:",
        "  1. Necesitas una suscripción Envato Elements (Professional o Unlimited).",
        "  2. Genera un Personal API Token en: https://elements.envato.com/user/settings/api",
        "  3. Ejecuta: ENVATO_ELEMENTS_TOKEN=your_token npx tsx backend/os-agents/seeds/download-envato-seeds.ts",
        "",
        "Sin el token, los packs usarán las semillas sintéticas de generate.mjs.",
      ].join("\n"),
    );
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const total = { count: 0 };

  for (const sector of SECTORS) {
    await downloadSector(sector, total);
  }

  console.log(`\n✅ Descargados ${total.count} ZIPs en ${OUTPUT_DIR}`);
  if (total.count < 50) {
    console.warn(`⚠️  Solo ${total.count}/50 ZIPs descargados — algunos items pueden no estar disponibles para tu suscripción.`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
