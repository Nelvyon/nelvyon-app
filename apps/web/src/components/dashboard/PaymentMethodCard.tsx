"use client";

import { useEffect, useState } from "react";

import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";

type PaymentMethodPayload = {
  lastFour?: string;
  cardType?: string;
  expiryMonth?: number;
  expiryYear?: number;
  updateUrl: string | null;
};

function formatCardLine(p: PaymentMethodPayload): string | null {
  const parts: string[] = [];
  if (p.cardType) parts.push(p.cardType);
  if (p.lastFour) parts.push(`····${p.lastFour}`);
  if (p.expiryMonth != null && p.expiryYear != null) {
    const mm = String(p.expiryMonth).padStart(2, "0");
    const yy = String(p.expiryYear).slice(-2);
    parts.push(`Vence ${mm}/${yy}`);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function PaymentMethodSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-4 w-56 max-w-full rounded bg-muted" />
      <div className="h-4 w-1/2 max-w-[200px] rounded bg-muted" />
      <div className="h-10 w-48 rounded-lg bg-muted" />
    </div>
  );
}

export function PaymentMethodCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaymentMethodPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/payment-method", { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setData({ updateUrl: null });
          return;
        }
        const body = (await res.json()) as PaymentMethodPayload;
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled) setData({ updateUrl: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const line = data ? formatCardLine(data) : null;
  const updateUrl = data?.updateUrl ?? null;
  const noSubscription = updateUrl === null;

  return (
    <NelvyonDsCard>
      {loading ? (
        <PaymentMethodSkeleton />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {line ?? "No hay método de pago guardado"}
          </p>
          <div className="mt-4">
            <span title={noSubscription ? "Sin suscripción activa" : undefined} className="inline-block">
              <NelvyonDsButton
                type="button"
                disabled={noSubscription}
                onClick={() => {
                  if (updateUrl) window.open(updateUrl, "_blank", "noopener,noreferrer");
                }}
              >
                Actualizar método de pago
              </NelvyonDsButton>
            </span>
          </div>
        </>
      )}
    </NelvyonDsCard>
  );
}
