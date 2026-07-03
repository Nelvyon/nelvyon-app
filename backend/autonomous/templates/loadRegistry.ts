/** Load template registry — bundled JSON fallback for production containers. */

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
  if (path && existsSync(path)) {
    return validateRegistry(JSON.parse(readFileSync(path, "utf-8")) as TemplateRegistry);
  }

  const resolved = resolveRegistryPath(path);
  if (existsSync(resolved)) {
    return validateRegistry(JSON.parse(readFileSync(resolved, "utf-8")) as TemplateRegistry);
  }

  return validateRegistry(bundledRegistry as TemplateRegistry);
}
