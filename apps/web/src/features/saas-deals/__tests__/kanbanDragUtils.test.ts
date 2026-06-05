import { describe, expect, it } from "vitest";

import {
  applyOptimisticStageChange,
  resolveKanbanDrop,
  shouldMoveDealOnDrop,
  shouldSuppressKanbanClick,
} from "../kanbanDragUtils";
import type { SaasDeal } from "../types";

const deal = (overrides: Partial<SaasDeal> = {}): SaasDeal => ({
  id: "d1",
  tenantId: "t1",
  contactId: "c1",
  title: "Acme renewal",
  value: 5000,
  currency: "EUR",
  stage: "new",
  probability: 10,
  expectedCloseDate: null,
  source: null,
  ownerUserId: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("kanbanDragUtils", () => {
  it("shouldMoveDealOnDrop returns false for same stage", () => {
    expect(shouldMoveDealOnDrop("new", "new")).toBe(false);
  });

  it("shouldMoveDealOnDrop returns true for different stages", () => {
    expect(shouldMoveDealOnDrop("new", "contacted")).toBe(true);
  });

  it("resolveKanbanDrop returns move payload when stage changes", () => {
    const deals = [deal()];
    expect(resolveKanbanDrop(deals, "d1", "contacted")).toEqual({
      deal: deals[0],
      stage: "contacted",
    });
  });

  it("resolveKanbanDrop returns null when dropping on same column", () => {
    expect(resolveKanbanDrop([deal()], "d1", "new")).toBeNull();
  });

  it("resolveKanbanDrop returns null when deal id is missing", () => {
    expect(resolveKanbanDrop([deal()], null, "contacted")).toBeNull();
  });

  it("applyOptimisticStageChange updates only matching deal", () => {
    const deals = [deal(), deal({ id: "d2", title: "Other" })];
    const next = applyOptimisticStageChange({ deals, total: 2 }, "d1", "qualified");
    expect(next.deals[0]?.stage).toBe("qualified");
    expect(next.deals[1]?.stage).toBe("new");
  });

  it("shouldSuppressKanbanClick blocks clicks shortly after drag", () => {
    const endedAt = 1000;
    expect(shouldSuppressKanbanClick(endedAt, 1100)).toBe(true);
    expect(shouldSuppressKanbanClick(endedAt, 1300)).toBe(false);
  });
});
