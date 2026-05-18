/* ─── NELVYON Payment Service — Stripe Checkout via NelvyonAPI (tenant headers) ─── */
import { createClient } from "@metagptx/web-sdk";

import { api } from "./api";

const client = createClient();

export interface CheckoutResult {
  session_id: string;
  url: string;
  amount: number;
  currency: string;
}

export interface VerifyResult {
  status: string;
  plan_id: string;
  billing_cycle: string;
  payment_status: string;
  subscription_id: number | null;
}

export interface ActiveSubscription {
  has_subscription: boolean;
  plan_id?: string;
  billing_cycle?: string;
  status?: string;
  amount_paid?: number;
  started_at?: string;
  /** Legacy mirror; prefer current_period_end. */
  expires_at?: string;
  current_period_start?: string;
  current_period_end?: string;
}

export interface PlanPricing {
  plan_id: string;
  name: string;
  base_price: number;
  currency: string;
  cycles: Array<{
    cycle: string;
    months: number;
    discount_percent: number;
    monthly_price: number;
    total_price: number;
    savings: number;
  }>;
}

/**
 * Create a Stripe checkout session for a subscription (workspace titular; requires active workspace).
 */
export async function createCheckoutSession(
  planId: string,
  billingCycle: string,
  promoCode?: string
): Promise<CheckoutResult> {
  const currentUrl = window.location.origin;
  return api.createPaymentSession({
    plan_id: planId,
    billing_cycle: billingCycle,
    promo_code: promoCode || "",
    success_url: `${currentUrl}/saas/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${currentUrl}/saas/agents-dashboard`,
  });
}

/**
 * Redirect to Stripe checkout
 */
export async function redirectToCheckout(
  planId: string,
  billingCycle: string,
  promoCode?: string
): Promise<void> {
  const result = await createCheckoutSession(planId, billingCycle, promoCode);
  if (result.url) {
    client.utils.openUrl(result.url);
  } else {
    throw new Error("No se recibió URL de checkout");
  }
}

/**
 * Verify a payment after Stripe redirect
 */
export async function verifyPayment(sessionId: string): Promise<VerifyResult> {
  return api.verifyPaymentSession(sessionId) as Promise<VerifyResult>;
}

/**
 * Get the current user's active subscription
 */
export async function getActiveSubscription(): Promise<ActiveSubscription> {
  return api.getPaymentActiveSubscription();
}

/**
 * Get all plans with pricing from the backend
 */
export async function getPlans(): Promise<PlanPricing[]> {
  const response = await client.apiCall.invoke({
    url: "/api/v1/payment/plans",
    method: "GET",
    data: {},
  });
  return (response.data as { plans: PlanPricing[] }).plans;
}
