"use client";

import React from "react";

import { Button } from "@/core/ui/button";
import { SubsectionTitle } from "@/core/ui/typography";
import { parseSelfServeEligiblePlan } from "@/features/billing/schema";

interface BillingUpgradeCtaProps {
  planId: string | undefined;
  /** Human-readable plan name from summary (optional, improves admin copy). */
  planLabel?: string;
  metersAtRisk: string[];
  canUpgrade: boolean;
  monthlyCost?: number;
  currency?: string;
  usageAlerts?: number;
  nextBillingDate?: string | null;
  isClientMode?: boolean;
}

export function BillingUpgradeCta({
  planId,
  planLabel,
  metersAtRisk,
  canUpgrade,
  monthlyCost,
  currency,
  usageAlerts,
  nextBillingDate,
  isClientMode = false,
}: BillingUpgradeCtaProps) {
  const eligible = parseSelfServeEligiblePlan(planId);
  const nearLimit = metersAtRisk.length > 0;
  const alertPressure = (usageAlerts ?? 0) > 0;
  const showStrip = nearLimit || eligible !== null || alertPressure;

  if (!showStrip) {
    return null;
  }

  const planLine = planLabel && planId ? `${planLabel} (${planId})` : planId ?? planLabel ?? "current plan";
  const money =
    monthlyCost != null && currency
      ? `${monthlyCost.toFixed(2)} ${currency}`
      : monthlyCost != null
        ? monthlyCost.toFixed(2)
        : null;

  return (
    <section
      className={`rounded-lg border p-4 shadow-card ${nearLimit || alertPressure ? "border-warning/40 bg-warning/10" : "border-border bg-muted"}`}
    >
      <SubsectionTitle>
        {nearLimit || alertPressure ? "Usage or alerts need attention" : isClientMode ? "Plan status" : "Upgrade workspace"}
      </SubsectionTitle>
      {nearLimit && (
        <p className="mt-1 text-sm text-warning-foreground">
          Meters at risk: <strong>{metersAtRisk.join(", ") || "—"}</strong>
        </p>
      )}
      {alertPressure && !nearLimit && (
        <p className="mt-1 text-sm text-warning-foreground">
          {usageAlerts} usage alert(s) are recorded — review limits before they block workflows.
        </p>
      )}
      {!nearLimit && !alertPressure && eligible && (
        <p className="mt-1 text-sm text-foreground/95">
          You are on <strong>{planLine}</strong>. Higher tiers unlock more capacity and modules.
        </p>
      )}
      {(nearLimit || alertPressure) && canUpgrade && (
        <p className="mt-2 text-sm text-foreground">
          {nextBillingDate ? (
            <>
              Next billing date: <strong>{nextBillingDate}</strong>
              {money ? (
                <>
                  {" "}
                  — recurring about <strong>{money}</strong> on the active subscription.
                </>
              ) : null}
            </>
          ) : money ? (
            <>
              Recurring about <strong>{money}</strong> on the active subscription — align the plan before limits bite.
            </>
          ) : (
            <>Review the plan and meters below, then choose an upgrade path that matches growth.</>
          )}
        </p>
      )}
      {(nearLimit || alertPressure) && !canUpgrade && (nextBillingDate || money) && (
        <p className="mt-2 text-sm text-foreground">
          {nextBillingDate ? (
            <>
              Next billing: <strong>{nextBillingDate}</strong>
              {money ? (
                <>
                  {" "}
                  — about <strong>{money}</strong> per month on record.
                </>
              ) : null}
            </>
          ) : money ? (
            <>
              Reported monthly recurring: <strong>{money}</strong>.
            </>
          ) : null}
        </p>
      )}

      {canUpgrade && (nearLimit || eligible || alertPressure) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild>
            <a href="/billing/upgrade">Review upgrade options</a>
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Opens the workspace checkout journey (Stripe Checkout on Billing → Upgrade).
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-warning-foreground">
          Subscription changes are managed by your account owner. This portal remains read-only for billing actions.
        </p>
      )}
    </section>
  );
}
