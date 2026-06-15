"use client";

import {
  CheckCircle2,
  Circle,
  Clock,
  HelpCircle,
  Loader2,
  Package,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/core/ui/button";
import type { PartnerHqResponse } from "@/features/partners/api";
import type { PartnerConnectStatus } from "@/lib/partners/partnerConnectTypes";
import {
  connectStepBadge,
  resolveMarginHero,
  stepStates,
  type StepState,
} from "@/lib/partners/partnerCommissionFlowUi";
import {
  WHOLESALE_CLIENT_PLANS,
  WHOLESALE_GROWTH_PACKS,
} from "@/lib/partners/wholesaleCatalog";

const COMMISSION_EXAMPLES = [
  {
    product: "Starter cliente/mes",
    retail: WHOLESALE_CLIENT_PLANS[0].retailEur,
    cogs: WHOLESALE_CLIENT_PLANS[0].wholesaleEur,
    margin: WHOLESALE_CLIENT_PLANS[0].retailEur - WHOLESALE_CLIENT_PLANS[0].wholesaleEur,
  },
  {
    product: WHOLESALE_GROWTH_PACKS[0].label,
    retail: WHOLESALE_GROWTH_PACKS[0].suggestedRetailEur,
    cogs: WHOLESALE_GROWTH_PACKS[0].wholesaleEur,
    margin:
      WHOLESALE_GROWTH_PACKS[0].suggestedRetailEur - WHOLESALE_GROWTH_PACKS[0].wholesaleEur,
  },
  {
    product: WHOLESALE_GROWTH_PACKS[1].label,
    retail: WHOLESALE_GROWTH_PACKS[1].suggestedRetailEur,
    cogs: WHOLESALE_GROWTH_PACKS[1].wholesaleEur,
    margin:
      WHOLESALE_GROWTH_PACKS[1].suggestedRetailEur - WHOLESALE_GROWTH_PACKS[1].wholesaleEur,
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Cuándo cobro de verdad?",
    answer:
      "Cuando P2b active suscripciones y packs a tus clientes y tu cuenta de cobro esté en estado Completo.",
  },
  {
    question: "¿Puedo poner mis precios?",
    answer: "Sí; el catálogo muestra márgenes sobre precios sugeridos. Tú defines el retail al mercado.",
  },
  {
    question: "¿Qué es el ledger?",
    answer: "Registro auditable de cada cobro: bruto, wholesale (COGS) y tu margen.",
  },
] as const;

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />;
  if (state === "current") return <Clock className="h-5 w-5 text-amber-600" aria-hidden />;
  return <Circle className="h-5 w-5 text-muted-foreground/50" aria-hidden />;
}

type Props = {
  data: PartnerHqResponse;
  connect: PartnerConnectStatus;
  onboarding: boolean;
  onStartConnect: () => void;
};

export function PartnerCommissionFlow({ data, connect, onboarding, onStartConnect }: Props) {
  const margin = resolveMarginHero(data);
  const connectBadge = connectStepBadge(connect);
  const [s1, s2, s3] = stepStates(data, connect);
  const included = data.wholesale.subscription.includedClientSlots;
  const extraSlot = data.wholesale.subscription.extraClientSlotWholesaleEur;

  return (
    <section
      aria-labelledby="partner-commission-flow-title"
      className="space-y-6 rounded-xl border bg-card p-4 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" id="partner-commission-flow-title">
            Cómo funciona tu comisión
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tres pasos para empezar a generar margen con tus clientes.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
          <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tu margen este mes</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">
              €{margin.mtd.toFixed(0)}
              {!margin.real ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground line-through decoration-muted-foreground/60">
                  proyección
                </span>
              ) : (
                <span className="ml-2 text-sm font-normal text-muted-foreground">real</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Acumulado: €{margin.total.toFixed(0)}
              {margin.real ? " · ledger" : " · sin cobros aún"}
            </p>
          </div>
        </div>
      </div>

      <ol className="grid gap-4 md:grid-cols-3">
        <li
          className={`flex flex-col rounded-lg border p-4 ${s1 === "current" ? "border-primary/40 bg-primary/5" : ""}`}
        >
          <div className="flex items-start gap-3">
            <StepIcon state={s1} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paso 1</p>
              <p className="font-medium">Conectar cuenta de cobro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nelvyon retiene el COGS wholesale; el resto es tuyo. Sin cuenta conectada no podemos
                transferirte comisiones cuando actives cobros a clientes (próximamente).
              </p>
              <p className="mt-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{connectBadge.label}</span>
                <span className="ml-2 text-muted-foreground">{connectBadge.hint}</span>
              </p>
            </div>
          </div>
          {!connect.onboarding_complete ? (
            <Button
              className="mt-4 w-full md:w-auto"
              disabled={onboarding || !connect.configured}
              onClick={onStartConnect}
              size="sm"
              variant={s1 === "current" ? "default" : "outline"}
            >
              {onboarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirigiendo…
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Completar onboarding
                </>
              )}
            </Button>
          ) : null}
        </li>

        <li
          className={`flex flex-col rounded-lg border p-4 ${s2 === "current" ? "border-primary/40 bg-primary/5" : ""}`}
        >
          <div className="flex items-start gap-3">
            <StepIcon state={s2} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paso 2</p>
              <p className="font-medium">Añadir clientes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea sub-workspaces para tus clientes con tu marca. Tú defines el precio final al mercado;
                nosotros aplicamos wholesale.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.metrics.total_clients} / {included} incluidos
                {data.metrics.total_clients > included
                  ? ` · +€${extraSlot}/mes por extra`
                  : ` (+€${extraSlot}/mes por extra)`}
              </p>
            </div>
          </div>
          <Button asChild className="mt-4 w-full md:w-auto" size="sm" variant={s2 === "current" ? "default" : "outline"}>
            <Link href="/dashboard/white-label/clients">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
            </Link>
          </Button>
        </li>

        <li
          className={`flex flex-col rounded-lg border p-4 ${s3 === "current" ? "border-primary/40 bg-primary/5" : ""}`}
        >
          <div className="flex items-start gap-3">
            <StepIcon state={s3} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paso 3</p>
              <p className="font-medium">Lanzar Growth Packs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Local, Ecommerce o SaaS B2B. Margen típico €348–€648 según catálogo (venta sugerida − COGS).
              </p>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Cobro automático al cliente — disponible pronto (P2b)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.metrics.active_packs} pack{data.metrics.active_packs === 1 ? "" : "s"} activo
                {data.metrics.active_packs === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Button asChild className="mt-4 w-full md:w-auto" size="sm" variant={s3 === "current" ? "default" : "outline"}>
            <Link href="/os/packs">
              <Package className="mr-2 h-4 w-4" />
              Lanzar pack
            </Link>
          </Button>
        </li>
      </ol>

      <details className="group rounded-lg border bg-muted/20 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
          <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
          ¿Cómo se calcula mi margen?
        </summary>
        <div className="mt-4 space-y-4 text-sm">
          <p className="rounded-md border bg-background px-3 py-2 font-mono text-xs md:text-sm">
            Lo que paga tu cliente (retail) − COGS Nelvyon (wholesale) = Tu margen
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="p-3">Producto</th>
                  <th className="p-3">Retail sugerido</th>
                  <th className="p-3">COGS</th>
                  <th className="p-3">Tu margen</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_EXAMPLES.map((row) => (
                  <tr className="border-b last:border-0" key={row.product}>
                    <td className="p-3">{row.product}</td>
                    <td className="p-3">€{row.retail}</td>
                    <td className="p-3">€{row.cogs}</td>
                    <td className="p-3 font-semibold text-emerald-600">€{row.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            En la pestaña Comisiones verás cada línea del ledger cuando haya cobros reales. En staging pueden
            aparecer entradas de prueba.
          </p>
        </div>
      </details>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Preguntas frecuentes</h3>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item) => (
            <details className="rounded-lg border px-4 py-2" key={item.question}>
              <summary className="cursor-pointer text-sm font-medium [&::-webkit-details-marker]:hidden">
                {item.question}
              </summary>
              <p className="mt-2 pb-1 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
