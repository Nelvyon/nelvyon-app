"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";

import { loginUrlForPlanCheckout, startPlanCheckout, type BillablePlanId } from "./planCheckout";

type PlanCheckoutButtonProps = {
  planId: BillablePlanId;
  children: React.ReactNode;
  className?: string;
  returnPath?: string;
  disabled?: boolean;
};

export function PlanCheckoutButton({
  planId,
  children,
  className,
  returnPath = "/precios",
  disabled = false,
}: PlanCheckoutButtonProps) {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutPath =
    returnPath.includes("?") ? returnPath : `${returnPath}?plan=${encodeURIComponent(planId)}`;

  const runCheckout = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await startPlanCheckout(planId, accessToken);
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      if (result.unauthorized) {
        router.push(loginUrlForPlanCheckout(checkoutPath));
        return;
      }
      setError(result.message);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, checkoutPath, planId, router]);

  const handleClick = () => {
    if (loading || disabled || isBootstrapping) return;
    if (!isAuthenticated) {
      router.push(loginUrlForPlanCheckout(checkoutPath));
      return;
    }
    void runCheckout();
  };

  return (
    <span className="block w-full">
      <button
        className={className}
        disabled={disabled || loading || isBootstrapping}
        onClick={handleClick}
        type="button"
      >
        {loading ? "Redirigiendo a Stripe…" : children}
      </button>
      {error ? <p className="mt-2 text-center text-xs text-red-400">{error}</p> : null}
    </span>
  );
}
