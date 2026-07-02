/** Load template registry from JSON (isolated, filesystem only) */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { TemplateRegistry } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REGISTRY_PATH = join(__dirname, "registry.json");

function resolveRegistryPath(path?: string): string {
  const candidates = [
    path,
    DEFAULT_REGISTRY_PATH,
    join(process.cwd(), "backend/autonomous/templates/registry.json"),
    join(process.cwd(), "../backend/autonomous/templates/registry.json"),
    join(process.cwd(), "../../backend/autonomous/templates/registry.json"),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return path ?? DEFAULT_REGISTRY_PATH;
}

export function loadTemplateRegistry(path?: string): TemplateRegistry {
  const resolved = resolveRegistryPath(path);
  const raw = JSON.parse(readFileSync(resolved, "utf-8")) as TemplateRegistry;
  if (!raw.version || !Array.isArray(raw.templates)) {
    throw new Error("registry.json inválido: falta version o templates");
  }
  return raw;
}
