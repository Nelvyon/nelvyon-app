import {
  CHECKOUT_STRIPE_PLANS,
  getStripePriceEnvVarName,
  PLAN_PRICES,
  type BillablePlan,
} from "../billing/planConfig";
import { readStripePriceEnvDiagnostic } from "../billing/stripePriceEnvAudit";
import { readRailwayDeployDiagnostic, readStripeKeyDiagnostic } from "../billing/stripePricePipelineTrace";
import { railwaySetServiceVariables } from "../railway/railwayApi";
import {
  auditStripeCatalog,
  createStripeProduct,
  createStripeRecurringPrice,
  findActivePriceForPlan,
  findProductForPlan,
  type StripePriceSummary,
} from "./stripeCatalog";
import { retrieveStripePrice, StripePriceNotFoundError } from "./stripeApi";

export type PlanRepairStatus = {
  plan: BillablePlan;
  envVar: string;
  configuredPriceId: string | null;
  configuredPriceFoundInApi: boolean;
  configuredPriceActive: boolean | null;
  resolvedPriceId: string | null;
  action: "none" | "reused_existing" | "created_new" | "env_updated_only";
  productId: string | null;
  productName: string | null;
  error: string | null;
};

export type StripeRepairReport = {
  timestamp: string;
  mode: "live" | "test" | "unknown";
  stripeAccount: { id: string; email: string | null };
  stripeKey: ReturnType<typeof readStripeKeyDiagnostic>;
  railway: ReturnType<typeof readRailwayDeployDiagnostic>;
  configuredPrices: PlanRepairStatus[];
  activePrices: StripePriceSummary[];
  fixApplied: boolean;
  railwayUpdate: Awaited<ReturnType<typeof railwaySetServiceVariables>> | null;
  checkoutReady: boolean;
};

async function verifyConfiguredPrice(priceId: string): Promise<{ found: boolean; active: boolean | null }> {
  try {
    const price = await retrieveStripePrice(priceId);
    return { found: true, active: price.active };
  } catch (e) {
    if (e instanceof StripePriceNotFoundError) return { found: false, active: null };
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("No such price") || msg.includes("resource_missing")) {
      return { found: false, active: null };
    }
    throw e;
  }
}

async function resolvePlanPrice(
  plan: BillablePlan,
  activePrices: StripePriceSummary[],
  products: Awaited<ReturnType<typeof auditStripeCatalog>>["products"],
  fix: boolean,
): Promise<PlanRepairStatus> {
  const envVar = getStripePriceEnvVarName(plan);
  const diagnostic = readStripePriceEnvDiagnostic(plan);
  const configuredPriceId = diagnostic.trimmed ?? null;

  const status: PlanRepairStatus = {
    plan,
    envVar,
    configuredPriceId,
    configuredPriceFoundInApi: false,
    configuredPriceActive: null,
    resolvedPriceId: null,
    action: "none",
    productId: null,
    productName: null,
    error: null,
  };

  if (!configuredPriceId) {
    status.error = `Falta ${envVar}`;
    return status;
  }

  const verification = await verifyConfiguredPrice(configuredPriceId);
  status.configuredPriceFoundInApi = verification.found;
  status.configuredPriceActive = verification.active;

  if (verification.found && verification.active) {
    status.resolvedPriceId = configuredPriceId;
    const match = activePrices.find((p) => p.id === configuredPriceId);
    status.productId = match?.productId ?? null;
    status.productName = match?.productName ?? null;
    return status;
  }

  if (!fix) {
    status.error = verification.found
      ? "Price inactivo en Stripe"
      : `Price ${configuredPriceId} no existe en la cuenta API (${readStripeKeyDiagnostic().prefix})`;
    return status;
  }

  let product = findProductForPlan(products, plan);
  if (!product) {
    product = await createStripeProduct(plan);
    products.push(product);
  }
  status.productId = product.id;
  status.productName = product.name;

  let price = findActivePriceForPlan(activePrices, plan, product.id);
  if (!price) {
    price = await createStripeRecurringPrice(plan, product.id);
    activePrices.push(price);
    status.action = "created_new";
  } else {
    status.action = "reused_existing";
  }

  status.resolvedPriceId = price.id;
  status.configuredPriceFoundInApi = true;
  status.configuredPriceActive = true;

  process.env[envVar] = price.id;
  return status;
}

/** Auditoría completa del catálogo Stripe vs env vars configuradas. */
export async function auditStripeRepair(): Promise<StripeRepairReport> {
  const catalog = await auditStripeCatalog();
  const configuredPrices: PlanRepairStatus[] = [];

  for (const plan of CHECKOUT_STRIPE_PLANS) {
    configuredPrices.push(
      await resolvePlanPrice(plan, catalog.activePrices, catalog.products, false),
    );
  }

  return {
    timestamp: new Date().toISOString(),
    mode: catalog.mode,
    stripeAccount: catalog.account,
    stripeKey: readStripeKeyDiagnostic(),
    railway: readRailwayDeployDiagnostic(),
    configuredPrices,
    activePrices: catalog.activePrices,
    fixApplied: false,
    railwayUpdate: null,
    checkoutReady: configuredPrices.every((p) => p.resolvedPriceId && !p.error),
  };
}

/**
 * Repara prices inexistentes/inactivos: reutiliza o crea en Stripe,
 * actualiza process.env en caliente y persiste en Railway si hay token.
 */
export async function fixStripePrices(plans: BillablePlan[] = [...CHECKOUT_STRIPE_PLANS]): Promise<StripeRepairReport> {
  const catalog = await auditStripeCatalog();
  const configuredPrices: PlanRepairStatus[] = [];
  const railwayVars: Record<string, string> = {};

  for (const plan of CHECKOUT_STRIPE_PLANS) {
    const fixThis = plans.includes(plan);
    const status = await resolvePlanPrice(
      plan,
      catalog.activePrices,
      catalog.products,
      fixThis,
    );
    configuredPrices.push(status);

    if (fixThis && status.resolvedPriceId && status.configuredPriceId !== status.resolvedPriceId) {
      railwayVars[status.envVar] = status.resolvedPriceId;
      if (status.action === "none") status.action = "env_updated_only";
    }
  }

  let railwayUpdate: Awaited<ReturnType<typeof railwaySetServiceVariables>> | null = null;
  if (Object.keys(railwayVars).length > 0) {
    railwayUpdate = await railwaySetServiceVariables(railwayVars);
  }

  const fixApplied = configuredPrices.some((p) => p.action !== "none");

  return {
    timestamp: new Date().toISOString(),
    mode: catalog.mode,
    stripeAccount: catalog.account,
    stripeKey: readStripeKeyDiagnostic(),
    railway: readRailwayDeployDiagnostic(),
    configuredPrices,
    activePrices: catalog.activePrices,
    fixApplied,
    railwayUpdate,
    checkoutReady: configuredPrices.every((p) => p.resolvedPriceId && !p.error),
  };
}

/** Resumen legible para logs. */
export function summarizeRepair(report: StripeRepairReport): string {
  const lines = [
    `Stripe repair @ ${report.timestamp}`,
    `Account: ${report.stripeAccount.id} (${report.stripeAccount.email ?? "no email"})`,
    `Mode: ${report.mode}`,
    `Checkout ready: ${report.checkoutReady}`,
  ];
  for (const p of report.configuredPrices) {
    lines.push(
      `  ${p.plan}: env=${p.configuredPriceId} → resolved=${p.resolvedPriceId} action=${p.action} product=${p.productName ?? p.productId ?? "?"}`,
    );
    if (p.error) lines.push(`    ERROR: ${p.error}`);
  }
  if (report.railwayUpdate) {
    lines.push(`Railway: ${report.railwayUpdate.ok ? "updated " + report.railwayUpdate.updated.join(", ") : report.railwayUpdate.reason}`);
  }
  return lines.join("\n");
}
