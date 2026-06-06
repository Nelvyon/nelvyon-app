import { describe, expect, it } from "vitest";

import { validateProjectForm } from "@/features/os-shell/projects/validateProjectForm";

const CLIENT_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("validateProjectForm", () => {
  it("requires client UUID and name", () => {
    expect(validateProjectForm({ client_id: "", name: "" })).toMatch(/cliente/i);
    expect(validateProjectForm({ client_id: CLIENT_UUID, name: "" })).toMatch(/nombre/i);
    expect(validateProjectForm({ client_id: CLIENT_UUID, name: "Proyecto" })).toBeNull();
  });

  it("rejects invalid budget", () => {
    expect(
      validateProjectForm({ client_id: CLIENT_UUID, name: "P", budget: -1 }),
    ).toMatch(/presupuesto/i);
  });

  it("rejects start_date after due_date", () => {
    expect(
      validateProjectForm({
        client_id: CLIENT_UUID,
        name: "P",
        start_date: "2026-06-10",
        due_date: "2026-06-01",
      }),
    ).toMatch(/fecha/i);
  });
});
