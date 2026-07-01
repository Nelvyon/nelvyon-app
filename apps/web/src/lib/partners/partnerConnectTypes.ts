export type PartnerOnboardingStatus = "not_started" | "pending" | "active" | "restricted";

export type PartnerStripeAccountRow = {
  partner_workspace_id: number;
  partner_user_id: string;
  stripe_account_id: string;
  onboarding_status: PartnerOnboardingStatus;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  created_at: string;
  updated_at: string;
};

export type PartnerLedgerEventType =
  | "subscription_invoice"
  | "pack_payment"
  | "affiliate_payout"
  | "connect_test"
  | "manual_adjustment";

export type PartnerLedgerRow = {
  id: string;
  partner_workspace_id: number;
  client_workspace_id: number | null;
  event_type: PartnerLedgerEventType;
  stripe_event_id: string | null;
  gross_eur: number;
  wholesale_eur: number;
  partner_margin_eur: number;
  currency: string;
  description: string | null;
  created_at: string;
};

export type PartnerConnectStatus = {
  configured: boolean;
  onboarding_status: PartnerOnboardingStatus;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  stripe_account_id: string | null;
  onboarding_complete: boolean;
  label: string;
};

export type PartnerLedgerTotals = {
  total_margin_eur: number;
  margin_mtd_eur: number;
  entry_count: number;
};

export type PartnerClientBillingRow = {
  id: string;
  partner_workspace_id: number;
  client_workspace_id: number;
  retail_plan_id: string | null;
  retail_pack_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_retail_eur: number;
  monthly_wholesale_eur: number;
  status: string;
  created_at: string;
  updated_at: string;
};
