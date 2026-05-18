import { describe, expect, it } from "vitest";

import { nelvyonDsButtonVariants } from "@/design-system/components";
import { nelvyonColorsLight, nelvyonSpacing, nelvyonTypeScale } from "@/design-system/tokens";

describe("NELVYON Design System v1", () => {
  it("exports semantic color scales", () => {
    expect(nelvyonColorsLight.primary).toMatch(/^\d+ \d+% \d+%$/);
    expect(nelvyonColorsLight.success).toBeDefined();
    expect(nelvyonColorsLight.warning).toBeDefined();
    expect(nelvyonColorsLight.destructive).toBeDefined();
  });

  it("defines spacing rhythm", () => {
    expect(nelvyonSpacing[4]).toBe(16);
    expect(nelvyonSpacing[1]).toBe(4);
  });

  it("defines typography scale steps", () => {
    expect(nelvyonTypeScale.length).toBeGreaterThanOrEqual(6);
    expect(nelvyonTypeScale.some((s) => s.id === "body")).toBe(true);
  });

  it("exposes button variant classes for all variants and sizes", () => {
    const primaryMd = nelvyonDsButtonVariants({ variant: "primary", size: "md" });
    expect(primaryMd).toContain("bg-primary");
    expect(nelvyonDsButtonVariants({ variant: "danger", size: "lg" })).toContain("bg-destructive");
    expect(nelvyonDsButtonVariants({ variant: "ghost", size: "sm" })).toContain("hover:bg-muted");
    expect(nelvyonDsButtonVariants({ variant: "secondary", size: "md" })).toContain("border-border");
  });
});
