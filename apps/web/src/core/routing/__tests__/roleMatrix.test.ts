import { can } from "@/core/routing/roleMatrix";

describe("role matrix", () => {
  it("allows operator to create CRM items", () => {
    expect(can("operator", "crm", "create")).toBe(true);
  });

  it("blocks member from deleting CRM items", () => {
    expect(can("member", "crm", "delete")).toBe(false);
  });
});
