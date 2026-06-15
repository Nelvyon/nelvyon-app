"use client";

import React from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { getBrandMode } from "@/core/platform/brand";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { canPerformAction } from "@/core/routing/guards";
import { ErrorNotice, ForbiddenNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { SectionTitle, SubsectionTitle } from "@/core/ui/typography";
import { HelpContextLink } from "@/features/help/components/HelpContextLink";
import { BillingWholesalePanel } from "@/features/billing/components/BillingWholesalePanel";
import { BillingOverviewSkeleton, BillingUsageSectionSkeleton } from "@/features/billing/components/BillingOverviewSkeleton";
import { InvoiceList } from "@/features/billing/components/InvoiceList";
import { BillingMeterBars } from "@/features/billing/components/BillingMeterBars";
import { BillingAdvancedInvoicesExport } from "@/features/billing/components/BillingAdvancedInvoicesExport";
import { MiniMonthlySpendChart } from "@/features/billing/components/MiniMonthlySpendChart";
import { BillingReportExport } from "@/features/billing/components/BillingReportExport";
import { BillingRiskOutlook } from "@/features/billing/components/BillingRiskOutlook";
import { BillingSummaryCard } from "@/features/billing/components/BillingSummaryCard";
import { BillingUpgradeCta } from "@/features/billing/components/BillingUpgradeCta";
import { BillingUsageTable } from "@/features/billing/components/BillingUsageTable";
import { useActiveSubscription, useBillingInvoices, useBillingSummary, useBillingUsage } from "@/features/billing/hooks";
import { invoicesToMonthlySpendSeries } from "@/features/billing/invoiceTrend";

function billingErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return "forbidden" as const;
  }
  return "generic" as const;
}

export default function BillingPage() {
  const { user } = useAuth();
  const isClientMode = getBrandMode() === "client";
  const summaryQuery = useBillingSummary();
  const usageQuery = useBillingUsage();
  const invoicesQuery = useBillingInvoices();
  const activeSubscriptionQuery = useActiveSubscription();
  const canUpgrade = user ? canPerformAction(user.role, "billing", "create") : false;

  const firstError = summaryQuery.error ?? usageQuery.error ?? invoicesQuery.error;

  const summary = summaryQuery.data;
  const usage = usageQuery.data;
  const invoices = invoicesQuery.data;
  const monthlySpendSeries = invoices ? invoicesToMonthlySpendSeries(invoices.invoices) : [];
  const summaryCurrency = (summary?.currency || "").toUpperCase();
  const activeSub = activeSubscriptionQuery.data;
  const hasActiveSubMismatch = Boolean(
    summary?.plan_id &&
      summary?.billing_cycle &&
      activeSub?.has_subscription &&
      activeSub?.plan_id &&
      activeSub?.billing_cycle &&
      (summary.plan_id !== activeSub.plan_id || summary.billing_cycle !== activeSub.billing_cycle),
  );

  const showInitialSkeleton =
    (summaryQuery.isLoading || usageQuery.isLoading || invoicesQuery.isLoading) && !summary;

  return (
    <ProtectedLayout module="billing">
      <div className="space-y-8">
        <HelpContextLink href={isClientMode ? "/help" : "/help/billing"} label={isClientMode ? "Support and billing guidance" : "Billing help and FAQ"} />
        {showInitialSkeleton && <BillingOverviewSkeleton />}

        {firstError &&
          (billingErrorMessage(firstError) === "forbidden" ? (
            <ForbiddenNotice>
              {isClientMode ? (
                <>
                  <p>Cause: billing is not enabled for this portal access.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next: contact your account owner to enable billing visibility for this portal.
                  </p>
                </>
              ) : (
                <>
                  <p>Cause: billing endpoints returned 403 for the workspace in your header or your role.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next: switch to a workspace where you have billing view (operator/admin), or ask an owner to grant access.
                  </p>
                </>
              )}
            </ForbiddenNotice>
          ) : (
            <ErrorNotice>
              {isClientMode ? (
                <>
                  <p>Cause: billing data could not be loaded for this account (network or temporary service issue).</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next: refresh once; if it persists, share the timestamp with support.
                  </p>
                </>
              ) : (
                <>
                  <p>Cause: summary, usage, or invoices failed to load (network, 5xx, or stale session).</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next: refresh; if it repeats, re-select workspace and sign in again before contacting support with the timestamp.
                  </p>
                </>
              )}
            </ErrorNotice>
          ))}

        {summary && (
          <>
            <BillingSummaryCard summary={summary} />
            <BillingWholesalePanel planId={summary.plan_id} />
            {activeSubscriptionQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Checking active subscription record…</p>
            ) : null}
            {activeSubscriptionQuery.error ? (
              <p className="text-xs text-warning-foreground">
                Active subscription row is temporarily unavailable; summary card remains the current billing overview source.
              </p>
            ) : null}
            {activeSub?.has_subscription ? (
              <p className="text-xs text-muted-foreground">
                Active subscription source of truth: {activeSub.plan_id} ({activeSub.billing_cycle}) · {activeSub.status}.
              </p>
            ) : null}
            {hasActiveSubMismatch ? (
              <p className="text-xs text-warning-foreground">
                Temporary reconciliation note: summary and active subscription show different plan/cycle values. Next:
                refresh once; if mismatch persists, treat active subscription row as source of truth for billing ops.
              </p>
            ) : null}
            <BillingUpgradeCta
              canUpgrade={isClientMode ? false : canUpgrade}
              currency={summaryCurrency}
              isClientMode={isClientMode}
              metersAtRisk={summary.meters_at_risk}
              monthlyCost={summary.monthly_cost}
              nextBillingDate={summary.next_billing_date}
              planId={summary.plan_id}
              planLabel={summary.plan_label}
              usageAlerts={summary.usage_alerts}
            />
          </>
        )}

        {usageQuery.isLoading && !usage && <BillingUsageSectionSkeleton />}

        {usage && (
          <section className="space-y-2">
            <SectionTitle>Usage vs limits</SectionTitle>
            <p className="text-xs text-muted-foreground">Updated {usage.updated_at}</p>
            <p className="text-xs text-muted-foreground">
              {isClientMode
                ? "Read-only usage transparency: enforced limits depend on your account plan and backend policy."
                : "Transparency note: contacts/campaigns/workflows/users are enforced by backend quotas. api_calls/storage/emails are informational dashboard signals today."}
            </p>
            {usage.meters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No usage meters were returned for this workspace yet. Next: confirm metering is enabled for this tenant, then
                refresh Billing.
              </p>
            ) : null}
            <BillingMeterBars meters={usage.meters} />
            <SubsectionTitle className="pt-2">Detailed meters</SubsectionTitle>
            <BillingUsageTable meters={usage.meters} />
          </section>
        )}

        <section className="space-y-2">
          <SectionTitle>Invoices</SectionTitle>
          {invoicesQuery.isLoading && !invoices && (
            <SkeletonListRows aria-label="Loading invoices" rows={5} />
          )}
          {invoices && (
            <>
              <p className="text-sm text-muted-foreground">
                Total recorded payments: {invoices.total_paid.toFixed(2)} {(invoices.currency || "").toUpperCase()}
              </p>
              <InvoiceList currency={invoices.currency} invoices={invoices.invoices} />
              {monthlySpendSeries.length > 0 ? (
                <MiniMonthlySpendChart
                  footnote={`Each bar sums invoice amounts by calendar month from the ${invoices.invoices.length} row(s) returned by GET /api/v1/billing/invoices (same payload as the table above). There is no separate time-series endpoint; months with no invoice in this list show no bar.`}
                  series={monthlySpendSeries}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No monthly spend chart yet: there are no invoice rows with amounts in this response, so there is nothing to
                  aggregate by month. Next: confirm Paddle or billing sync populated invoices for this workspace, then reload
                  Billing.
                </p>
              )}
              {!isClientMode ? <BillingAdvancedInvoicesExport invoices={invoices.invoices} /> : null}
            </>
          )}
        </section>

        {summary && usage && invoices && !isClientMode && (
          <>
            <BillingRiskOutlook invoices={invoices} summary={summary} usage={usage} />
            <BillingReportExport invoices={invoices} summary={summary} usage={usage} />
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
