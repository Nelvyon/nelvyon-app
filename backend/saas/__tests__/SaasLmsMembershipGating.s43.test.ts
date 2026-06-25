/**
 * S43 — LMS enrollment gating: blocked without active membership
 */
import { describe, expect, it, vi } from "vitest";
import { SaasLmsService } from "../SaasLmsService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

// Stable mock for membership service — must be at module level for vi.mock hoisting
const mockCheckAccess = vi.fn().mockResolvedValue(false);

vi.mock("../SaasMembershipService", () => ({
  getSaasMembershipService: () => ({ checkAccess: mockCheckAccess }),
  SaasMembershipService: class {},
  SaasMembershipError: class extends Error {},
  resetSaasMembershipServiceForTests: vi.fn(),
}));

describe("SaasLmsService.enroll membership gating", () => {
  it("blocks enroll when course is gated and contact has no active membership", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([])                                 // no existing enrollment
        .mockResolvedValueOnce([{ membership_plan_id: "plan-1" }]) // course is gated
        // checkAccess returns false (from mock above)
    } as unknown as SaasPostgresPort;

    const svc = new SaasLmsService(db);
    await expect(
      svc.enroll("t1", { courseId: "c-gated", contactEmail: "user@test.com" })
    ).rejects.toMatchObject({ code: "MEMBERSHIP_REQUIRED" });

    expect(mockCheckAccess).toHaveBeenCalledWith("t1", "user@test.com", "course", "c-gated");
  });

  it("allows enroll when course is gated and contact has active membership", async () => {
    mockCheckAccess.mockResolvedValueOnce(true);

    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([])                                 // no existing enrollment
        .mockResolvedValueOnce([{ membership_plan_id: "plan-1" }]) // course is gated
        // checkAccess returns true
        .mockResolvedValueOnce([{ id: "enroll-1", course_id: "c-gated", tenant_id: "t1",
          contact_id: null, contact_email: "user@test.com", contact_name: null,
          status: "active", enrolled_at: new Date().toISOString(),
          completed_at: null, created_at: new Date().toISOString() }]) // INSERT enrollment
        .mockResolvedValueOnce([])  // UPDATE enrollments count
    } as unknown as SaasPostgresPort;

    const svc = new SaasLmsService(db);
    const enrollment = await svc.enroll("t1", { courseId: "c-gated", contactEmail: "user@test.com" });
    expect(enrollment.status).toBe("active");
  });

  it("allows enroll when course has no membership_plan_id (public course)", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([])                         // no existing enrollment
        .mockResolvedValueOnce([{ membership_plan_id: null }]) // course is public
        .mockResolvedValueOnce([{ id: "enroll-2", course_id: "c-public", tenant_id: "t1",
          contact_id: null, contact_email: "user@test.com", contact_name: null,
          status: "active", enrolled_at: new Date().toISOString(),
          completed_at: null, created_at: new Date().toISOString() }])
        .mockResolvedValueOnce([])
    } as unknown as SaasPostgresPort;

    const svc = new SaasLmsService(db);
    const enrollment = await svc.enroll("t1", { courseId: "c-public", contactEmail: "user@test.com" });
    expect(enrollment.status).toBe("active");
    expect(mockCheckAccess).not.toHaveBeenCalledWith("t1", "user@test.com", "course", "c-public");
  });
});
