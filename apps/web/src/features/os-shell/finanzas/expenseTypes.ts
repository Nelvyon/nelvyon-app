export interface OsExpense {
  id: number;
  title: string;
  amount: number;
  currency: string;
  status: string;
  category?: string | null;
  vendor?: string | null;
  expense_date?: string | null;
  paid_at?: string | null;
  client_id?: number | null;
  project_id?: number | null;
  assignee?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OsExpenseListResponse {
  items: OsExpense[];
  total: number;
  skip: number;
  limit: number;
}

export interface OsExpenseWriteInput {
  title: string;
  amount: number;
  currency?: string;
  status?: string;
  category?: string | null;
  vendor?: string | null;
  expense_date?: string | null;
  paid_at?: string | null;
  client_id?: number | null;
  project_id?: number | null;
  assignee?: string | null;
  notes?: string | null;
}

export interface OsCashflowRow {
  id: number;
  direction: string;
  amount: number;
  currency: string;
  flow_date?: string | null;
  source_type: string;
  source_id?: number | null;
  category?: string | null;
  description?: string | null;
  created_at?: string | null;
}
