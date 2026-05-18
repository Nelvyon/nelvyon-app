export interface BillingSummary {
  plan_id: string;
  plan_label: string;
  billing_cycle: string;
  next_billing_date?: string | null;
  monthly_cost: number;
  usage_alerts: number;
  meters_at_risk: string[];
  total_paid_ytd: number;
  currency: string;
}

export interface UsageMeter {
  id: string;
  label: string;
  current: number;
  limit: number;
  unit: string;
  color: string;
  overage_rate?: number | null;
  percentage: number;
  status: string;
}

export interface BillingUsage {
  meters: UsageMeter[];
  updated_at: string;
  plan_id: string;
  plan_label: string;
}

export interface InvoiceRow {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  period: string;
  pdf_url: string;
}

export interface BillingInvoices {
  invoices: InvoiceRow[];
  total_paid: number;
  currency: string;
}

export interface BillingPlanCycle {
  cycle: string;
  months: number;
  discount_percent: number;
  monthly_price: number;
  total_price: number;
  savings: number;
}

export interface BillingPlan {
  plan_id: string;
  name: string;
  base_price: number;
  currency: string;
  cycles: BillingPlanCycle[];
}

export interface BillingPlansResponse {
  plans: BillingPlan[];
}

export interface CreatePaymentSessionInput {
  plan_id: string;
  billing_cycle: string;
  promo_code?: string;
  success_url: string;
  cancel_url: string;
}

export interface CreatePaymentSessionResponse {
  session_id: string;
  url: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentResponse {
  status: "paid" | "pending" | "cancelled";
  plan_id?: string | null;
  billing_cycle?: string | null;
  payment_status: string;
  subscription_id?: number | null;
}

export interface ActiveSubscription {
  has_subscription: boolean;
  plan_id?: string | null;
  billing_cycle?: string | null;
  status?: string | null;
  amount_paid?: number | null;
  started_at?: string | null;
  expires_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
}
