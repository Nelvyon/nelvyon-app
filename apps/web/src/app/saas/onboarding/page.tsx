"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { OnboardingLayout } from "./components/OnboardingLayout";
import { StepConfirm } from "./components/StepConfirm";
import { StepPlan } from "./components/StepPlan";
import { StepProfile } from "./components/StepProfile";
import { StepWelcome } from "./components/StepWelcome";
import type { SaasPlan, SaasTenantDto } from "./components/types";

function parseTenant(raw: unknown): SaasTenantDto | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.userId !== "string" ||
    typeof o.companyName !== "string" ||
    typeof o.industry !== "string" ||
    typeof o.plan !== "string" ||
    typeof o.onboardingCompleted !== "boolean" ||
    typeof o.onboardingStep !== "number"
  ) {
    return null;
  }
  return {
    id: o.id,
    userId: o.userId,
    companyName: o.companyName,
    industry: o.industry,
    plan: o.plan as SaasPlan,
    website: typeof o.website === "string" || o.website === null ? (o.website as string | null) : null,
    phone: typeof o.phone === "string" || o.phone === null ? (o.phone as string | null) : null,
    employees: typeof o.employees === "string" || o.employees === null ? (o.employees as string | null) : null,
    goals: Array.isArray(o.goals) ? o.goals.filter((g): g is string => typeof g === "string") : [],
    onboardingCompleted: o.onboardingCompleted,
    onboardingStep: o.onboardingStep,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
  };
}

export default function SaasOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<SaasTenantDto | null>(null);
  const [uiStep, setUiStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [plan, setPlan] = useState<SaasPlan>("starter");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [employees, setEmployees] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/onboarding", { credentials: "same-origin" });
      if (res.status === 401) {
        router.replace(`/auth/login?next=${encodeURIComponent("/saas/onboarding")}`);
        return;
      }
      if (!res.ok) {
        setError("No se pudo cargar el onboarding");
        return;
      }
      const body: unknown = await res.json();
      const rec = typeof body === "object" && body !== null && "tenant" in body ? (body as { tenant: unknown }).tenant : null;
      const t = parseTenant(rec);
      setTenant(t);
      if (t?.onboardingCompleted) {
        router.replace("/saas/dashboard");
        return;
      }
      if (t) {
        setCompanyName(t.companyName);
        setIndustry(t.industry);
        setPlan(t.plan);
        setWebsite(t.website ?? "");
        setPhone(t.phone ?? "");
        setEmployees(t.employees ?? "");
        setGoals(t.goals);
        setUiStep(Math.min(4, Math.max(1, t.onboardingStep)));
      } else {
        setUiStep(1);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function postOnboarding(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/auth/login?next=${encodeURIComponent("/saas/onboarding")}`);
        return;
      }
      if (!res.ok) {
        const msg =
          typeof body === "object" && body !== null && "error" in body && typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Error al guardar";
        setError(msg);
        return;
      }
      const tRaw =
        typeof body === "object" && body !== null && "tenant" in body ? (body as { tenant: unknown }).tenant : null;
      const t = parseTenant(tRaw);
      if (t) {
        setTenant(t);
        setCompanyName(t.companyName);
        setIndustry(t.industry);
        setPlan(t.plan);
        setWebsite(t.website ?? "");
        setPhone(t.phone ?? "");
        setEmployees(t.employees ?? "");
        setGoals(t.goals);
        setUiStep(Math.min(4, Math.max(1, t.onboardingStep)));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/onboarding/complete", {
        method: "POST",
        credentials: "same-origin",
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/auth/login?next=${encodeURIComponent("/saas/onboarding")}`);
        return;
      }
      if (!res.ok) {
        const msg =
          typeof body === "object" && body !== null && "error" in body && typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "No se pudo completar";
        setError(msg);
        return;
      }
      router.replace("/saas/dashboard");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-muted-foreground">Cargando…</div>
    );
  }

  return (
    <OnboardingLayout step={uiStep}>
      {uiStep === 1 ? (
        <StepWelcome
          companyName={companyName}
          industry={industry}
          onCompanyNameChange={setCompanyName}
          onIndustryChange={setIndustry}
          busy={busy}
          error={error}
          onNext={() => {
            void postOnboarding({
              step: 2,
              companyName,
              industry,
            });
          }}
        />
      ) : null}
      {uiStep === 2 ? (
        <StepPlan
          selected={plan}
          onSelect={setPlan}
          busy={busy}
          error={error}
          onBack={() => setUiStep(1)}
          onNext={() => {
            void postOnboarding({
              step: 3,
              plan,
            });
          }}
        />
      ) : null}
      {uiStep === 3 ? (
        <StepProfile
          website={website}
          phone={phone}
          employees={employees}
          goals={goals}
          onWebsiteChange={setWebsite}
          onPhoneChange={setPhone}
          onEmployeesChange={setEmployees}
          onToggleGoal={(id) => {
            setGoals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
          }}
          busy={busy}
          error={error}
          onBack={() => setUiStep(2)}
          onNext={() => {
            void postOnboarding({
              step: 4,
              website: website || null,
              phone: phone || null,
              employees: employees || null,
              goals,
            });
          }}
        />
      ) : null}
      {uiStep === 4 && tenant ? (
        <StepConfirm
          acceptedLegal={acceptedLegal}
          busy={busy}
          error={error}
          onAcceptedLegalChange={setAcceptedLegal}
          onBack={() => setUiStep(3)}
          onFinish={() => void handleFinish()}
          tenant={tenant}
        />
      ) : null}
    </OnboardingLayout>
  );
}
