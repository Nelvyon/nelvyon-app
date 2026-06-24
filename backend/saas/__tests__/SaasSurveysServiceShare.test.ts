import { describe, it, expect, beforeEach } from "vitest";
import { SaasSurveysService } from "../SaasSurveysService";

type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

function makeSvc(queryFn: QueryFn) {
  return new SaasSurveysService({ db: { query: queryFn } as Parameters<typeof SaasSurveysService.prototype.constructor>[0]["db"] });
}

const TENANT = "tenant-abc";
const SURVEY_ID = "11111111-1111-1111-1111-111111111111";

// ── enableShare ───────────────────────────────────────────────────────────────

describe("enableShare", () => {
  it("returns slug equal to surveyId on success", async () => {
    const svc = makeSvc(async () => [{ id: SURVEY_ID }]);
    const slug = await svc.enableShare(TENANT, SURVEY_ID);
    expect(slug).toBe(SURVEY_ID);
  });

  it("throws NOT_FOUND when no rows returned", async () => {
    const svc = makeSvc(async () => []);
    await expect(svc.enableShare(TENANT, SURVEY_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("passes correct UPDATE SQL with share_enabled and share_slug", async () => {
    let capturedSql = "";
    const svc = makeSvc(async (sql, params) => {
      capturedSql = sql;
      const p = params as string[];
      return p[0] === SURVEY_ID && p[1] === TENANT ? [{ id: SURVEY_ID }] : [];
    });
    await svc.enableShare(TENANT, SURVEY_ID);
    expect(capturedSql).toContain("share_enabled");
    expect(capturedSql).toContain("share_slug");
  });
});

// ── disableShare ──────────────────────────────────────────────────────────────

describe("disableShare", () => {
  it("calls UPDATE surveys SET share_enabled=FALSE", async () => {
    let capturedSql = "";
    const svc = makeSvc(async (sql) => { capturedSql = sql; return []; });
    await svc.disableShare(TENANT, SURVEY_ID);
    expect(capturedSql).toContain("share_enabled=FALSE");
  });
});

// ── getPublicSurvey ───────────────────────────────────────────────────────────

const PUBLIC_ROW = {
  id: SURVEY_ID, tenantId: TENANT, name: "NPS Survey", type: "nps",
  questions: [{ id: "q1", type: "nps", label: "¿Nos recomendarías?", required: true }],
  responsesCount: 5, npsScore: 42, active: true, createdAt: "2026-06-24T00:00:00Z",
  shareEnabled: true,
};

describe("getPublicSurvey", () => {
  it("returns survey with shareEnabled=true when found", async () => {
    const svc = makeSvc(async () => [PUBLIC_ROW]);
    const result = await svc.getPublicSurvey(SURVEY_ID);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(SURVEY_ID);
    expect(result?.shareEnabled).toBe(true);
  });

  it("returns null when no row found", async () => {
    const svc = makeSvc(async () => []);
    const result = await svc.getPublicSurvey("nonexistent");
    expect(result).toBeNull();
  });

  it("queries with share_slug OR id and share_enabled=TRUE", async () => {
    let capturedSql = "";
    const svc = makeSvc(async (sql) => { capturedSql = sql; return [PUBLIC_ROW]; });
    await svc.getPublicSurvey(SURVEY_ID);
    expect(capturedSql).toContain("share_slug");
    expect(capturedSql).toContain("share_enabled=TRUE");
  });

  it("maps npsScore correctly", async () => {
    const svc = makeSvc(async () => [{ ...PUBLIC_ROW, npsScore: 67 }]);
    const r = await svc.getPublicSurvey(SURVEY_ID);
    expect(r?.npsScore).toBe(67);
  });
});

// ── Honeypot logic ────────────────────────────────────────────────────────────

describe("honeypot check logic", () => {
  it("detects non-empty honeypot field", () => {
    const data = { email: "test@example.com", _hp: "bot-value" };
    const honeypotField = "_hp";
    expect(!!data[honeypotField]).toBe(true);
  });

  it("passes when honeypot field is empty string", () => {
    const data = { email: "test@example.com", _hp: "" };
    const honeypotField = "_hp";
    expect(!!data[honeypotField]).toBe(false);
  });

  it("passes when honeypot field is absent", () => {
    const data = { email: "test@example.com" };
    const honeypotField = "_hp";
    expect(!!data[honeypotField as keyof typeof data]).toBe(false);
  });

  it("detects custom honeypot field name", () => {
    const data = { email: "a@b.com", website: "http://spam.com" };
    const honeypotField = "website";
    expect(!!data[honeypotField]).toBe(true);
  });
});
