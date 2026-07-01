import { describe, expect, it, vi } from "vitest";

import {
  SaasCrmDedupeService,
  resetSaasCrmDedupeServiceForTests,
} from "../SaasCrmDedupeService";
import {
  SaasDashboardLayoutService,
  DEFAULT_DASHBOARD_WIDGETS,
  resetSaasDashboardLayoutServiceForTests,
} from "../SaasDashboardLayoutService";

beforeEach(() => {
  resetSaasCrmDedupeServiceForTests();
  resetSaasDashboardLayoutServiceForTests();
});

describe("SaasCrmDedupeService", () => {
  it("scanDuplicates groups by email", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([
        { id: "a", tenant_id: "t1", name: "Ana", email: "a@test.com", phone: null, company: null, position: null, status: "lead", pipeline_stage: "new", value: 0, notes: null, tags: [], created_at: new Date(), updated_at: new Date() },
        { id: "b", tenant_id: "t1", name: "Ana B", email: "A@test.com", phone: null, company: null, position: null, status: "lead", pipeline_stage: "new", value: 0, notes: null, tags: [], created_at: new Date(), updated_at: new Date() },
        { id: "c", tenant_id: "t1", name: "Bob", email: "b@test.com", phone: null, company: null, position: null, status: "lead", pipeline_stage: "new", value: 0, notes: null, tags: [], created_at: new Date(), updated_at: new Date() },
      ]),
    };
    const svc = new SaasCrmDedupeService(db);
    const groups = await svc.scanDuplicates("t1");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.count).toBe(2);
    expect(groups[0]?.contactIds).toEqual(["a", "b"]);
  });
});

describe("SaasDashboardLayoutService", () => {
  it("returns default widgets when column missing", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([{ dashboard_layout: null }]),
    };
    const svc = new SaasDashboardLayoutService(db);
    const layout = await svc.getLayout("tenant-1");
    expect(layout.widgets).toEqual([...DEFAULT_DASHBOARD_WIDGETS]);
  });

  it("filters unknown widget ids on update", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([{ dashboard_layout: { widgets: ["kpis", "bogus"] } }]),
    };
    const svc = new SaasDashboardLayoutService(db);
    const layout = await svc.updateLayout("tenant-1", { widgets: ["kpis", "bogus"] as never });
    expect(layout.widgets).toEqual(["kpis"]);
  });
});
