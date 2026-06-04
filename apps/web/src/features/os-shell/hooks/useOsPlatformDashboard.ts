"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { osPlatformApi } from "@/features/os-shell/api";
import { osFinanzasApi } from "@/features/os-shell/finanzas/api";
import {
  countActiveContracts,
  countPendingExpenses,
  countPendingInvoices,
  netCashflowMonth,
  sumPaidExpensesInPeriod,
  sumPaidInvoicesInPeriod,
} from "@/features/os-shell/finanzas/compute";
import type { OsExpense } from "@/features/os-shell/finanzas/expenseTypes";
import { mergeRecentActivity, type ActivityItem } from "@/features/os-shell/lib/recentActivity";
import type { SpanishInvoiceRow } from "@/features/os-shell/finanzas/types";
import { OS_DEAL_OPEN_STATUSES, OS_TASK_ACTIVE_STATUSES } from "@/features/os-shell/constants";
import type { OsPlatformDashboardData } from "@/features/os-shell/types";
import { isTaskOverdue } from "@/features/os-shell/tareas/taskStatus";

const PENDING_QA = new Set(["pending", "qa_review", "generating", "draft", "failed"]);

function emptyDashboard(): OsPlatformDashboardData {
  return {
    clientsTotal: null,
    clientsActive: null,
    dealsOpen: null,
    dealsWon: null,
    tasksPending: null,
    tasksOverdue: null,
    projectsTotal: null,
    projectsActive: null,
    outputsTotal: null,
    outputsPending: null,
    qaPassRate: null,
    automationTotal: null,
    automationPending: null,
    automationFailed: null,
    billingPaidYtd: null,
    billingCurrency: null,
    invoiceCount: null,
    incomeMonth: null,
    incomeYear: null,
    invoicesPendingCount: null,
    contractsActiveCount: null,
    expensesMonth: null,
    expensesPendingCount: null,
    cashflowMonth: null,
    recentJobs: [],
    recentOutputs: [],
    recentActivity: [],
    errors: [],
  };
}

export function useOsPlatformDashboard() {
  const { user } = useAuth();
  const canBilling = user ? can(user.role, "billing", "view") : false;
  const [data, setData] = useState<OsPlatformDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = emptyDashboard();
    const errors: string[] = [];

    const capture = (label: string, err: unknown) => {
      if (err instanceof ApiError && err.status === 403) {
        errors.push(`${label}: sin permisos para este workspace`);
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${label}: ${msg.slice(0, 120)}`);
    };

    const [clientsRes, projectsRes, dealsRes, tasksRes, outputsRes, qaRes, statsRes, jobsRes, expRes] =
      await Promise.allSettled([
        osPlatformApi.clients(),
        osPlatformApi.projects(),
        osPlatformApi.deals(),
        osPlatformApi.tasks(),
        osPlatformApi.outputs(),
        osPlatformApi.qaDashboard(),
        osPlatformApi.automationStats(),
        osPlatformApi.recentJobs(),
        osPlatformApi.expenses(),
      ]);

    if (clientsRes.status === "fulfilled") {
      const items = clientsRes.value.items ?? [];
      next.clientsTotal = clientsRes.value.total ?? items.length;
      next.clientsActive = items.filter(
        (c) => (c as { status?: string }).status === "active" || !(c as { status?: string }).status,
      ).length;
    } else {
      capture("Clientes internos", clientsRes.reason);
    }

    if (dealsRes.status === "fulfilled") {
      const items = (dealsRes.value.items ?? []) as { status?: string }[];
      next.dealsOpen = items.filter((d) => OS_DEAL_OPEN_STATUSES.has(d.status ?? "nuevo")).length;
      next.dealsWon = items.filter((d) => d.status === "ganado").length;
    } else {
      capture("Pipeline (os_deals)", dealsRes.reason);
    }

    if (tasksRes.status === "fulfilled") {
      const items = (tasksRes.value.items ?? []) as {
        status?: string;
        due_date?: string | null;
      }[];
      next.tasksPending = items.filter((t) =>
        OS_TASK_ACTIVE_STATUSES.has(t.status ?? "pendiente"),
      ).length;
      next.tasksOverdue = items.filter(
        (t) =>
          t.status !== "completada" && isTaskOverdue(t.due_date ?? undefined),
      ).length;
    } else {
      capture("Tareas (os_tasks)", tasksRes.reason);
    }

    if (projectsRes.status === "fulfilled") {
      const items = projectsRes.value.items ?? [];
      next.projectsTotal = projectsRes.value.total ?? items.length;
      next.projectsActive = items.filter(
        (p) => p.status !== "completed" && p.status !== "cancelled",
      ).length;
    } else {
      capture("Proyectos", projectsRes.reason);
    }

    if (outputsRes.status === "fulfilled") {
      const items = outputsRes.value.items ?? [];
      next.outputsTotal = outputsRes.value.total ?? items.length;
      next.outputsPending = items.filter((o) =>
        PENDING_QA.has((o.qa_status ?? "pending").toLowerCase()),
      ).length;
      next.recentOutputs = items.slice(0, 6).map((o) => ({
        id: o.id,
        title: o.title || o.output_type || `Output #${o.id}`,
        output_type: o.output_type,
        qa_status: o.qa_status ?? undefined,
        created_at: o.created_at ?? undefined,
      }));
    } else {
      capture("Entregas (outputs)", outputsRes.reason);
    }

    if (qaRes.status === "fulfilled") {
      next.qaPassRate = qaRes.value.pass_rate;
    } else {
      capture("QA", qaRes.reason);
    }

    if (statsRes.status === "fulfilled") {
      next.automationTotal = statsRes.value.total_jobs;
      next.automationPending = statsRes.value.pending;
      next.automationFailed = statsRes.value.failed;
    } else {
      capture("Automatización", statsRes.reason);
    }

    if (jobsRes.status === "fulfilled") {
      next.recentJobs = (jobsRes.value.items ?? []).slice(0, 6).map((j) => ({
        id: j.id,
        job_type: j.job_type,
        status: j.status,
        created_at: j.created_at,
      }));
    } else {
      capture("Jobs recientes", jobsRes.reason);
    }

    const [invStatsRes, invListRes, contractFinRes] = await Promise.allSettled([
      osFinanzasApi.invoiceStats(),
      osFinanzasApi.invoicesList(200),
      osFinanzasApi.contracts(200),
    ]);

    let spanishInvoices: SpanishInvoiceRow[] = [];
    if (invListRes.status === "fulfilled") {
      spanishInvoices = invListRes.value.items ?? [];
    } else {
      capture("Facturas españolas", invListRes.reason);
    }

    let expenses: OsExpense[] = [];
    if (expRes.status === "fulfilled") {
      expenses = (expRes.value.items ?? []) as unknown as OsExpense[];
    } else {
      capture("Gastos (os_expenses)", expRes.reason);
    }

    if (invStatsRes.status === "fulfilled") {
      next.incomeYear = invStatsRes.value.pagado ?? null;
    }

    next.incomeMonth = sumPaidInvoicesInPeriod(spanishInvoices, "month");
    if (next.incomeYear === null) {
      next.incomeYear = sumPaidInvoicesInPeriod(spanishInvoices, "year");
    }
    const pend = countPendingInvoices(spanishInvoices);
    next.invoicesPendingCount = pend.count;
    next.invoiceCount = spanishInvoices.length > 0 ? spanishInvoices.length : null;

    next.expensesMonth = sumPaidExpensesInPeriod(expenses, "month");
    next.expensesPendingCount = countPendingExpenses(expenses).count;
    next.cashflowMonth = netCashflowMonth(next.incomeMonth, next.expensesMonth);

    if (contractFinRes.status === "fulfilled") {
      next.contractsActiveCount = countActiveContracts(contractFinRes.value.items ?? []);
    } else {
      capture("Contratos (finanzas)", contractFinRes.reason);
    }

    const activity: ActivityItem[] = [];
    for (const j of next.recentJobs) {
      activity.push({
        kind: "job",
        label: j.job_type,
        detail: j.status,
        at: j.created_at,
        href: "/os",
      });
    }
    for (const o of next.recentOutputs) {
      activity.push({
        kind: "entrega",
        label: o.title,
        detail: o.qa_status ?? "—",
        at: o.created_at,
        href: `/os/documentos/output/${o.id}`,
      });
    }
    if (tasksRes.status === "fulfilled") {
      for (const t of (tasksRes.value.items ?? []).slice(0, 8) as {
        id?: number;
        title?: string;
        status?: string;
        updated_at?: string;
        created_at?: string;
      }[]) {
        activity.push({
          kind: "tarea",
          label: t.title ?? `Tarea #${t.id}`,
          detail: t.status ?? "—",
          at: t.updated_at ?? t.created_at,
          href: t.id != null ? `/os/tareas/${t.id}` : "/os/tareas",
        });
      }
    }
    for (const ex of expenses.slice(0, 6)) {
      activity.push({
        kind: "gasto",
        label: ex.title,
        detail: `${ex.amount} ${ex.currency} · ${ex.status}`,
        at: ex.updated_at ?? ex.created_at ?? ex.expense_date ?? undefined,
        href: "/os/finanzas",
      });
    }
    next.recentActivity = mergeRecentActivity(activity);

    if (canBilling) {
      const [sumRes, invRes] = await Promise.allSettled([
        osPlatformApi.billingSummary(),
        osPlatformApi.billingInvoices(),
      ]);
      if (sumRes.status === "fulfilled") {
        next.billingPaidYtd = sumRes.value.total_paid_ytd;
        next.billingCurrency = sumRes.value.currency;
      } else {
        capture("Facturación (resumen)", sumRes.reason);
      }
      if (invRes.status === "fulfilled") {
        const billN = invRes.value.invoices?.length ?? 0;
        if (next.invoiceCount === null && billN > 0) next.invoiceCount = billN;
      } else {
        capture("Facturas billing", invRes.reason);
      }
    }

    next.errors = errors;
    setData(next);
    setLoading(false);
  }, [canBilling]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load, canBilling };
}
