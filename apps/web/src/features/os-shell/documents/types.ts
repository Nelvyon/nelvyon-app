import type { OsDocumentSource } from "./constants";

export interface OsDocumentItem {
  id: string;
  source: OsDocumentSource;
  numericId: number;
  title: string;
  subtitle?: string | null;
  typeLabel: string;
  status?: string | null;
  clientId?: number | null;
  projectId?: number | null;
  date?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
  raw?: Record<string, unknown>;
}

export interface OsOutputDetail {
  id: number;
  project_id: number;
  client_id?: number | null;
  output_type: string;
  title?: string | null;
  content?: string | null;
  qa_status?: string | null;
  qa_score?: number | null;
  qa_feedback?: string | null;
  extra_data?: string | null;
  created_at?: string | null;
}

export interface OsAssetRow {
  id: number;
  client_id: number;
  project_id?: number | null;
  asset_type: string;
  file_name: string;
  object_key?: string | null;
  mime_type?: string | null;
  classification?: string | null;
  tags?: string | null;
  visibility?: string | null;
  created_at?: string | null;
}

export interface OsContractRow {
  id: number;
  title: string;
  contract_type?: string | null;
  status?: string | null;
  client_id?: number | null;
  project_id?: number | null;
  client_name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}
