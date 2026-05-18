"use client";

import { useEffect, useState } from "react";

import type { OnboardingStatus, OnboardingStep } from "@nelvyon/onboarding";

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding/status", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: OnboardingStatus) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  async function markStep(step: OnboardingStep) {
    await fetch("/api/onboarding/complete-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
      credentials: "same-origin",
    });
    const updated = await fetch("/api/onboarding/status", { credentials: "same-origin" }).then((r) => r.json());
    setStatus(updated);
  }

  return { status, loading, markStep };
}
