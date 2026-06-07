/** Phase D — HTTP client for controlled autonomous publish (internal operators only) */

import type { OsPublishPayload } from "../types";

export interface OsPublishClientOptions {
  baseUrl: string;
  workspaceId: string | number;
  bearerToken: string;
}

export interface OsPublishApiResponse {
  dry_run: boolean;
  production_enabled: boolean;
  written: boolean;
  qa_score: number;
  created: Array<{
    id: string;
    title: string;
    status: string;
    visibility: string;
    type?: string;
  }>;
  deliverables_preview: Array<Record<string, unknown>>;
  message: string;
}

export async function postOsAutonomousPublish(
  payload: OsPublishPayload,
  options: OsPublishClientOptions,
): Promise<OsPublishApiResponse> {
  const url = `${options.baseUrl.replace(/\/$/, "")}/api/v1/os/autonomous/publish`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.bearerToken}`,
      "X-Workspace-Id": String(options.workspaceId),
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as OsPublishApiResponse & { detail?: string };
  if (!res.ok) {
    const detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body);
    throw new Error(`autonomous publish failed (${res.status}): ${detail}`);
  }
  return body;
}
