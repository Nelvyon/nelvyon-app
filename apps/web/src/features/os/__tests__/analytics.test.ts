import {
  buildOsJobsCsv,
  buildOsPlaybook,
  countRetriesInSample,
  mergeJobExportRows,
  rollupWebhooks,
} from "@/features/os/analytics";
import type { AutomationJobSummary } from "@/features/os/types";

describe("OS analytics helpers", () => {
  it("rolls up webhook active vs inactive", () => {
    expect(
      rollupWebhooks([
        { is_active: true },
        { is_active: false },
        {},
      ]),
    ).toEqual({ total: 3, active: 2, inactive: 1 });
  });

  it("counts retries only when source mentions retry", () => {
    const jobs: AutomationJobSummary[] = [
      { id: 1, job_type: "x", status: "done", source: "retry_manual" },
      { id: 2, job_type: "x", status: "done", source: "webhook" },
    ];
    expect(countRetriesInSample(jobs)).toBe(1);
  });

  it("mergeJobExportRows prefers failed list over recent for same id", () => {
    const recent: AutomationJobSummary[] = [{ id: 1, job_type: "a", status: "pending", source: "" }];
    const failed: AutomationJobSummary[] = [
      { id: 1, job_type: "a", status: "failed", source: "", error_message: "boom" },
    ];
    const merged = mergeJobExportRows(recent, failed);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("failed");
    expect(merged[0]?.error_message).toBe("boom");
  });

  it("buildOsJobsCsv includes header row", () => {
    const csv = buildOsJobsCsv([
      { id: 9, job_type: "t", status: "ok", source: "", client_name: "", created_at: "2024-01-01" },
    ]);
    expect(csv.split("\n")[0]).toContain("job_type");
    expect(csv).toContain("9");
  });

  it("buildOsPlaybook surfaces webhook inactivity", () => {
    const items = buildOsPlaybook({
      statsFailed: 0,
      statsPending: 0,
      webhookInactive: 2,
      metersAtRisk: [],
    });
    expect(items[0]?.href).toBe("/automations/webhooks");
  });
});
