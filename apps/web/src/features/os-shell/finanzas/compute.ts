import type { SpanishInvoiceRow } from "./types";

export function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function periodMonth(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 7) return null;
  return iso.slice(0, 7);
}

function periodYear(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 4) return null;
  return iso.slice(0, 4);
}

/** Ingresos cobrados: facturas con status paid en el periodo (por paid_at o created_at). */
export function sumPaidInvoicesInPeriod(
  invoices: SpanishInvoiceRow[],
  monthOrYear: "month" | "year",
): number | null {
  if (invoices.length === 0) return null;
  const now = new Date();
  const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetYear = String(now.getFullYear());

  let sum = 0;
  let matched = 0;
  for (const inv of invoices) {
    if ((inv.status ?? "").toLowerCase() !== "paid") continue;
    const ref = inv.paid_at ?? inv.created_at;
    const p = monthOrYear === "month" ? periodMonth(ref) : periodYear(ref);
    const ok = monthOrYear === "month" ? p === targetMonth : p === targetYear;
    if (!ok) continue;
    const t = inv.total ?? 0;
    sum += t;
    matched += 1;
  }
  return matched > 0 ? sum : null;
}

export function countPendingInvoices(invoices: SpanishInvoiceRow[]): {
  count: number | null;
  amount: number | null;
} {
  const pending = invoices.filter((i) => (i.status ?? "").toLowerCase() === "sent");
  if (pending.length === 0 && invoices.length === 0) return { count: null, amount: null };
  if (pending.length === 0) return { count: 0, amount: 0 };
  const amount = pending.reduce((s, i) => s + (i.total ?? 0), 0);
  return { count: pending.length, amount };
}

const ACTIVE_CONTRACT = new Set([
  "active",
  "signed",
  "in_progress",
  "vigente",
  "activo",
]);

export function countActiveContracts(
  contracts: { status?: string | null }[],
): number | null {
  if (contracts.length === 0) return null;
  return contracts.filter((c) =>
    ACTIVE_CONTRACT.has((c.status ?? "").toLowerCase()),
  ).length;
}

export interface ExpensePeriodRow {
  amount: number;
  status?: string | null;
  paid_at?: string | null;
  expense_date?: string | null;
}

/** Gastos pagados en el periodo (por paid_at o expense_date). */
export function sumPaidExpensesInPeriod(
  expenses: ExpensePeriodRow[],
  monthOrYear: "month" | "year",
): number | null {
  if (expenses.length === 0) return null;
  const now = new Date();
  const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetYear = String(now.getFullYear());

  let sum = 0;
  let matched = 0;
  for (const ex of expenses) {
    if ((ex.status ?? "").toLowerCase() !== "pagado") continue;
    const ref = ex.paid_at ?? ex.expense_date;
    const p = monthOrYear === "month" ? periodMonth(ref) : periodYear(ref);
    const ok = monthOrYear === "month" ? p === targetMonth : p === targetYear;
    if (!ok) continue;
    sum += ex.amount ?? 0;
    matched += 1;
  }
  return matched > 0 ? sum : null;
}

export function countPendingExpenses(expenses: ExpensePeriodRow[]): {
  count: number | null;
  amount: number | null;
} {
  const pending = expenses.filter((e) => (e.status ?? "").toLowerCase() === "pendiente");
  if (pending.length === 0 && expenses.length === 0) return { count: null, amount: null };
  if (pending.length === 0) return { count: 0, amount: 0 };
  const amount = pending.reduce((s, e) => s + (e.amount ?? 0), 0);
  return { count: pending.length, amount };
}

/** Flujo neto del mes = ingresos cobrados − gastos pagados (solo si ambos existen). */
export function netCashflowMonth(
  incomeMonth: number | null,
  expensesMonth: number | null,
): number | null {
  if (incomeMonth === null && expensesMonth === null) return null;
  if (incomeMonth === null || expensesMonth === null) {
    if (incomeMonth !== null) return incomeMonth;
    if (expensesMonth !== null) return -expensesMonth;
    return null;
  }
  return incomeMonth - expensesMonth;
}
