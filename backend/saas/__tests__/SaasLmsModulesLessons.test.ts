import { describe, it, expect } from "vitest";
import { SaasLmsService, SaasLmsError } from "../SaasLmsService";

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

const TENANT = "tenant-1";
const COURSE_ID = "course-uuid-1";
const MODULE_ID = "mod-uuid-1";
const LESSON_ID = "lesson-uuid-1";
const ENROLLMENT_ID = "enroll-uuid-1";

const baseModRow = { id: MODULE_ID, course_id: COURSE_ID, tenant_id: TENANT, title: "Módulo 1", description: null, mod_order: 1, lessons_count: 0, created_at: new Date() };
const baseLessonRow = { id: LESSON_ID, module_id: MODULE_ID, tenant_id: TENANT, title: "Lección 1", content_type: "text", content: null, video_url: null, duration_minutes: null, lesson_order: 1, quiz_json: null, created_at: new Date() };

function makeDb(responses: Record<string, unknown[][]> = {}): DbPort & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      calls.push(sql.trim().split(/\s+/)[0].toUpperCase() + " " + sql.trim().replace(/\s+/g, " ").slice(0, 60));
      for (const [key, rows] of Object.entries(responses)) {
        if (sql.toLowerCase().includes(key.toLowerCase())) return rows as T[];
      }
      return [] as T[];
    },
  };
}

// ── createModule ──────────────────────────────────────────────────────────────

describe("SaasLmsService.createModule", () => {
  it("throws VALIDATION when title is empty", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.createModule(TENANT, COURSE_ID, { title: "" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws NOT_FOUND when course does not exist", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.createModule(TENANT, COURSE_ID, { title: "Módulo" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("inserts module and increments course modules_count", async () => {
    const db = makeDb({ "select id from saas_lms_courses": [{ id: COURSE_ID }], "select max(mod_order)": [{ max: 0 }], "insert into saas_lms_modules": [{ ...baseModRow }] });
    const svc = new SaasLmsService(db as DbPort);
    const mod = await svc.createModule(TENANT, COURSE_ID, { title: "Módulo 1" });
    expect(mod.id).toBe(MODULE_ID);
    expect(mod.title).toBe("Módulo 1");
    expect(mod.modOrder).toBe(1);
    expect(db.calls.some(c => c.includes("UPDATE"))).toBe(true);
  });

  it("sets mod_order to max+1", async () => {
    let insertParams: unknown[] | undefined;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id from saas_lms_courses")) return [{ id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("max(mod_order)")) return [{ max: 3 }] as T[];
        if (sql.toLowerCase().includes("insert into saas_lms_modules")) { insertParams = params; return [{ ...baseModRow, mod_order: 4 }] as T[]; }
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    await svc.createModule(TENANT, COURSE_ID, { title: "M4" });
    expect(insertParams?.[4]).toBe(4); // mod_order = 4
  });
});

// ── updateModule ──────────────────────────────────────────────────────────────

describe("SaasLmsService.updateModule", () => {
  it("throws VALIDATION when no fields to update", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.updateModule(TENANT, MODULE_ID, {})).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws NOT_FOUND when module not found", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.updateModule(TENANT, MODULE_ID, { title: "X" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates title and returns module", async () => {
    const db = makeDb({ "update saas_lms_modules": [{ ...baseModRow, title: "Nuevo título" }] });
    const svc = new SaasLmsService(db as DbPort);
    const mod = await svc.updateModule(TENANT, MODULE_ID, { title: "Nuevo título" });
    expect(mod.title).toBe("Nuevo título");
  });
});

// ── deleteModule ──────────────────────────────────────────────────────────────

describe("SaasLmsService.deleteModule", () => {
  it("throws NOT_FOUND when module not found", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.deleteModule(TENANT, MODULE_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes module and decrements course modules_count", async () => {
    const db = makeDb({ "delete from saas_lms_modules": [{ id: MODULE_ID, course_id: COURSE_ID }] });
    const svc = new SaasLmsService(db as DbPort);
    await expect(svc.deleteModule(TENANT, MODULE_ID)).resolves.toBeUndefined();
    expect(db.calls.some(c => c.includes("UPDATE"))).toBe(true);
  });
});

// ── listModulesWithLessons ────────────────────────────────────────────────────

describe("SaasLmsService.listModulesWithLessons", () => {
  it("returns empty array when no modules", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    const mods = await svc.listModulesWithLessons(TENANT, COURSE_ID);
    expect(mods).toEqual([]);
  });

  it("returns modules with nested lessons", async () => {
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.includes("FROM saas_lms_modules")) return [{ ...baseModRow }] as T[];
        if (sql.includes("FROM saas_lms_lessons")) return [{ ...baseLessonRow }] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const mods = await svc.listModulesWithLessons(TENANT, COURSE_ID);
    expect(mods).toHaveLength(1);
    expect(mods[0].lessons).toHaveLength(1);
    expect(mods[0].lessons[0].id).toBe(LESSON_ID);
  });

  it("groups lessons by module_id correctly", async () => {
    const MOD_2 = "mod-2";
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.includes("FROM saas_lms_modules")) return [
          { ...baseModRow },
          { ...baseModRow, id: MOD_2, title: "Módulo 2", mod_order: 2 },
        ] as T[];
        if (sql.includes("FROM saas_lms_lessons")) return [
          { ...baseLessonRow, module_id: MOD_2, id: "l-2" },
        ] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const mods = await svc.listModulesWithLessons(TENANT, COURSE_ID);
    expect(mods[0].lessons).toHaveLength(0); // mod-1 has no lessons
    expect(mods[1].lessons).toHaveLength(1); // mod-2 has 1 lesson
  });
});

// ── createLesson ──────────────────────────────────────────────────────────────

describe("SaasLmsService.createLesson", () => {
  it("throws VALIDATION when title is empty", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.createLesson(TENANT, MODULE_ID, { title: "" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws NOT_FOUND when module not found", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.createLesson(TENANT, MODULE_ID, { title: "L" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates text lesson and returns LmsLesson", async () => {
    const db = makeDb({ "select id,course_id from saas_lms_modules": [{ id: MODULE_ID, course_id: COURSE_ID }], "select max(lesson_order)": [{ max: 0 }], "insert into saas_lms_lessons": [{ ...baseLessonRow }] });
    const svc = new SaasLmsService(db as DbPort);
    const l = await svc.createLesson(TENANT, MODULE_ID, { title: "Lección 1" });
    expect(l.id).toBe(LESSON_ID);
    expect(l.contentType).toBe("text");
  });

  it("creates quiz lesson with quizJson", async () => {
    const quiz = { questions: [{ text: "¿?", options: ["A", "B"], correct: 0 }] };
    let savedJson: unknown;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id,course_id from saas_lms_modules")) return [{ id: MODULE_ID, course_id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("max(lesson_order)")) return [{ max: 0 }] as T[];
        if (sql.toLowerCase().includes("insert into saas_lms_lessons")) { savedJson = params?.[8]; return [{ ...baseLessonRow, content_type: "quiz", quiz_json: quiz }] as T[]; }
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const l = await svc.createLesson(TENANT, MODULE_ID, { title: "Quiz", contentType: "quiz", quizJson: quiz });
    expect(l.contentType).toBe("quiz");
    expect(savedJson).toBe(JSON.stringify(quiz));
  });

  it("creates video lesson with video_url", async () => {
    let savedVideoUrl: unknown;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id,course_id from saas_lms_modules")) return [{ id: MODULE_ID, course_id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("max(lesson_order)")) return [{ max: 0 }] as T[];
        if (sql.toLowerCase().includes("insert into saas_lms_lessons")) { savedVideoUrl = params?.[5]; return [{ ...baseLessonRow, content_type: "video", video_url: "https://yt.be/x" }] as T[]; }
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    await svc.createLesson(TENANT, MODULE_ID, { title: "Video", contentType: "video", videoUrl: "https://yt.be/x" });
    expect(savedVideoUrl).toBe("https://yt.be/x");
  });
});

// ── deleteLesson ──────────────────────────────────────────────────────────────

describe("SaasLmsService.deleteLesson", () => {
  it("throws NOT_FOUND when lesson not found", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.deleteLesson(TENANT, LESSON_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes lesson and decrements module lessons_count", async () => {
    const db = makeDb({ "delete from saas_lms_lessons": [{ id: LESSON_ID, module_id: MODULE_ID }] });
    const svc = new SaasLmsService(db as DbPort);
    await expect(svc.deleteLesson(TENANT, LESSON_ID)).resolves.toBeUndefined();
    expect(db.calls.some(c => c.includes("UPDATE"))).toBe(true);
  });
});

// ── updateLesson ──────────────────────────────────────────────────────────────

describe("SaasLmsService.updateLesson", () => {
  it("throws VALIDATION with no fields", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.updateLesson(TENANT, LESSON_ID, {})).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("updates content and returns lesson", async () => {
    const db = makeDb({ "update saas_lms_lessons": [{ ...baseLessonRow, content: "Nuevo contenido" }] });
    const svc = new SaasLmsService(db as DbPort);
    const l = await svc.updateLesson(TENANT, LESSON_ID, { content: "Nuevo contenido" });
    expect(l.content).toBe("Nuevo contenido");
  });
});

// ── completeLesson ────────────────────────────────────────────────────────────

describe("SaasLmsService.completeLesson", () => {
  it("throws NOT_FOUND when enrollment not found", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.completeLesson(TENANT, ENROLLMENT_ID, LESSON_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("upserts progress and returns LmsProgressSummary", async () => {
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id,course_id from saas_lms_enrollments")) return [{ id: ENROLLMENT_ID, course_id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("insert into saas_lms_progress")) return [] as T[];
        if (sql.toLowerCase().includes("count(l.id)")) return [{ total: 5, done: 3 }] as T[];
        if (sql.toLowerCase().includes("update saas_lms_enrollments")) return [] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const p = await svc.completeLesson(TENANT, ENROLLMENT_ID, LESSON_ID);
    expect(p.lessonsTotal).toBe(5);
    expect(p.lessonsCompleted).toBe(3);
    expect(p.progressPct).toBe(60);
  });

  it("returns 100% when all lessons completed", async () => {
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id,course_id from saas_lms_enrollments")) return [{ id: ENROLLMENT_ID, course_id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("count(l.id)")) return [{ total: 4, done: 4 }] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const p = await svc.completeLesson(TENANT, ENROLLMENT_ID, LESSON_ID);
    expect(p.progressPct).toBe(100);
  });

  it("returns 0% when no lessons exist in course", async () => {
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select id,course_id from saas_lms_enrollments")) return [{ id: ENROLLMENT_ID, course_id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("count(l.id)")) return [{ total: 0, done: 0 }] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const p = await svc.completeLesson(TENANT, ENROLLMENT_ID, LESSON_ID);
    expect(p.progressPct).toBe(0);
  });
});

// ── getProgress ───────────────────────────────────────────────────────────────

describe("SaasLmsService.getProgress", () => {
  it("throws NOT_FOUND when enrollment not found", async () => {
    const svc = new SaasLmsService(makeDb() as DbPort);
    await expect(svc.getProgress(TENANT, ENROLLMENT_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns progress summary from enrollment row", async () => {
    const db = makeDb({ "select id,progress_pct": [{ id: ENROLLMENT_ID, progress_pct: 75, lessons_total: 8, lessons_completed: 6 }] });
    const svc = new SaasLmsService(db as DbPort);
    const p = await svc.getProgress(TENANT, ENROLLMENT_ID);
    expect(p.progressPct).toBe(75);
    expect(p.lessonsTotal).toBe(8);
    expect(p.lessonsCompleted).toBe(6);
  });
});

// ── issueCertificate (extended) ───────────────────────────────────────────────

describe("SaasLmsService.issueCertificate (with signed URL)", () => {
  it("generates and stores signed certificate URL when no external URL", async () => {
    let storedUrl: unknown;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("select e.id,e.status,e.contact_name")) return [{ id: ENROLLMENT_ID, status: "active", contact_name: "Ana", contact_email: "ana@test.com", course_id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("update saas_lms_enrollments set status='completed'")) return [] as T[];
        if (sql.toLowerCase().includes("insert into saas_lms_certificates")) return [{ id: "cert-1", enrollment_id: ENROLLMENT_ID, tenant_id: TENANT, certificate_url: null, issued_at: new Date() }] as T[];
        if (sql.toLowerCase().includes("update saas_lms_certificates")) { storedUrl = params?.[0]; return [] as T[]; }
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const cert = await svc.issueCertificate(TENANT, ENROLLMENT_ID);
    expect(cert.id).toBe("cert-1");
    expect(cert.certificateUrl).toContain("/api/saas/lms/cert/cert-1");
    expect(cert.certificateUrl).toContain("?tok=");
    expect(typeof storedUrl).toBe("string");
  });

  it("uses external URL when provided and skips HMAC generation", async () => {
    let updateCalled = false;
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("select e.id,e.status")) return [{ id: ENROLLMENT_ID, status: "active", contact_name: null, contact_email: "x@x.com", course_id: COURSE_ID }] as T[];
        if (sql.toLowerCase().includes("update saas_lms_enrollments")) return [] as T[];
        if (sql.toLowerCase().includes("insert into saas_lms_certificates")) return [{ id: "cert-ext", enrollment_id: ENROLLMENT_ID, tenant_id: TENANT, certificate_url: null, issued_at: new Date() }] as T[];
        if (sql.toLowerCase().includes("update saas_lms_certificates")) { updateCalled = true; return [] as T[]; }
        return [] as T[];
      },
    };
    const svc = new SaasLmsService(db);
    const cert = await svc.issueCertificate(TENANT, ENROLLMENT_ID, "https://cdn.example.com/cert.pdf");
    expect(cert.certificateUrl).toBe("https://cdn.example.com/cert.pdf");
    expect(updateCalled).toBe(false); // no internal URL update
  });
});

// ── SaasLmsError ─────────────────────────────────────────────────────────────

describe("SaasLmsError", () => {
  it("has correct name and code", () => {
    const e = new SaasLmsError("boom", "NOT_FOUND");
    expect(e.name).toBe("SaasLmsError");
    expect(e.code).toBe("NOT_FOUND");
    expect(e instanceof Error).toBe(true);
  });
});
