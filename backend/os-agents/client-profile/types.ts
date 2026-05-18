export type ClientProfile = {
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
  created_at: string;
  updated_at: string;
};

export type ClientProfileUpsert = Partial<
  Omit<ClientProfile, "id" | "user_id" | "created_at" | "updated_at">
> & { brand_name: string };
