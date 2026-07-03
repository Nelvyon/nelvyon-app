/** Load template registry — production uses bundled JSON only (no FS dependency). */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import bundledRegistry from "./registry.json";
import type { TemplateRegistry } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REGISTRY_PATH = join(__dirname, "registry.json");

function validateRegistry(raw: TemplateRegistry): TemplateRegistry {
  if (!raw.version || !Array.isArray(raw.templates)) {
    throw new Error("registry.json inválido: falta version o templates");
  }
  return raw;
}

function readRegistryFile(filePath: string): TemplateRegistry | null {
  try {
    if (!existsSync(filePath)) return null;
    return validateRegistry(JSON.parse(readFileSync(filePath, "utf-8")) as TemplateRegistry);
  } catch {
    return null;
  }
}

function registryPathCandidates(explicit?: string): string[] {
  return [
    explicit,
    DEFAULT_REGISTRY_PATH,
    join(process.cwd(), "backend/autonomous/templates/registry.json"),
    join(process.cwd(), "../backend/autonomous/templates/registry.json"),
    join(process.cwd(), "../../backend/autonomous/templates/registry.json"),
  ].filter((p): p is string => Boolean(p));
}

export function loadTemplateRegistry(path?: string): TemplateRegistry {
  // Railway/Next production: webpack bundles registry.json — never touch disk.
  if (process.env.NODE_ENV === "production" && !path) {
    return validateRegistry(bundledRegistry as TemplateRegistry);
  }

  for (const candidate of registryPathCandidates(path)) {
    const loaded = readRegistryFile(candidate);
    if (loaded) return loaded;
  }

  return validateRegistry(bundledRegistry as TemplateRegistry);
}

export function getBundledTemplateRegistryCount(): number {
  const reg = bundledRegistry as TemplateRegistry;
  return Array.isArray(reg.templates) ? reg.templates.length : 0;
}
