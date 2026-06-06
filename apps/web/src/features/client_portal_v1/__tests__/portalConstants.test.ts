import { describe, expect, it } from "vitest";

import {
  canReviewDeliverable,
  portalDeliverableStatusLabel,
} from "@/features/client_portal_v1/constants";

describe("portal deliverable status helpers", () => {
  it("labels known statuses", () => {
    expect(portalDeliverableStatusLabel("published")).toBe("Pending your review");
    expect(portalDeliverableStatusLabel("approved_by_client")).toBe("Approved");
    expect(portalDeliverableStatusLabel("changes_requested")).toBe("Changes requested");
  });

  it("only published deliverables are reviewable", () => {
    expect(canReviewDeliverable("published")).toBe(true);
    expect(canReviewDeliverable("approved_by_client")).toBe(false);
    expect(canReviewDeliverable("changes_requested")).toBe(false);
  });
});
