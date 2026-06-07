/**
 * Phase I — minimal Supabase Storage client (mirrors backend/services/supabase_service.py).
 * Mock mode when SUPABASE_URL or service role key missing.
 */

import type { SupabaseSignedUrlResult, SupabaseUploadResult } from "./types";
import { AUTONOMOUS_PREVIEWS_BUCKET } from "./types";

export interface SupabaseStagingClient {
  isMock: () => boolean;
  uploadBytes: (
    bucket: string,
    path: string,
    data: Uint8Array,
    contentType: string,
  ) => Promise<SupabaseUploadResult>;
  createSignedUrl: (bucket: string, path: string, expiresIn: number) => Promise<SupabaseSignedUrlResult>;
  publicUrl: (bucket: string, path: string) => string;
}

function readConfig(): { baseUrl: string; serviceKey: string; mock: boolean } {
  const baseUrl = (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  const mock = !baseUrl || !serviceKey;
  return { baseUrl, serviceKey, mock };
}

export function createSupabaseStagingClient(): SupabaseStagingClient {
  const cfg = readConfig();

  return {
    isMock: () => cfg.mock,

    publicUrl(bucket: string, path: string): string {
      const clean = path.replace(/^\//, "");
      return `${cfg.baseUrl}/storage/v1/object/public/${bucket}/${clean}`;
    },

    async uploadBytes(
      bucket: string,
      path: string,
      data: Uint8Array,
      contentType: string,
    ): Promise<SupabaseUploadResult> {
      const cleanPath = path.replace(/^\//, "");
      if (cfg.mock) {
        return {
          mock: true,
          ok: true,
          bucket,
          path: cleanPath,
          public_url: `https://mock.supabase.local/${bucket}/${cleanPath}`,
        };
      }

      const url = `${cfg.baseUrl}/storage/v1/object/${bucket}/${cleanPath}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.serviceKey}`,
          apikey: cfg.serviceKey,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: data,
      });

      if (!res.ok) {
        const error = await res.text();
        return { mock: false, ok: false, bucket, path: cleanPath, error };
      }

      return {
        mock: false,
        ok: true,
        bucket,
        path: cleanPath,
        public_url: `${cfg.baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`,
      };
    },

    async createSignedUrl(
      bucket: string,
      path: string,
      expiresIn: number,
    ): Promise<SupabaseSignedUrlResult> {
      const cleanPath = path.replace(/^\//, "");
      const ttl = Math.max(60, Math.min(expiresIn, 3600));

      if (cfg.mock) {
        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
        return {
          mock: true,
          ok: true,
          bucket,
          path: cleanPath,
          signed_url: `https://mock.supabase.local/${bucket}/${cleanPath}?token=mock&expires=${encodeURIComponent(expiresAt)}`,
        };
      }

      const url = `${cfg.baseUrl}/storage/v1/object/sign/${bucket}/${cleanPath}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.serviceKey}`,
          apikey: cfg.serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: ttl }),
      });

      if (!res.ok) {
        return {
          mock: false,
          ok: false,
          bucket,
          path: cleanPath,
          error: await res.text(),
        };
      }

      const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
      const signedPath = data.signedURL ?? data.signedUrl ?? "";
      const signedUrl = signedPath.startsWith("http") ? signedPath : `${cfg.baseUrl}${signedPath}`;

      return { mock: false, ok: true, bucket, path: cleanPath, signed_url: signedUrl };
    },
  };
}

export function defaultPreviewBucket(): string {
  return process.env.AUTONOMOUS_PREVIEWS_BUCKET?.trim() || AUTONOMOUS_PREVIEWS_BUCKET;
}
