import { describe, expect, it } from "vitest";

import {
  projectPriorityLabel,
  projectPriorityTone,
  projectStatusLabel,
  projectStatusTone,
} from "@/features/os-shell/projects/projectStatus";

describe("projectStatus", () => {
  it("labels canonical statuses", () => {
    expect(projectStatusLabel("active")).toBe("Activo");
    expect(projectStatusLabel("archived")).toBe("Archivado");
    expect(projectStatusLabel("unknown")).toBe("unknown");
  });

  it("tones for statuses", () => {
    expect(projectStatusTone("active")).toBe("success");
    expect(projectStatusTone("cancelled")).toBe("danger");
  });
});

describe("projectPriority", () => {
  it("labels canonical priorities", () => {
    expect(projectPriorityLabel("urgent")).toBe("Urgente");
    expect(projectPriorityLabel("low")).toBe("Baja");
  });

  it("tones for priorities", () => {
    expect(projectPriorityTone("urgent")).toBe("danger");
    expect(projectPriorityTone("medium")).toBe("info");
  });
});
