import type { AutomationJobSummary } from "@/features/os/types";

export type FetchJobsPage = (params: {
  skip: number;
  limit: number;
  status?: string;
  jobType?: string;
}) => Promise<{ items: AutomationJobSummary[]; total: number; skip: number; limit: number }>;

/** Hard cap so exports cannot loop unbounded in the browser. */
export const MAX_EXPORT_JOB_ROWS = 5000;

/**
 * Fetches job rows page by page until the server reports no more rows or a cap is hit.
 * Does not aggregate beyond concatenating pages — each row is exactly as returned by the API.
 */
export async function collectAutomationJobsPages(
  fetchPage: FetchJobsPage,
  opts: {
    pageSize: number;
    maxRows: number;
    status?: string;
    jobType?: string;
  },
): Promise<AutomationJobSummary[]> {
  const { pageSize, maxRows, status, jobType } = opts;
  const out: AutomationJobSummary[] = [];
  let skip = 0;

  while (out.length < maxRows) {
    const res = await fetchPage({ skip, limit: pageSize, status, jobType });
    for (const row of res.items) {
      if (out.length >= maxRows) break;
      out.push(row);
    }
    if (res.items.length === 0) break;
    if (skip + res.items.length >= res.total) break;
    skip += pageSize;
  }

  return out;
}

/** `from` / `to` are inclusive YYYY-MM-DD; compared to `created_at` prefix when present. */
export function filterJobsByCreatedDateRange(
  jobs: ReadonlyArray<AutomationJobSummary>,
  from?: string,
  to?: string,
): AutomationJobSummary[] {
  if (!from?.trim() && !to?.trim()) return [...jobs];
  const f = from?.trim() || "0000-01-01";
  const t = to?.trim() || "9999-12-31";
  return jobs.filter((j) => {
    const raw = (j.created_at ?? "").slice(0, 10);
    if (!raw) return false;
    return raw >= f && raw <= t;
  });
}
