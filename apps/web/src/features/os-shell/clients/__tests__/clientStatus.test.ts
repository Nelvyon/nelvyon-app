import { describe, expect, it } from "vitest";

import { clientStatusLabel, clientStatusTone } from "@/features/os-shell/clients/clientStatus";

describe("clientStatus", () => {
  it("maps active and archived", () => {
    expect(clientStatusLabel("active")).toBe("Activo");
    expect(clientStatusLabel("archived")).toBe("Archivado");
    expect(clientStatusTone("active")).toBe("success");
    expect(clientStatusTone("archived")).toBe("neutral");
  });
});
