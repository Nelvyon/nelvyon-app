/**
 * Fase 0 — Inspección read-only del schema billing (sin writes, sin prod por defecto).
 *
 * Uso:
 *   pnpm -C apps/web exec tsx ../../backend/saas/scripts/inspectBillingSchema.ts
 *   DATABASE_URL=postgresql://... pnpm -C apps/web exec tsx ../../backend/saas/scripts/inspectBillingSchema.ts
 *
 * Opcional:
 *   SAAS_BILLING_SCHEMA_INSPECT_ALLOW_PROD=true  — permite URLs que parecen prod (no recomendado)
 */

import fs from "fs";
import path from "path";

import { DbClient } from "../../db/DbClient";

type ColumnRow = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
};

type IndexRow = {
  indexname: string;
  indexdef: string;
};

type ConstraintRow = {
  conname: string;
  contype: string;
  pg_get_constraintdef: string;
};

type CountRow = { n: string | number };

function loadEnvFiles(): void {
  const repoRoot = path.resolve(__dirname, "../../..");
  const webRoot = path.join(repoRoot, "apps", "web");
  const files = [
    path.join(webRoot, ".env.production.local"),
    path.join(webRoot, ".env.local"),
    path.join(repoRoot, ".env.production"),
    path.join(repoRoot, ".env"),
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url.replace(/^postgresql\+asyncpg:/, "postgresql:"));
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

function looksLikeProductionDb(url: string): boolean {
  const lower = url.toLowerCase();
  const prodHints = [
    "supabase.co",
    "railway.app",
    "neon.tech",
    "prod",
    "production",
    "lezzkqpkxcoxqqcgohof",
  ];
  return prodHints.some((h) => lower.includes(h));
}

function codeExpectations() {
  return {
    nodeMigration256: {
      source: "backend/db/migrations/256_subscriptions.sql",
      expectedColumns: [
        "id (uuid PK)",
        "user_id (uuid UNIQUE)",
        "paddle_subscription_id",
        "paddle_customer_id",
        "plan (text, NOT plan_id)",
        "status",
        "current_period_end",
        "cancel_at_period_end",
      ],
    },
    nodeMigration308: {
      source: "backend/db/migrations/308_subscriptions_stripe.sql",
      adds: ["stripe_subscription_id", "stripe_customer_id"],
    },
    alembicPythonModel: {
      source: "backend/models/subscriptions.py",
      expectedColumns: [
        "id (integer PK autoincrement)",
        "user_id (string)",
        "workspace_id (integer FK, NOT NULL after pr01)",
        "plan_id (text, NOT plan)",
        "billing_cycle",
        "status",
        "stripe_session_id",
        "stripe_subscription_id",
        "stripe_customer_id",
        "amount_paid",
        "currency",
        "current_period_start",
        "current_period_end",
      ],
    },
    saasTenants: {
      source: "backend/db/migrations/005_saas_tenants.sql",
      planCheck: "starter | pro | enterprise",
    },
  };
}

function webhookInventory() {
  return {
    node: {
      route: "POST /api/webhooks/stripe",
      handler: "backend/stripe/webhookHandler.ts",
      deployService: "apps/web (Railway releaseCommand → migrate.ts)",
      envDocs: [
        "apps/web/.env.example → STRIPE_WEBHOOK_SECRET for /api/webhooks/stripe",
        ".env.example → STRIPE_WEBHOOK_SECRET",
      ],
      checkout: "POST /api/billing/checkout → backend/stripe/stripeApi.ts",
      subscriptionWrite: "UPSERT subscriptions ON CONFLICT (user_id) — columns: plan, status",
      alsoUpdates: "nelvyon_users.plan",
      syncsSaasTenants: false,
    },
    python: {
      route: "POST /api/v1/stripe/webhook",
      handler: "backend/services/stripe_webhook_processor.py",
      deployService: "backend FastAPI (backend/.env.railway.example)",
      envDocs: ["backend/.env.railway.example → STRIPE_WEBHOOK_SECRET for /api/v1/stripe/webhook"],
      idempotency: "stripe_webhook_events table (Alembic pr02)",
      checkout: "POST /api/v1/payment/create_payment_session → backend/routers/payments.py",
      subscriptionWrite: "SubscriptionsService — workspace_id + plan_id + billing_cycle",
      activeSubscriptionRead: "GET /api/v1/payment/active_subscription (by workspace_id)",
      syncsSaasTenants: false,
    },
    uiPrimaryCheckout: {
      page: "apps/web/src/app/billing/upgrade/BillingUpgradePageClient.tsx",
      api: "billingApi.createPaymentSession → /api/v1/payment/create_payment_session (Python)",
      note: "La UI de upgrade usa el checkout Python, no /api/billing/checkout Node",
    },
  };
}

function detectSchemaProfile(columns: string[]): {
  profile: "node" | "python" | "hybrid" | "unknown" | "missing_table";
  signals: string[];
} {
  if (columns.length === 0) return { profile: "missing_table", signals: [] };

  const set = new Set(columns);
  const hasPlan = set.has("plan");
  const hasPlanId = set.has("plan_id");
  const hasWorkspaceId = set.has("workspace_id");
  const hasBillingCycle = set.has("billing_cycle");
  const hasUserIdUnique = false; // checked separately via constraints

  const signals: string[] = [];
  if (hasPlan) signals.push("column:plan (Node webhookHandler)");
  if (hasPlanId) signals.push("column:plan_id (Python SubscriptionsService)");
  if (hasWorkspaceId) signals.push("column:workspace_id (Python workspace billing)");
  if (hasBillingCycle) signals.push("column:billing_cycle (Python)");
  if (set.has("paddle_subscription_id")) signals.push("column:paddle_* (Node migration 256 legacy)");

  let profile: "node" | "python" | "hybrid" | "unknown" = "unknown";
  if (hasPlan && !hasPlanId && !hasWorkspaceId) profile = "node";
  else if (hasPlanId && hasWorkspaceId && !hasPlan) profile = "python";
  else if (hasPlan && hasPlanId && hasWorkspaceId) profile = "hybrid";
  else if (hasPlanId || hasWorkspaceId) profile = "python";
  else if (hasPlan) profile = "node";

  return { profile, signals };
}

function analyzeConflicts(
  columns: ColumnRow[],
  constraints: ConstraintRow[],
  sampleStats: Record<string, unknown>,
): string[] {
  const names = new Set(columns.map((c) => c.column_name));
  const conflicts: string[] = [];

  if (names.has("plan") && names.has("plan_id")) {
    conflicts.push(
      "R5-HYBRID: coexisten `plan` (Node) y `plan_id` (Python). Los webhooks pueden escribir columnas distintas.",
    );
  }
  if (names.has("plan") && !names.has("plan_id")) {
    conflicts.push(
      "Node-only plan column: webhook Python escribe `plan_id` — fallará si la columna no existe.",
    );
  }
  if (names.has("plan_id") && !names.has("plan")) {
    conflicts.push(
      "Python-only plan_id: webhook Node escribe `plan` — fallará o ignorará si la columna no existe.",
    );
  }
  if (!names.has("workspace_id")) {
    conflicts.push(
      "Sin workspace_id: checkout Python (/api/v1/payment/create_payment_session) requiere workspace_id NOT NULL (Alembic pr01).",
    );
  }

  const userUnique = constraints.some(
    (c) => c.contype === "u" && c.pg_get_constraintdef.toLowerCase().includes("user_id"),
  );
  if (userUnique) {
    conflicts.push(
      "UNIQUE(user_id): modelo Node (1 fila por usuario). Python permite múltiples filas por workspace.",
    );
  }

  const idCol = columns.find((c) => c.column_name === "id");
  if (idCol) {
    if (idCol.data_type === "uuid" || idCol.udt_name === "uuid") {
      conflicts.push("PK uuid: perfil Node migration 256.");
    } else if (idCol.data_type === "integer" || idCol.udt_name === "int4") {
      conflicts.push("PK integer: perfil Alembic/Python model.");
    }
  }

  const agencyInSaas = sampleStats.saasPlans as Record<string, number> | undefined;
  if (agencyInSaas && (agencyInSaas["agency"] ?? 0) > 0) {
    conflicts.push("saas_tenants con plan=agency violaría CHECK (solo starter/pro/enterprise).");
  }

  return conflicts;
}

async function inspectDatabase(): Promise<Record<string, unknown>> {
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!dbUrl) {
    return {
      databaseConnected: false,
      reason: "DATABASE_URL no configurada — solo inventario estático de código/migraciones.",
    };
  }

  if (looksLikeProductionDb(dbUrl) && process.env.SAAS_BILLING_SCHEMA_INSPECT_ALLOW_PROD !== "true") {
    return {
      databaseConnected: false,
      reason:
        "DATABASE_URL parece producción. Inspección omitida (SAAS_BILLING_SCHEMA_INSPECT_ALLOW_PROD=true para override).",
      databaseUrlMasked: maskUrl(dbUrl),
    };
  }

  const db = DbClient.getInstance();
  try {
    const tableExists = await db.query<{ regclass: string | null }>(
      `SELECT to_regclass('public.subscriptions') AS regclass`,
    );
    if (!tableExists[0]?.regclass) {
      return {
        databaseConnected: true,
        databaseUrlMasked: maskUrl(dbUrl),
        subscriptionsTableExists: false,
      };
    }

    const columns = await db.query<ColumnRow>(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'subscriptions'
       ORDER BY ordinal_position`,
    );

    const indexes = await db.query<IndexRow>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'subscriptions' ORDER BY indexname`,
    );

    const constraints = await db.query<ConstraintRow>(
      `SELECT c.conname, c.contype::text AS contype, pg_get_constraintdef(c.oid) AS pg_get_constraintdef
       FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       JOIN pg_namespace n ON t.relnamespace = n.oid
       WHERE n.nspname = 'public' AND t.relname = 'subscriptions'`,
    );

    const colNames = columns.map((c) => c.column_name);
    const { profile, signals } = detectSchemaProfile(colNames);

    const statusCounts = await db.query<{ status: string | null; n: string }>(
      `SELECT status, COUNT(*)::text AS n FROM subscriptions GROUP BY status ORDER BY n DESC`,
    ).catch(() => [] as { status: string | null; n: string }[]);

    const planCounts = colNames.includes("plan")
      ? await db.query<{ plan: string | null; n: string }>(
          `SELECT plan, COUNT(*)::text AS n FROM subscriptions GROUP BY plan ORDER BY n DESC`,
        ).catch(() => [])
      : [];

    const planIdCounts = colNames.includes("plan_id")
      ? await db.query<{ plan_id: string | null; n: string }>(
          `SELECT plan_id, COUNT(*)::text AS n FROM subscriptions GROUP BY plan_id ORDER BY n DESC`,
        ).catch(() => [])
      : [];

    const totalSubs = await db.query<CountRow>(`SELECT COUNT(*)::text AS n FROM subscriptions`);
    const withStripe = colNames.includes("stripe_subscription_id")
      ? await db.query<CountRow>(
          `SELECT COUNT(*)::text AS n FROM subscriptions WHERE stripe_subscription_id IS NOT NULL AND stripe_subscription_id <> ''`,
        )
      : [{ n: "0" }];

    const saasTenantCount = await db.query<CountRow>(
      `SELECT COUNT(*)::text AS n FROM saas_tenants`,
    ).catch(() => [{ n: "?" }]);

    const saasWithoutBridge = await db.query<CountRow>(
      `SELECT COUNT(*)::text AS n FROM saas_tenants WHERE workspace_id IS NULL`,
    ).catch(() => [{ n: "?" }]);

    const saasPlans = await db.query<{ plan: string; n: string }>(
      `SELECT plan, COUNT(*)::text AS n FROM saas_tenants GROUP BY plan ORDER BY n DESC`,
    ).catch(() => []);

    const syncGap = await db.query<CountRow>(
      `SELECT COUNT(*)::text AS n
       FROM saas_tenants st
       LEFT JOIN subscriptions s ON s.user_id::text = st.user_id::text
       WHERE s.user_id IS NULL`,
    ).catch(() => [{ n: "?" }]);

    const stripeEventsExists = await db.query<{ regclass: string | null }>(
      `SELECT to_regclass('public.stripe_webhook_events') AS regclass`,
    );

    const migrations256 = await db.query<{ name: string }>(
      `SELECT name FROM _migrations WHERE name IN ('256_subscriptions.sql', '308_subscriptions_stripe.sql') ORDER BY name`,
    ).catch(() => []);

    const sampleStats = {
      totalSubscriptions: totalSubs[0]?.n ?? "0",
      withStripeSubscriptionId: withStripe[0]?.n ?? "0",
      statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status ?? "null", r.n])),
      planCounts: Object.fromEntries(planCounts.map((r) => [r.plan ?? "null", r.n])),
      planIdCounts: Object.fromEntries(planIdCounts.map((r) => [r.plan_id ?? "null", r.n])),
      saasTenants: saasTenantCount[0]?.n ?? "?",
      saasWithoutWorkspaceBridge: saasWithoutBridge[0]?.n ?? "?",
      saasPlans: Object.fromEntries(saasPlans.map((r) => [r.plan, r.n])),
      saasOwnersWithoutSubscriptionRow: syncGap[0]?.n ?? "?",
    };

    const conflicts = analyzeConflicts(columns, constraints, sampleStats);

    return {
      databaseConnected: true,
      databaseUrlMasked: maskUrl(dbUrl),
      subscriptionsTableExists: true,
      schemaProfile: profile,
      schemaSignals: signals,
      columns,
      indexes,
      constraints,
      nodeMigrationsApplied: migrations256.map((r) => r.name),
      stripeWebhookEventsTable: Boolean(stripeEventsExists[0]?.regclass),
      sampleStats,
      detectedConflicts: conflicts,
    };
  } finally {
    await db.end();
  }
}

function envWebhookHints(): Record<string, unknown> {
  const hasStripeSecret = Boolean(
    (process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? "").trim(),
  );
  const hasWebhookSecret = Boolean((process.env.STRIPE_WEBHOOK_SECRET ?? "").trim());
  const hasPriceStarter = Boolean((process.env.STRIPE_PRICE_ID_STARTER ?? "").trim());
  const hasPricePro = Boolean((process.env.STRIPE_PRICE_ID_PRO ?? "").trim());
  const hasPriceAgency = Boolean((process.env.STRIPE_PRICE_ID_AGENCY ?? "").trim());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_APP_URL ?? null;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.PYTHON_BACKEND_URL ?? null;

  const inferredWebhookUrls: string[] = [];
  if (appUrl) inferredWebhookUrls.push(`${appUrl.replace(/\/$/, "")}/api/webhooks/stripe`);
  if (apiBase) inferredWebhookUrls.push(`${apiBase.replace(/\/$/, "")}/api/v1/stripe/webhook`);

  return {
    stripeSecretConfigured: hasStripeSecret,
    stripeWebhookSecretConfigured: hasWebhookSecret,
    stripePriceIdsConfigured: {
      starter: hasPriceStarter,
      pro: hasPricePro,
      agency: hasPriceAgency,
    },
    nextPublicAppUrl: appUrl,
    apiBaseUrl: apiBase,
    inferredWebhookEndpointsIfRegisteredInStripe: inferredWebhookUrls,
    note:
      "No se puede confirmar el endpoint activo en Stripe Dashboard sin API/admin. Comparar inferred URLs con Stripe → Developers → Webhooks.",
  };
}

async function main(): Promise<void> {
  loadEnvFiles();

  const report = {
    phase: "0-billing-schema-inspection",
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    codeExpectations: codeExpectations(),
    webhookInventory: webhookInventory(),
    environment: envWebhookHints(),
    database: await inspectDatabase(),
    recommendations: [] as string[],
  };

  const db = report.database as Record<string, unknown>;
  if (db.schemaProfile === "hybrid") {
    report.recommendations.push(
      "Schema híbrido: unificar escrituras webhook antes de SaasBillingSync (Fase 2).",
    );
  }
  if (db.schemaProfile === "node") {
    report.recommendations.push(
      "Schema Node-only: checkout UI Python puede fallar sin Alembic pr01 (workspace_id/plan_id).",
    );
  }
  if (db.schemaProfile === "python") {
    report.recommendations.push(
      "Schema Python-only: webhook Node (/api/webhooks/stripe) puede fallar al escribir columna `plan`.",
    );
  }
  if (!db.databaseConnected) {
    report.recommendations.push(
      "Ejecutar contra DB staging local: docker-compose -f backend/docker-compose.test.yml up -d && DATABASE_URL=postgresql://nelvyon:nelvyon@localhost:5433/nelvyon_test pnpm -C apps/web migrate && re-run inspect.",
    );
  }

  const outPath = path.resolve(__dirname, "../../../docs/SAAS_BILLING_SCHEMA_INSPECTION.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[inspectBillingSchema] Report written to ${outPath}`);
}

main().catch((err: unknown) => {
  console.error("[inspectBillingSchema] FATAL:", err);
  process.exit(1);
});
