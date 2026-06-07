/** Phase G — prepare restaurant landing pilot payload for controlled OS staging publish */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { OsPublishPayload } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTONOMOUS_ROOT = join(__dirname, "..");

export interface PhaseGStagingRefs {
  client_id: string;
  project_id: string;
  workspace_id: number;
  project_slug?: string;
}

export const PHASE_G_PILOT = {
  client_name: "La Brasa del Raval",
  project_name: "Landing Reserva Directa",
  project_slug: "LANDING-RESERVA-DIRECTA",
  sector: "restaurant" as const,
  sku: "landing" as const,
};

export const DEFAULT_PHASE_F_PAYLOAD = join(
  AUTONOMOUS_ROOT,
  "output",
  "phase-f",
  "restaurant-landing",
  "osPublishPayload.json",
);

export function isAutonomousProductionEnabled(): boolean {
  const raw = (process.env.AUTONOMOUS_PRODUCTION ?? "false").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

export function resolvePhaseGDryRun(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return !isAutonomousProductionEnabled();
}

export function preparePhaseGStagingPayload(
  basePayload: OsPublishPayload,
  refs: PhaseGStagingRefs,
  options?: { dry_run?: boolean },
): OsPublishPayload {
  const dryRun = resolvePhaseGDryRun(options?.dry_run);

  return {
    ...basePayload,
    dry_run: dryRun,
    sector: PHASE_G_PILOT.sector,
    sku: PHASE_G_PILOT.sku,
    os_refs: {
      client_id: refs.client_id,
      project_id: refs.project_id,
      project_slug: refs.project_slug ?? PHASE_G_PILOT.project_slug,
      workspace_id: String(refs.workspace_id),
    },
    note:
      `${basePayload.note ?? ""} | Phase G staging OS controlled publish (dry_run=${dryRun})`.trim(),
  };
}

export function loadPhaseFPublishPayload(payloadPath = DEFAULT_PHASE_F_PAYLOAD): OsPublishPayload {
  const raw = readFileSync(payloadPath, "utf-8");
  return JSON.parse(raw) as OsPublishPayload;
}

export function loadPhaseGStagingRefsFromEnv(): PhaseGStagingRefs {
  const client_id = process.env.OS_PILOT_CLIENT_ID?.trim();
  const project_id = process.env.OS_PILOT_PROJECT_ID?.trim();
  const workspaceRaw = process.env.OS_PILOT_WORKSPACE_ID?.trim() ?? "1";

  if (!client_id || !project_id) {
    throw new Error(
      "OS_PILOT_CLIENT_ID and OS_PILOT_PROJECT_ID are required for Phase G staging publish",
    );
  }

  return {
    client_id,
    project_id,
    workspace_id: Number(workspaceRaw),
    project_slug: process.env.OS_PILOT_PROJECT_SLUG?.trim() || PHASE_G_PILOT.project_slug,
  };
}
