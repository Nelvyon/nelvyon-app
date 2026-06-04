"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { osPlatformApi } from "@/features/os-shell/api";
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
    recentJobs: [],
    recentOutputs: [],
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

    const [clientsRes, projectsRes, dealsRes, tasksRes, outputsRes, qaRes, statsRes, jobsRes] =
      await Promise.allSettled([
        osPlatformApi.clients(),
        osPlatformApi.projects(),
        osPlatformApi.deals(),
        osPlatformApi.tasks(),
        osPlatformApi.outputs(),
        osPlatformApi.qaDashboard(),
        osPlatformApi.automationStats(),
        osPlatformApi.recentJobs(),
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
        next.invoiceCount = invRes.value.invoices?.length ?? 0;
      } else {
        capture("Facturas", invRes.reason);
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
