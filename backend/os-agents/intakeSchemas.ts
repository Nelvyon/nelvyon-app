/**
 * Client intake payloads (elite brief) — normalized before Stripe and passed to OS agents as job payload.
 */

export interface BaseIntakeSchema {
  clientName: string;
  industry: string;
  targetAudience: string;
  tone: string;
  competitors: string[];
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  referenceUrls: string[];
  budget?: string;
  deadline?: string;
  additionalNotes?: string;
}

export interface WebIntakeSchema extends BaseIntakeSchema {
  pages: string[];
  hasExistingContent: boolean;
  preferredPlatform?: string;
}

export interface SeoIntakeSchema extends BaseIntakeSchema {
  targetKeywords: string[];
  currentWebsiteUrl?: string;
  mainGoal: string;
}

export interface AdsIntakeSchema extends BaseIntakeSchema {
  platforms: string[];
  monthlyBudget: number;
  campaignGoal: string;
}

export interface SocialMediaIntakeSchema extends BaseIntakeSchema {
  platforms: string[];
  postFrequency: string;
  contentStyle: string;
}

/** Snapshot stored on `OsJob.intake` (service-specific keys allowed). */
export type StoredClientIntake = BaseIntakeSchema & Record<string, unknown>;
