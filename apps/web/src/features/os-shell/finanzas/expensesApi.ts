import { apiClient } from "@/core/api";
import { entityListUrl } from "@/features/os-shell/lib/entityQuery";

import type { OsExpense, OsExpenseListResponse, OsExpenseWriteInput } from "./expenseTypes";

const BASE = "/api/v1/entities/os_expenses";

export const osExpensesApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    query?: Record<string, string | number>;
    sort?: string;
  }) =>
    apiClient.get<OsExpenseListResponse>(
      entityListUrl(BASE, {
        skip: params?.skip,
        limit: params?.limit ?? 500,
        query: params?.query,
        sort: params?.sort ?? "-id",
      }),
      { tenantScoped: true },
    ),

  create: (body: OsExpenseWriteInput) =>
    apiClient.post<OsExpense, OsExpenseWriteInput>(BASE, { tenantScoped: true, body }),

  update: (id: number, body: Partial<OsExpenseWriteInput>) =>
    apiClient.put<OsExpense, Partial<OsExpenseWriteInput>>(`${BASE}/${id}`, {
      tenantScoped: true,
      body,
    }),
};
