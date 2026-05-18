"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";
import { billingApi } from "@/features/billing/api";
import { osApi } from "@/features/os/api";

export function useOsDashboard() {
  const { user } = useAuth();
  const canBilling = user ? can(user.role, "billing", "view") : false;

  const statsQuery = useQuery({
    queryKey: ["os", "stats"],
    queryFn: osApi.stats,
  });

  const jobsQuery = useQuery({
    queryKey: ["os", "recent-jobs"],
    queryFn: osApi.recentJobs,
  });

  const failedJobsQuery = useQuery({
    queryKey: ["os", "failed-jobs-sample"],
    queryFn: osApi.failedJobsSample,
  });

  const webhooksQuery = useQuery({
    queryKey: ["os", "webhooks-rollups"],
    queryFn: osApi.webhooksList,
  });

  const billingQuery = useQuery({
    queryKey: ["billing", "summary"],
    queryFn: billingApi.summary,
    enabled: canBilling,
  });

  return { statsQuery, jobsQuery, failedJobsQuery, webhooksQuery, billingQuery, canBilling };
}
