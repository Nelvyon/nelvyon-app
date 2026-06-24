import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasLmsService, SaasLmsError, resetSaasLmsServiceForTests } from "../SaasLmsService";

beforeEach(() => { resetSaasLmsServiceForTests(); });

const TENANT = "tenant-lms";
const now = new Date();

const courseRow = {
  id: "c1", tenant_id: TENANT, title: "Marketing Digital con IA",
  description: "Curso completo", slug: "marketing-digital-con-ia",
  cover_image: null, price: "97.00", status: "draft",
  modules_count: 0, enrollments: 0, created_at: now, updated_at: now,
};

const enrollRow = {
  id: "e1", course_id: "c1", tenant_id: TENANT, contact_id: null,
  contact_email: "alumno@example.com", contact_name: "Ana López",
  status: "active", enrolled_at: now, completed_at: null, created_at: now,
};

function makeDb(calls: unknown[][] = []) {
  let i = 0;
  return { query: vi.fn(async () => calls[i++] ?? []) };
}

describe("SaasLmsService.listCourses", () => {
  it("returns empty when no courses", async () => {
    const svc = new SaasLmsService(makeDb([[]]));
    expect(await svc.listCourses(TENANT)).toEqual([]);
  });

  it("maps db rows correctly", async () => {
    const svc = new SaasLmsService(makeDb([[courseRow]]));
    const courses = await svc.listCourses(TENANT);
    expect(courses).toHaveLength(1);
    expect(courses[0].title).toBe("Marketing Digital con IA");
    expect(courses[0].price).toBe(97);
    expect(courses[0].status).toBe("draft");
  });
});

describe("SaasLmsService.createCourse", () => {
  it("throws VALIDATION for empty title", async () => {
    const svc = new SaasLmsService(makeDb());
    await expect(svc.createCourse(TENANT, { title: "  " }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("creates course with slug", async () => {
    const svc = new SaasLmsService(makeDb([[courseRow]]));
    const course = await svc.createCourse(TENANT, { title: "Marketing Digital con IA", price: 97 });
    expect(course.id).toBe("c1");
    expect(course.price).toBe(97);
  });
});

describe("SaasLmsService.publishCourse", () => {
  it("throws NOT_FOUND for missing course", async () => {
    const svc = new SaasLmsService(makeDb([[]]));
    await expect(svc.publishCourse(TENANT, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("publishes course and returns published status", async () => {
    const published = { ...courseRow, status: "published" };
    const svc = new SaasLmsService(makeDb([[published]]));
    const course = await svc.publishCourse(TENANT, "c1");
    expect(course.status).toBe("published");
  });
});

describe("SaasLmsService.deleteCourse", () => {
  it("throws NOT_FOUND for missing course", async () => {
    const svc = new SaasLmsService(makeDb([[]]));
    await expect(svc.deleteCourse(TENANT, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes existing course", async () => {
    const svc = new SaasLmsService(makeDb([[{ id: "c1" }]]));
    await expect(svc.deleteCourse(TENANT, "c1")).resolves.toBeUndefined();
  });
});

describe("SaasLmsService.enroll", () => {
  it("throws VALIDATION for missing courseId", async () => {
    const svc = new SaasLmsService(makeDb());
    await expect(svc.enroll(TENANT, { courseId: "", contactEmail: "x@y.com" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION for missing email", async () => {
    const svc = new SaasLmsService(makeDb());
    await expect(svc.enroll(TENANT, { courseId: "c1", contactEmail: "" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws CONFLICT if already enrolled", async () => {
    const svc = new SaasLmsService(makeDb([[{ id: "e-existing" }]]));
    await expect(svc.enroll(TENANT, { courseId: "c1", contactEmail: "alumno@example.com" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates enrollment successfully", async () => {
    // no existing enrollment, insert row, update count
    const svc = new SaasLmsService(makeDb([[], [enrollRow], []]));
    const enrollment = await svc.enroll(TENANT, { courseId: "c1", contactEmail: "alumno@example.com", contactName: "Ana López" });
    expect(enrollment.id).toBe("e1");
    expect(enrollment.contactEmail).toBe("alumno@example.com");
    expect(enrollment.status).toBe("active");
  });
});

describe("SaasLmsService.issueCertificate", () => {
  it("throws NOT_FOUND for missing enrollment", async () => {
    const svc = new SaasLmsService(makeDb([[]]));
    await expect(svc.issueCertificate(TENANT, "e-bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("issues certificate and completes enrollment", async () => {
    const certRow = {
      id: "cert1", enrollment_id: "e1", tenant_id: TENANT,
      certificate_url: "https://cdn.nelvyon.com/certs/e1.pdf", issued_at: now,
    };
    const svc = new SaasLmsService(makeDb([[enrollRow], [], [certRow]]));
    const cert = await svc.issueCertificate(TENANT, "e1", "https://cdn.nelvyon.com/certs/e1.pdf");
    expect(cert.id).toBe("cert1");
    expect(cert.certificateUrl).toBe("https://cdn.nelvyon.com/certs/e1.pdf");
  });
});

describe("SaasLmsError", () => {
  it("has correct name and code", () => {
    const e = new SaasLmsError("msg", "VALIDATION");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("VALIDATION");
    expect(e.name).toBe("SaasLmsError");
  });
});
