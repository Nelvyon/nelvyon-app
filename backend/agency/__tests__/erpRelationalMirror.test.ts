/**
 * Unit tests — ADR-062 relational mirror (dual-write prep → live mirror).
 */
import { describe, expect, it } from "vitest";
import { resolveErpRelationalMode } from "../erp/erpRelationalFlags";
import { mirrorErpDomainToRelational } from "../erp/ErpRelationalMirror";

describe("ErpRelationalMirror — fail-closed without flag", () => {
  it("does not mirror when dual-write flag unset", async () => {
    const queries: string[] = [];
    const client = {
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [] };
      },
    } as never;
    const r = await mirrorErpDomainToRelational(
      client,
      "tenant-a",
      "purchases",
      {
        suppliers: {
          "11111111-1111-1111-1111-111111111111": {
            name: "Acme",
            category: "parts",
            paymentTermsNote: "net30",
            status: "active",
          },
        },
      },
      {},
    );
    expect(r.mirrored).toBe(false);
    expect(r.entities).toBe(0);
    expect(queries).toEqual([]);
  });

  it("mirrors suppliers when DUAL_WRITE=1", async () => {
    const queries: string[] = [];
    const client = {
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [] };
      },
    } as never;
    const r = await mirrorErpDomainToRelational(
      client,
      "tenant-a",
      "purchases",
      {
        suppliers: {
          "11111111-1111-1111-1111-111111111111": {
            name: "Acme",
            category: "parts",
            paymentTermsNote: "net30",
            status: "active",
          },
        },
      },
      { NELVYON_ERP_RELATIONAL_DUAL_WRITE: "1" },
    );
    expect(r.mirrored).toBe(true);
    expect(r.entities).toBe(1);
    expect(queries.some((q) => q.includes("erp_suppliers"))).toBe(true);
  });

  it("resolveErpRelationalMode stays fail-closed for READ without DUAL_WRITE", () => {
    expect(resolveErpRelationalMode({ NELVYON_ERP_RELATIONAL_READ: "1" })).toEqual({
      dualWrite: false,
      read: false,
      misconfigured: true,
    });
  });
});
