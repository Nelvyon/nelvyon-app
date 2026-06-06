import { describe, expect, it } from "vitest";

import {
  availableWorkflowActions,
  deliverableStatusLabel,
  deliverableStatusTone,
} from "@/features/os-shell/deliverables/deliverableStatus";

describe("deliverableStatus", () => {
  it("maps known status labels", () => {
    expect(deliverableStatusLabel("draft")).toBe("Borrador");
    expect(deliverableStatusLabel("published")).toBe("Publicado");
    expect(deliverableStatusLabel("changes_requested")).toBe("Cambios solicitados");
  });

  it("falls back for unknown status", () => {
    expect(deliverableStatusLabel("custom_state")).toBe("custom state");
  });

  it("assigns tones", () => {
    expect(deliverableStatusTone("rejected")).toBe("danger");
    expect(deliverableStatusTone("approved")).toBe("success");
    expect(deliverableStatusTone("unknown")).toBe("neutral");
  });

  it("returns workflow actions per status", () => {
    expect(availableWorkflowActions("draft")).toEqual(["submit-review"]);
    expect(availableWorkflowActions("in_review")).toEqual(["deliver", "reject"]);
    expect(availableWorkflowActions("delivered")).toEqual(["approve", "reject"]);
    expect(availableWorkflowActions("approved")).toEqual(["publish"]);
    expect(availableWorkflowActions("changes_requested")).toEqual(["create-revision"]);
    expect(availableWorkflowActions("published")).toEqual([]);
  });
});
