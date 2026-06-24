/**
 * SaasKlaviyoService — Klaviyo email marketing connector.
 * Uses Klaviyo API v2024 (private key). Falls back to explicit error when not configured.
 */
import { DbClient } from "../db/DbClient";

export class SaasKlaviyoError extends Error {
  constructor(message: string, public readonly code: "NOT_CONFIGURED" | "API_ERROR" | "VALIDATION" | "NOT_FOUND") {
    super(message);
    this.name = "SaasKlaviyoError";
  }
}

export type KlaviyoProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export type KlaviyoList = {
  id: string;
  name: string;
  profileCount: number;
  createdAt: string;
};

export type KlaviyoCampaign = {
  id: string;
  name: string;
  status: string;
  sendTime: string | null;
  createdAt: string;
};

type FetchFn = typeof fetch;

export class SaasKlaviyoService {
  constructor(
    private readonly apiKey: string | null = process.env.KLAVIYO_API_KEY?.trim() ?? null,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  private get configured(): boolean {
    return !!this.apiKey;
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Klaviyo-API-Key ${this.apiKey}`,
      revision: "2024-02-15",
    };
  }

  async getStatus(): Promise<{ configured: boolean; accountEmail: string | null }> {
    if (!this.configured) return { configured: false, accountEmail: null };
    try {
      const res = await this.fetchFn("https://a.klaviyo.com/api/accounts/", { headers: this.headers() });
      const data = await res.json() as { data?: { attributes?: { contact_information?: { default_sender_email?: string } } } };
      const email = data.data?.attributes?.contact_information?.default_sender_email ?? null;
      return { configured: true, accountEmail: email };
    } catch {
      return { configured: true, accountEmail: null };
    }
  }

  async getLists(): Promise<KlaviyoList[]> {
    if (!this.configured) throw new SaasKlaviyoError("Klaviyo API key not configured. Set KLAVIYO_API_KEY.", "NOT_CONFIGURED");
    const res = await this.fetchFn("https://a.klaviyo.com/api/lists/?fields[list]=name,created,profile_count", { headers: this.headers() });
    const data = await res.json() as { data?: Array<{ id: string; attributes: { name: string; profile_count?: number; created: string } }> };
    if (!res.ok) throw new SaasKlaviyoError("Klaviyo API error fetching lists", "API_ERROR");
    return (data.data ?? []).map((l) => ({
      id: l.id, name: l.attributes.name,
      profileCount: l.attributes.profile_count ?? 0,
      createdAt: l.attributes.created,
    }));
  }

  async getCampaigns(): Promise<KlaviyoCampaign[]> {
    if (!this.configured) throw new SaasKlaviyoError("Klaviyo API key not configured. Set KLAVIYO_API_KEY.", "NOT_CONFIGURED");
    const res = await this.fetchFn("https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,'email')&fields[campaign]=name,status,scheduled_at,created_at", { headers: this.headers() });
    const data = await res.json() as { data?: Array<{ id: string; attributes: { name: string; status: string; scheduled_at: string | null; created_at: string } }> };
    if (!res.ok) throw new SaasKlaviyoError("Klaviyo API error fetching campaigns", "API_ERROR");
    return (data.data ?? []).map((c) => ({
      id: c.id, name: c.attributes.name, status: c.attributes.status,
      sendTime: c.attributes.scheduled_at, createdAt: c.attributes.created_at,
    }));
  }

  async addProfile(listId: string, email: string, firstName?: string, lastName?: string, phone?: string): Promise<KlaviyoProfile> {
    if (!this.configured) throw new SaasKlaviyoError("Klaviyo API key not configured. Set KLAVIYO_API_KEY.", "NOT_CONFIGURED");
    if (!email?.trim()) throw new SaasKlaviyoError("email is required", "VALIDATION");
    if (!listId?.trim()) throw new SaasKlaviyoError("listId is required", "VALIDATION");

    const profileRes = await this.fetchFn("https://a.klaviyo.com/api/profiles/", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: { email: email.trim(), first_name: firstName ?? null, last_name: lastName ?? null, phone_number: phone ?? null },
        },
      }),
    });
    const profileData = await profileRes.json() as { data?: { id: string; attributes: { email: string; first_name: string | null; last_name: string | null; phone_number: string | null } }; errors?: Array<{ detail: string }> };
    if (!profileRes.ok && profileRes.status !== 409) {
      throw new SaasKlaviyoError(profileData.errors?.[0]?.detail ?? "Failed to create profile", "API_ERROR");
    }

    const profileId = profileData.data?.id ?? "";
    if (profileId) {
      await this.fetchFn(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ data: [{ type: "profile", id: profileId }] }),
      }).catch(() => null);
    }

    return {
      id: profileId,
      email: profileData.data?.attributes.email ?? email,
      firstName: profileData.data?.attributes.first_name ?? null,
      lastName: profileData.data?.attributes.last_name ?? null,
      phone: profileData.data?.attributes.phone_number ?? null,
    };
  }
}

let _instance: SaasKlaviyoService | null = null;
export function getSaasKlaviyoService(): SaasKlaviyoService {
  if (!_instance) _instance = new SaasKlaviyoService();
  return _instance;
}
export function resetSaasKlaviyoServiceForTests(): void { _instance = null; }
