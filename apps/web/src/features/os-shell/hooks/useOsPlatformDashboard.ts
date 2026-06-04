"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { osPlatformApi } from "@/features/os-shell/api";
import type { OsPlatformDashboardData } from "@/features/os-shell/types";

const PENDING_QA = new Set(["pending", "qa_review", "generating", "draft", "failed"]);

function emptyDashboard(): OsPlatformDashboardData {
  return {
    clientsTotal: null,
    clientsActive: null,
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

    const [clientsRes, projectsRes, outputsRes, qaRes, statsRes, jobsRes] =
      await Promise.allSettled([
        osPlatformApi.clients(),
        osPlatformApi.projects(),
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
