import { describe, expect, it } from "vitest";
import {
  isErpRelationalDualWriteEnabled,
  isErpRelationalReadEnabled,
  resolveErpRelationalMode,
} from "../erp/erpRelationalFlags";

describe("erpDualWritePrep — ADR-062 fail-closed flags (no DB)", () => {
  it("defaults OFF when unset", () => {
    const env = {} as NodeJS.ProcessEnv;
    expect(isErpRelationalDualWriteEnabled(env)).toBe(false);
    expect(isErpRelationalReadEnabled(env)).toBe(false);
    expect(resolveErpRelationalMode(env)).toEqual({
      dualWrite: false,
      read: false,
      misconfigured: false,
    });
  });

  it("rejects non-1 truthy strings", () => {
    const env = {
      NELVYON_ERP_RELATIONAL_DUAL_WRITE: "true",
      NELVYON_ERP_RELATIONAL_READ: "yes",
    } as NodeJS.ProcessEnv;
    expect(isErpRelationalDualWriteEnabled(env)).toBe(false);
    expect(isErpRelationalReadEnabled(env)).toBe(false);
  });

  it("enables dual-write only on exact 1", () => {
    const env = {
      NELVYON_ERP_RELATIONAL_DUAL_WRITE: "1",
      NELVYON_ERP_RELATIONAL_READ: "0",
    } as NodeJS.ProcessEnv;
    expect(resolveErpRelationalMode(env)).toEqual({
      dualWrite: true,
      read: false,
      misconfigured: false,
    });
  });

  it("READ=1 without DUAL_WRITE is misconfigured and read stays off", () => {
    const env = {
      NELVYON_ERP_RELATIONAL_DUAL_WRITE: "0",
      NELVYON_ERP_RELATIONAL_READ: "1",
    } as NodeJS.ProcessEnv;
    expect(resolveErpRelationalMode(env)).toEqual({
      dualWrite: false,
      read: false,
      misconfigured: true,
    });
  });

  it("both 1 → dualWrite+read on (cutover mode; not live in prod)", () => {
    const env = {
      NELVYON_ERP_RELATIONAL_DUAL_WRITE: "1",
      NELVYON_ERP_RELATIONAL_READ: "1",
    } as NodeJS.ProcessEnv;
    expect(resolveErpRelationalMode(env)).toEqual({
      dualWrite: true,
      read: true,
      misconfigured: false,
    });
  });
});
