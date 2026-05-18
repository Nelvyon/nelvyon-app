export type SaasPlan = "starter" | "pro" | "enterprise";

export type SaasTenantDto = {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  plan: SaasPlan;
  website: string | null;
  phone: string | null;
  employees: string | null;
  goals: string[];
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
};
