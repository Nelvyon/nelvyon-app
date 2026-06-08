/** Load template registry from JSON (isolated, filesystem only) */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { TemplateRegistry } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REGISTRY_PATH = join(__dirname, "registry.json");

export function loadTemplateRegistry(path: string = DEFAULT_REGISTRY_PATH): TemplateRegistry {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as TemplateRegistry;
  if (!raw.version || !Array.isArray(raw.templates)) {
    throw new Error("registry.json inválido: falta version o templates");
  }
  return raw;
}
