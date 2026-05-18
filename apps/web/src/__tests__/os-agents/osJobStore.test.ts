import { describe, expect, it } from "vitest";

import { OsJobStore } from "@nelvyon/os-agents";

describe("OsJobStore", () => {
  it("createJob, updateJobStatus, getJob", async () => {
    const store = new OsJobStore();
    const job = await store.createJob({
      serviceId: "web_premium",
      clientId: "c1",
      steps: [{ name: "a", description: "da" }],
    });

    expect(job.jobId.length).toBeGreaterThan(4);
    expect(job.status).toBe("queued");
    expect(job.steps).toHaveLength(1);
    expect(job.steps[0]?.status).toBe("pending");

    const updated = await store.updateJobStatus(job.jobId, "running");
    expect(updated?.status).toBe("running");

    const read = await store.getJob(job.jobId);
    expect(read?.clientId).toBe("c1");
    expect(read?.serviceId).toBe("web_premium");
  });
});
