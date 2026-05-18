import { DbClient } from "../../db/DbClient";
import type { ClientProfile, ClientProfileUpsert } from "./types";

type ClientProfileRow = {
  id: string;
  user_id: string;
  brand_name: string;
  brand_voice: string | null;
  target_audience: string | null;
  industry: string | null;
  competitors: string[] | null;
  usp: string | null;
  colors: string[] | null;
  keywords: string[] | null;
  past_results: unknown;
  preferences: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};

function rowToProfile(r: ClientProfileRow): ClientProfile {
  return {
    id: r.id,
    user_id: r.user_id,
    brand_name: r.brand_name,
    brand_voice: r.brand_voice,
    target_audience: r.target_audience,
    industry: r.industry,
    competitors: r.competitors,
    usp: r.usp,
    colors: r.colors,
    keywords: r.keywords,
    past_results: r.past_results,
    preferences: r.preferences,
    created_at: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updated_at: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
  };
}

function buildProfileBrief(p: ClientProfile): string {
  const lines: string[] = ["### PERFIL DE MARCA DEL CLIENTE (aplicar en todo el output)"];
  lines.push(`- Marca: ${p.brand_name}`);
  if (p.brand_voice?.trim()) lines.push(`- Voz de marca: ${p.brand_voice.trim()}`);
  if (p.target_audience?.trim()) lines.push(`- Audiencia objetivo: ${p.target_audience.trim()}`);
  if (p.industry?.trim()) lines.push(`- Industria: ${p.industry.trim()}`);
  if (p.usp?.trim()) lines.push(`- USP: ${p.usp.trim()}`);
  if (p.competitors?.length) lines.push(`- Competidores referencia: ${p.competitors.join(", ")}`);
  if (p.colors?.length) lines.push(`- Colores marca (hex): ${p.colors.join(", ")}`);
  if (p.keywords?.length) lines.push(`- Keywords de marca: ${p.keywords.join(", ")}`);
  if (p.past_results != null && typeof p.past_results === "object" && Object.keys(p.past_results as object).length > 0) {
    lines.push(`- Resultados/campañas previas (contexto): ${JSON.stringify(p.past_results)}`);
  }
  if (p.preferences != null && typeof p.preferences === "object" && Object.keys(p.preferences as object).length > 0) {
    lines.push(`- Preferencias por agente/canal: ${JSON.stringify(p.preferences)}`);
  }
  lines.push("Respeta este perfil en tono, promesa y exclusiones; no contradigas USP ni voz salvo que el brief operativo lo pida explícitamente.");
  return lines.join("\n");
}

export class ClientProfileService {
  static async getProfile(userId: string, brandName: string): Promise<ClientProfile | null> {
    const bn = brandName?.trim();
    if (!bn) return null;
    const rows = await DbClient.getInstance().query<ClientProfileRow>(
      `SELECT id, user_id, brand_name, brand_voice, target_audience, industry, competitors, usp, colors, keywords, past_results, preferences, created_at, updated_at
       FROM client_profiles WHERE user_id = $1::uuid AND brand_name = $2 LIMIT 1`,
      [userId, bn],
    );
    const r = rows[0];
    return r ? rowToProfile(r) : null;
  }

  static async upsertProfile(userId: string, data: ClientProfileUpsert): Promise<ClientProfile> {
    const bn = data.brand_name?.trim();
    if (!bn) throw new Error("brand_name es obligatorio");
    const rows = await DbClient.getInstance().query<ClientProfileRow>(
      `INSERT INTO client_profiles (
        user_id, brand_name, brand_voice, target_audience, industry, competitors, usp, colors, keywords, past_results, preferences, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::jsonb, '{}'), COALESCE($11::jsonb, '{}'), now()
      )
      ON CONFLICT (user_id, brand_name) DO UPDATE SET
        brand_voice = COALESCE(EXCLUDED.brand_voice, client_profiles.brand_voice),
        target_audience = COALESCE(EXCLUDED.target_audience, client_profiles.target_audience),
        industry = COALESCE(EXCLUDED.industry, client_profiles.industry),
        competitors = COALESCE(EXCLUDED.competitors, client_profiles.competitors),
        usp = COALESCE(EXCLUDED.usp, client_profiles.usp),
        colors = COALESCE(EXCLUDED.colors, client_profiles.colors),
        keywords = COALESCE(EXCLUDED.keywords, client_profiles.keywords),
        past_results = COALESCE(EXCLUDED.past_results, client_profiles.past_results),
        preferences = COALESCE(EXCLUDED.preferences, client_profiles.preferences),
        updated_at = now()
      RETURNING id, user_id, brand_name, brand_voice, target_audience, industry, competitors, usp, colors, keywords, past_results, preferences, created_at, updated_at`,
      [
        userId,
        bn,
        data.brand_voice ?? null,
        data.target_audience ?? null,
        data.industry ?? null,
        data.competitors ?? null,
        data.usp ?? null,
        data.colors ?? null,
        data.keywords ?? null,
        data.past_results != null ? JSON.stringify(data.past_results) : null,
        data.preferences != null ? JSON.stringify(data.preferences) : null,
      ],
    );
    const r = rows[0];
    if (!r) throw new Error("upsertProfile: sin fila devuelta");
    return rowToProfile(r);
  }

  static async listProfiles(userId: string): Promise<ClientProfile[]> {
    const rows = await DbClient.getInstance().query<ClientProfileRow>(
      `SELECT id, user_id, brand_name, brand_voice, target_audience, industry, competitors, usp, colors, keywords, past_results, preferences, created_at, updated_at
       FROM client_profiles WHERE user_id = $1::uuid ORDER BY updated_at DESC`,
      [userId],
    );
    return rows.map(rowToProfile);
  }

  static async enrichInput(userId: string, brandName: string, baseInput: object): Promise<object> {
    const bn = brandName?.trim();
    if (!bn) return baseInput;
    try {
      const profile = await ClientProfileService.getProfile(userId, bn);
      if (!profile) return baseInput;
      const brief = buildProfileBrief(profile);
      return {
        ...baseInput,
        _clientProfileBrief: brief,
        clientProfile_brand_name: profile.brand_name,
        clientProfile_brand_voice: profile.brand_voice ?? undefined,
        clientProfile_target_audience: profile.target_audience ?? undefined,
        clientProfile_industry: profile.industry ?? undefined,
        clientProfile_competitors: profile.competitors ?? undefined,
        clientProfile_usp: profile.usp ?? undefined,
        clientProfile_colors: profile.colors ?? undefined,
        clientProfile_keywords: profile.keywords ?? undefined,
        clientProfile_past_results: profile.past_results,
        clientProfile_preferences: profile.preferences,
      };
    } catch {
      return baseInput;
    }
  }
}
