import { DbClient } from "../../db/DbClient";
import type { CreativeAsset, CreativeProvider } from "./types";

const IMAGINE_API_BASE = "https://cl.imagineapi.dev";
const KLING_API_BASE = "https://api.klingai.com/v1";
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

const MJ_POLL_MS = 3_000;
const MJ_MAX_MS = 60_000;
const KLING_POLL_MS = 5_000;
const KLING_MAX_MS = 120_000;

/** Env: MIDJOURNEY_API_KEY (ImagineAPI proxy), KLING_API_KEY, OPENAI_API_KEY */

type CreativeRow = {
  id: string;
  user_id: string;
  agent_id: string | null;
  asset_type: string;
  provider: string;
  prompt: string;
  url: string | null;
  status: string;
  metadata: unknown;
  created_at: Date | string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function readObject(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function rowToAsset(r: CreativeRow): CreativeAsset {
  return {
    id: r.id,
    userId: r.user_id,
    agentId: r.agent_id,
    assetType: r.asset_type as CreativeAsset["assetType"],
    provider: r.provider as CreativeProvider,
    prompt: r.prompt,
    url: r.url,
    status: r.status as CreativeAsset["status"],
    metadata: r.metadata,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
  };
}

async function insertCreativeAsset(params: {
  userId: string;
  agentId: string | null;
  assetType: "image" | "video";
  provider: CreativeProvider;
  prompt: string;
  url: string | null;
  status: CreativeAsset["status"];
  metadata: unknown;
}): Promise<CreativeAsset> {
  const rows = await DbClient.getInstance().query<CreativeRow>(
    `INSERT INTO creative_assets (user_id, agent_id, asset_type, provider, prompt, url, status, metadata)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id, user_id, agent_id, asset_type, provider, prompt, url, status, metadata, created_at`,
    [
      params.userId,
      params.agentId,
      params.assetType,
      params.provider,
      params.prompt,
      params.url,
      params.status,
      params.metadata != null ? JSON.stringify(params.metadata) : null,
    ],
  );
  const r = rows[0];
  if (!r) throw new Error("insertCreativeAsset: no row");
  return rowToAsset(r);
}

async function tryMidjourney(prompt: string): Promise<string | null> {
  const key = process.env.MIDJOURNEY_API_KEY?.trim();
  if (!key) return null;

  const createRes = await fetch(`${IMAGINE_API_BASE}/items/images/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });
  if (!createRes.ok) return null;

  const created = (await createRes.json()) as unknown;
  const createdObj = readObject(created);
  const id =
    readString(createdObj?.id) ??
    readString(readObject(createdObj?.data)?.id) ??
    readString(readObject(created)?.id);
  if (!id) return null;

  const started = Date.now();
  while (Date.now() - started < MJ_MAX_MS) {
    const pollRes = await fetch(`${IMAGINE_API_BASE}/items/images/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!pollRes.ok) return null;
    const poll = (await pollRes.json()) as unknown;
    const st = readString(readObject(poll)?.status)?.toLowerCase() ?? "";
    if (st === "completed") {
      const url = readString(readObject(poll)?.url);
      if (url) return url;
      return null;
    }
    if (st === "failed") return null;
    await sleep(MJ_POLL_MS);
  }
  return null;
}

async function tryDalle(prompt: string): Promise<{ url: string; revised?: string } | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as unknown;
  const data = readObject(body)?.data;
  const first = Array.isArray(data) ? readObject(data[0]) : null;
  const url = first ? readString(first.url) : null;
  if (!url) return null;
  const revised = first ? readString(first.revised_prompt) : null;
  return { url, ...(revised ? { revised } : {}) };
}

function readKlingTaskId(body: unknown): string | null {
  const o = readObject(body);
  if (!o) return null;
  const data = readObject(o.data);
  return (
    readString(o.task_id) ??
    readString(o.id) ??
    readString(data?.task_id) ??
    readString(data?.id) ??
    readString(readObject(data?.task)?.id)
  );
}

function readKlingVideoUrl(body: unknown): string | null {
  const o = readObject(body);
  if (!o) return null;
  const data = readObject(o.data) ?? o;
  return (
    readString(o.video_url) ??
    readString(data?.url) ??
    readString(readObject(data?.result)?.url) ??
    readString(readObject(data?.video)?.url) ??
    readString(readObject(o.result)?.url)
  );
}

function readKlingStatus(body: unknown): string | null {
  const o = readObject(body);
  if (!o) return null;
  const data = readObject(o.data) ?? o;
  return readString(data?.status) ?? readString(o.status);
}

function klingSucceeded(status: string): boolean {
  const s = status.toLowerCase();
  return s === "succeed" || s === "succeeded" || s === "success" || s === "completed" || s === "done";
}

function klingFailedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "failed" || s === "error" || s === "cancelled" || s === "canceled";
}

async function tryKling(prompt: string): Promise<string | null> {
  const key = process.env.KLING_API_KEY?.trim();
  if (!key) return null;

  const createRes = await fetch(`${KLING_API_BASE}/videos/text2video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      duration: 5,
      aspect_ratio: "16:9",
    }),
  });
  if (!createRes.ok) return null;

  const created = (await createRes.json()) as unknown;
  const taskId = readKlingTaskId(created);
  if (!taskId) return null;

  const started = Date.now();
  while (Date.now() - started < KLING_MAX_MS) {
    const pollRes = await fetch(`${KLING_API_BASE}/videos/text2video/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!pollRes.ok) return null;
    const poll = (await pollRes.json()) as unknown;
    const st = readKlingStatus(poll);
    if (st && klingSucceeded(st)) {
      const url = readKlingVideoUrl(poll);
      return url;
    }
    if (st && klingFailedStatus(st)) return null;
    await sleep(KLING_POLL_MS);
  }
  return null;
}

export class CreativeService {
  static async generateImage(prompt: string, userId: string, agentId?: string | null): Promise<CreativeAsset> {
    const p = prompt.trim();
    if (!p) throw new Error("prompt vacío");

    const mjUrl = await tryMidjourney(p);
    if (mjUrl) {
      return insertCreativeAsset({
        userId,
        agentId: agentId ?? null,
        assetType: "image",
        provider: "midjourney",
        prompt: p,
        url: mjUrl,
        status: "done",
        metadata: { source: "midjourney" },
      });
    }

    const dalle = await tryDalle(p);
    if (dalle) {
      return insertCreativeAsset({
        userId,
        agentId: agentId ?? null,
        assetType: "image",
        provider: "dalle",
        prompt: p,
        url: dalle.url,
        status: "done",
        metadata: dalle.revised ? { revised_prompt: dalle.revised } : {},
      });
    }

    return insertCreativeAsset({
      userId,
      agentId: agentId ?? null,
      assetType: "image",
      provider: "dalle",
      prompt: p,
      url: null,
      status: "failed",
      metadata: { error: "midjourney_and_dalle_failed" },
    });
  }

  static async generateVideo(prompt: string, userId: string, agentId?: string | null): Promise<CreativeAsset> {
    const p = prompt.trim();
    if (!p) throw new Error("prompt vacío");

    const videoUrl = await tryKling(p);
    if (videoUrl) {
      return insertCreativeAsset({
        userId,
        agentId: agentId ?? null,
        assetType: "video",
        provider: "kling",
        prompt: p,
        url: videoUrl,
        status: "done",
        metadata: { source: "kling" },
      });
    }

    return insertCreativeAsset({
      userId,
      agentId: agentId ?? null,
      assetType: "video",
      provider: "kling",
      prompt: p,
      url: null,
      status: "failed",
      metadata: { error: "kling_failed_or_unavailable" },
    });
  }
}
