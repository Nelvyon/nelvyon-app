import type { InvoiceRow } from "@/features/billing/types";

export interface SpanishInvoiceRow {
  id: number;
  invoice_number?: string;
  client_name?: string;
  total?: number;
  currency?: string;
  status?: string;
  due_date?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
}

export interface InvoiceStatsRow {
  total_facturado?: number;
  pendiente?: number;
  pagado?: number;
  draft_count?: number;
  sent_count?: number;
  paid_count?: number;
  currency?: string;
}

export interface OsContractFinanceRow {
  id: number;
  title: string;
  status?: string | null;
  contract_type?: string | null;
  client_name?: string | null;
  price?: string | null;
  client_id?: number | null;
  project_id?: number | null;
  updated_at?: string | null;
}

export interface OsFinanzasData {
  /** Facturas españolas (tabla invoices) — ingresos operación */
  invoiceStats: InvoiceStatsRow | null;
  invoices: SpanishInvoiceRow[];
  /** Suscripción plataforma (tabla subscriptions vía billing API) */
  billingSummary: {
    plan_id: string;
    plan_label: string;
    monthly_cost: number;
    total_paid_ytd: number;
    currency: string;
  } | null;
  billingInvoices: InvoiceRow[];
  contracts: OsContractFinanceRow[];
  dealsWonValue: number | null;
  dealsWonCount: number | null;
  clientsActive: number | null;
  projectsActive: number | null;
  /** Calculado solo con datos reales */
  incomeMonth: number | null;
  incomeYear: number | null;
  invoicesPendingCount: number | null;
  invoicesPendingAmount: number | null;
  contractsActiveCount: number | null;
  platformPaidYtd: number | null;
  currency: string;
  errors: string[];
}
