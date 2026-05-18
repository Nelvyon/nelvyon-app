"use client";

import { useEffect, useState } from "react";

export interface SubscriptionData {
  plan: "free" | "starter" | "pro" | "agency";
  status: "inactive" | "active" | "canceled" | "past_due";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((data: SubscriptionData) => setSubscription(data))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, []);
  return { subscription, loading };
}
