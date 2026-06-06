export type OsDeliverableStatus =
  | "draft"
  | "in_review"
  | "delivered"
  | "approved"
  | "published"
  | "approved_by_client"
  | "changes_requested"
  | "rejected"
  | "archived";

export type OsDeliverableVisibility = "internal" | "client_visible";

export interface OsDeliverable {
  id: string;
  workspace_id: number;
  client_id: string;
  project_id: string;
  task_id?: string | null;
  title: string;
  description?: string | null;
  type?: string | null;
  status: OsDeliverableStatus;
  visibility: OsDeliverableVisibility;
  file_url?: string | null;
  storage_key?: string | null;
  version: number;
  review_notes?: string | null;
  delivered_at?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  client_reviewed_at?: string | null;
  approved_by_portal_user_id?: string | null;
  metadata: Record<string, unknown>;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OsDeliverableListResponse {
  items: OsDeliverable[];
  total: number;
  page: number;
  page_size: number;
}

export interface OsDeliverableVersion {
  id: string;
  deliverable_id: string;
  version: number;
  status: string;
  file_url?: string | null;
  review_notes?: string | null;
  metadata: Record<string, unknown>;
  created_at?: string | null;
}

export interface OsDeliverableVersionListResponse {
  items: OsDeliverableVersion[];
  total: number;
}

export interface OsDeliverableClientReview {
  id: string;
  deliverable_id: string;
  portal_user_id: string;
  decision: string;
  feedback?: string | null;
  created_at?: string | null;
}

export interface OsDeliverableCreateInput {
  client_id: string;
  project_id: string;
  task_id?: string;
  title: string;
  description?: string;
  type?: string;
  status?: OsDeliverableStatus;
  visibility?: OsDeliverableVisibility;
  file_url?: string;
  storage_key?: string;
  review_notes?: string;
  metadata?: Record<string, unknown>;
}

export interface OsDeliverableUpdateInput {
  client_id?: string;
  project_id?: string;
  task_id?: string | null;
  title?: string;
  description?: string | null;
  type?: string | null;
  status?: OsDeliverableStatus;
  visibility?: OsDeliverableVisibility;
  file_url?: string | null;
  storage_key?: string | null;
  review_notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface OsCanonicalClient {
  id: string;
  business_name: string;
  legacy_nelvyon_client_id?: number | null;
}

export interface OsCanonicalProject {
  id: string;
  name: string;
  client_id: string;
  metadata: Record<string, unknown>;
}
