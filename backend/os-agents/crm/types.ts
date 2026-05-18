export type CrmStage = "lead" | "prospect" | "proposal" | "won" | "lost";
export type CrmActivityType = "email" | "call" | "meeting" | "note" | "agent_output";

export interface CrmContact {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  industry: string | null;
  stage: string;
  score: number;
  tags: string[] | null;
  notes: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  id: string;
  contactId: string;
  userId: string;
  type: string;
  summary: string | null;
  agentId: string | null;
  metadata: unknown;
  createdAt: string;
}

export type CrmContactUpsert = {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  stage?: string;
  tags?: string[] | null;
  notes?: string | null;
  metadata?: unknown;
};

export type CrmContactFilters = {
  stage?: string;
  industry?: string;
  minScore?: number;
};
