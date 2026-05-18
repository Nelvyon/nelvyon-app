"use client";

import React from "react";

import { Button } from "@/core/ui/button";

export type UpgradeUiStatus = "idle" | "loading" | "redirecting" | "pending" | "paid" | "cancelled" | "error" | "forbidden";

interface UpgradeStatusPanelProps {
  status: UpgradeUiStatus;
  message?: string;
}

export function UpgradeStatusPanel({ status, message }: UpgradeStatusPanelProps) {
  if (status === "idle") return null;

  const base = "rounded-lg border p-3 text-sm";

  if (status === "loading" || status === "redirecting" || status === "pending") {
    return (
      <div className={`${base} border-border bg-card text-foreground`}>
        <p className="font-medium">Checkout in progress</p>
        <p className="mt-1 text-muted-foreground">{message ?? "Please wait while we sync checkout status."}</p>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className={`${base} border-success/35 bg-success/10 text-success-foreground`}>
        <p className="font-medium">Payment verified</p>
        <p className="mt-1">{message ?? "Subscription is active and billing screens were refreshed."}</p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={`${base} border-warning/35 bg-warning/10 text-warning-foreground`}>
        <p className="font-medium">Checkout cancelled</p>
        <p className="mt-1">{message ?? "No subscription change was applied."}</p>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className={`${base} border-warning/35 bg-warning/10 text-warning-foreground`}>
        <p className="font-medium">Admins only</p>
        <p className="mt-1">{message ?? "Only workspace admins can start a plan change."}</p>
      </div>
    );
  }

  return (
    <div className={`${base} border-destructive/35 bg-destructive/10 text-destructive`}>
      <p className="font-medium">Checkout error</p>
      <p className="mt-1">{message ?? "Could not complete verification. You can retry safely."}</p>
      <div className="mt-2">
        <Button onClick={() => window.location.reload()} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    </div>
  );
}
