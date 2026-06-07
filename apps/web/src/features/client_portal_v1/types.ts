export interface SignupFormValues {
  email: string;
  fullName: string;
  password: string;
}

export interface WorkspaceOption {
  id: string;
  name: string;
  role: "owner" | "member";
}

export interface SimpleProjectInput {
  name: string;
  goal: string;
  primaryChannel: string;
}

export interface SimpleProjectDraft {
  id: string;
  name: string;
  goal: string;
  primaryChannel: string;
  status: "draft" | "active";
  createdAt: string;
}

/** Portal API types (mirror backend portal_rest.py) */

export type PortalDeliverableStatus = "published" | "approved_by_client" | "changes_requested";

export interface PortalUser {
  id: string;
  email: string;
  name?: string | null;
  client_id: string;
  workspace_id: number;
}

export interface PortalAuthResponse {
  access_token: string;
  token_type: string;
  user: PortalUser;
}

export interface PortalListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PortalProject {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  start_date?: string | null;
  due_date?: string | null;
  updated_at?: string | null;
}

export interface PortalDeliverable {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  status: PortalDeliverableStatus | string;
  file_url?: string | null;
  has_file?: boolean;
  version: number;
  published_at?: string | null;
  client_reviewed_at?: string | null;
  client_feedback?: string | null;
  client_review_decision?: string | null;
  updated_at?: string | null;
}

export interface PortalDeliverableReviewResponse {
  id: string;
  project_id: string;
  title: string;
  status: string;
  client_reviewed_at?: string | null;
  client_feedback?: string | null;
  client_review_decision?: string | null;
}

export interface PortalLoginInput {
  email: string;
  password: string;
}

export interface PortalAcceptInviteInput {
  token: string;
  password: string;
  name?: string;
}
