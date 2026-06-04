"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/core/api/types";
import { TERMINAL_PROJECT_STATUSES } from "@/features/os-shell/constants";

import { osFinanzasApi } from "./api";
import {
  countActiveContracts,
  countPendingExpenses,
  countPendingInvoices,
  netCashflowMonth,
  sumPaidExpensesInPeriod,
  sumPaidInvoicesInPeriod,
} from "./compute";
import { osExpensesApi } from "./expensesApi";
import type { OsFinanzasData } from "./types";

function empty(): OsFinanzasData {
  return {
    invoiceStats: null,
    invoices: [],
    billingSummary: null,
    billingInvoices: [],
    contracts: [],
    dealsWonValue: null,
    dealsWonCount: null,
    clientsActive: null,
    projectsActive: null,
    incomeMonth: null,
    incomeYear: null,
    invoicesPendingCount: null,
    invoicesPendingAmount: null,
    contractsActiveCount: null,
    platformPaidYtd: null,
    expenses: [],
    expensesMonth: null,
    expensesYear: null,
    expensesPendingCount: null,
    expensesPendingAmount: null,
    cashflowMonth: null,
    cashflowLedger: [],
    currency: "EUR",
    errors: [],
  };
}

export function useOsFinanzas(canBilling: boolean) {
  const [data, setData] = useState<OsFinanzasData>(empty);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = empty();
    const errors: string[] = [];

    const capture = (label: string, err: unknown) => {
      if (err instanceof ApiError && err.status === 403) {
        errors.push(`${label}: sin permisos`);
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${label}: ${msg.slice(0, 100)}`);
    };

    const [statsRes, invRes, contractRes, clientsRes, projectsRes, dealsRes, expRes, cfRes] =
      await Promise.allSettled([
        osFinanzasApi.invoiceStats(),
        osFinanzasApi.invoicesList(300),
        osFinanzasApi.contracts(300),
        osFinanzasApi.clients(),
        osFinanzasApi.projects(),
        osFinanzasApi.dealsWon(),
        osExpensesApi.list({ limit: 500 }),
        osFinanzasApi.cashflow(300),
      ]);

    if (statsRes.status === "fulfilled") {
      next.invoiceStats = statsRes.value;
      if (statsRes.value.currency) next.currency = statsRes.value.currency;
    } else {
      capture("Estadísticas facturas", statsRes.reason);
    }

    if (invRes.status === "fulfilled") {
      next.invoices = invRes.value.items ?? [];
    } else {
      capture("Listado facturas", invRes.reason);
    }

    if (contractRes.status === "fulfilled") {
      next.contracts = contractRes.value.items ?? [];
    } else {
      capture("Contratos", contractRes.reason);
    }

    if (clientsRes.status === "fulfilled") {
      const items = clientsRes.value.items ?? [];
      next.clientsActive = items.length > 0 ? items.length : null;
    } else {
      capture("Clientes", clientsRes.reason);
    }

    if (projectsRes.status === "fulfilled") {
      const items = projectsRes.value.items ?? [];
      next.projectsActive = items.filter(
        (p) => !TERMINAL_PROJECT_STATUSES.has((p.status ?? "").toLowerCase()),
      ).length;
      if (items.length === 0) next.projectsActive = null;
    } else {
      capture("Proyectos", projectsRes.reason);
    }

    if (dealsRes.status === "fulfilled") {
      const won = dealsRes.value.items ?? [];
      next.dealsWonCount = won.length > 0 ? won.length : null;
      if (won.length > 0) {
        next.dealsWonValue = won.reduce(
          (s, d) => s + (d.estimated_value ?? 0),
          0,
        );
      }
    } else {
      capture("Oportunidades ganadas", dealsRes.reason);
    }

    if (canBilling) {
      const [sumRes, billInvRes] = await Promise.allSettled([
        osFinanzasApi.billingSummary(),
        osFinanzasApi.billingInvoices(),
      ]);
      if (sumRes.status === "fulfilled") {
        next.billingSummary = {
          plan_id: sumRes.value.plan_id,
          plan_label: sumRes.value.plan_label,
          monthly_cost: sumRes.value.monthly_cost,
          total_paid_ytd: sumRes.value.total_paid_ytd,
          currency: sumRes.value.currency,
        };
        next.platformPaidYtd = sumRes.value.total_paid_ytd;
        next.currency = sumRes.value.currency || next.currency;
      } else {
        capture("Billing resumen", sumRes.reason);
      }
      if (billInvRes.status === "fulfilled") {
        next.billingInvoices = billInvRes.value.invoices ?? [];
      } else {
        capture("Billing facturas", billInvRes.reason);
      }
    }

    if (expRes.status === "fulfilled") {
      next.expenses = expRes.value.items ?? [];
    } else {
      capture("Gastos (os_expenses)", expRes.reason);
    }

    if (cfRes.status === "fulfilled") {
      next.cashflowLedger = cfRes.value.items ?? [];
    } else {
      capture("Flujo de caja (os_cashflow)", cfRes.reason);
    }

    next.incomeMonth = sumPaidInvoicesInPeriod(next.invoices, "month");
    next.incomeYear = sumPaidInvoicesInPeriod(next.invoices, "year");
    const pend = countPendingInvoices(next.invoices);
    next.invoicesPendingCount = pend.count;
    next.invoicesPendingAmount = pend.amount;
    next.contractsActiveCount = countActiveContracts(next.contracts);

    next.expensesMonth = sumPaidExpensesInPeriod(next.expenses, "month");
    next.expensesYear = sumPaidExpensesInPeriod(next.expenses, "year");
    const expPend = countPendingExpenses(next.expenses);
    next.expensesPendingCount = expPend.count;
    next.expensesPendingAmount = expPend.amount;
    next.cashflowMonth = netCashflowMonth(next.incomeMonth, next.expensesMonth);

    next.errors = errors;
    setData(next);
    setLoading(false);
  }, [canBilling]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load };
}
