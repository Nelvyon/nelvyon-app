import { describe, expect, it } from "vitest";

import {
  canReviewDeliverable,
  portalDeliverableStatusLabel,
  portalDeliverableTypeLabel,
} from "@/features/client_portal_v1/constants";

describe("portal deliverable status helpers", () => {
  it("labels known statuses", () => {
    expect(portalDeliverableStatusLabel("published")).toBe("Pendiente de revisión");
    expect(portalDeliverableStatusLabel("approved_by_client")).toBe("Aprobado");
    expect(portalDeliverableStatusLabel("changes_requested")).toBe("Cambios solicitados");
  });

  it("labels known types", () => {
    expect(portalDeliverableTypeLabel("landing")).toBe("Landing page");
    expect(portalDeliverableTypeLabel("seo")).toBe("Informe SEO");
  });

  it("only published deliverables are reviewable", () => {
    expect(canReviewDeliverable("published")).toBe(true);
    expect(canReviewDeliverable("approved_by_client")).toBe(false);
    expect(canReviewDeliverable("changes_requested")).toBe(false);
  });
});
