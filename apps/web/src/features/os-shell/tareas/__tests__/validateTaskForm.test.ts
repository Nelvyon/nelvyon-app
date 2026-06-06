import { describe, expect, it } from "vitest";

import { validateTaskForm } from "@/features/os-shell/tareas/validateTaskForm";

describe("validateTaskForm", () => {
  it("requires title", () => {
    expect(validateTaskForm({ title: "" })).toMatch(/título/i);
    expect(validateTaskForm({ title: "Ok" })).toBeNull();
  });
});
