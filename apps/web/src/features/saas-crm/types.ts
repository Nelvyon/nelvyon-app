export type ContactStatus = "lead" | "prospect" | "client" | "churned";
export type PipelineStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type ActivityType = "note" | "call" | "email" | "meeting" | "task";

export interface SaasCrmContact {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: ContactStatus;
  pipelineStage: PipelineStage;
  value: number;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactActivity {
  id: string;
  contactId: string;
  tenantId: string;
  activityType: ActivityType;
  description: string;
  scheduledAt: string | null;
  completed: boolean;
  createdAt: string;
}

export interface PipelineSummaryItem {
  stage: PipelineStage;
  count: number;
  totalValue: number;
}

export interface ContactListFilters {
  status?: ContactStatus;
  stage?: PipelineStage;
  search?: string;
}

export interface CreateContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  status?: ContactStatus;
  pipeline_stage?: PipelineStage;
  value?: number;
  notes?: string | null;
  tags?: string[];
}

export type UpdateContactInput = Partial<CreateContactInput>;

export interface CreateActivityInput {
  activityType: ActivityType;
  description: string;
  scheduledAt?: string | null;
  completed?: boolean;
}

export interface SaasCrmApiError {
  error: string;
  code?: string;
}
