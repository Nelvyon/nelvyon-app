import { describe, expect, it, vi } from "vitest";

import {
  collectAutomationJobsPages,
  filterJobsByCreatedDateRange,
  MAX_EXPORT_JOB_ROWS,
} from "@/features/os/exportJobsPaged";
import type { AutomationJobSummary } from "@/features/os/types";

function job(id: number, created: string): AutomationJobSummary {
  return { id, job_type: "t", status: "completed", created_at: created };
}

describe("collectAutomationJobsPages", () => {
  it("pages until total is exhausted", async () => {
    const fetchPage = vi.fn(async ({ skip, limit }: { skip: number; limit: number }) => {
      if (skip === 0) {
        return { items: [job(1, "2024-01-01"), job(2, "2024-01-02")], total: 3, skip: 0, limit };
      }
      if (skip === 2) {
        return { items: [job(3, "2024-01-03")], total: 3, skip: 2, limit };
      }
      return { items: [], total: 3, skip, limit };
    });

    const rows = await collectAutomationJobsPages(fetchPage, { pageSize: 2, maxRows: MAX_EXPORT_JOB_ROWS });
    expect(rows).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("respects maxRows across pages", async () => {
    let skip = 0;
    const fetchPage = vi.fn(async ({ limit }: { skip: number; limit: number }) => {
      const batch = Array.from({ length: limit }, (_, i) => job(skip + i + 1, "2024-06-01"));
      skip += limit;
      return { items: batch, total: 999, skip: skip - limit, limit };
    });

    const rows = await collectAutomationJobsPages(fetchPage, { pageSize: 10, maxRows: 25 });
    expect(rows).toHaveLength(25);
  });
});

describe("filterJobsByCreatedDateRange", () => {
  it("filters inclusive by YYYY-MM-DD", () => {
    const rows = [job(1, "2024-03-01T10:00:00Z"), job(2, "2024-04-15"), job(3, "2024-05-20")];
    const out = filterJobsByCreatedDateRange(rows, "2024-04-01", "2024-04-30");
    expect(out.map((r) => r.id)).toEqual([2]);
  });
});
