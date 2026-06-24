import { describe, it, expect, vi } from "vitest";
import { SaasSurveysService } from "../SaasSurveysService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => { let c = 0; return { query: vi.fn(async () => rows[c++] ?? []) }; };
const TENANT = "tenant-surv";

const baseSurvey: Row = {
  id: "surv-1", tenantId: TENANT, name: "NPS Q2", type: "nps",
  questions: [{ id: "q1", type: "nps", label: "How likely?" }],
  responsesCount: 10, npsScore: 42.5, active: true, createdAt: "2026-06-24T00:00:00Z",
};

const baseQr: Row = {
  id: "qr-1", tenantId: TENANT, name: "Landing Page QR",
  destinationUrl: "https://example.com", color: "#000000", bgColor: "#ffffff",
  scans: 7, lastScannedAt: "2026-06-23T00:00:00Z", createdAt: "2026-06-20T00:00:00Z",
};

// ── Surveys ───────────────────────────────────────────────────────────────

describe("SaasSurveysService — listSurveys", () => {
  it("returns empty array", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).listSurveys(TENANT)).toEqual([]);
  });
  it("maps survey row", async () => {
    const [s] = await new SaasSurveysService({ db: makeDb([[baseSurvey]]) }).listSurveys(TENANT);
    expect(s.name).toBe("NPS Q2");
    expect(s.npsScore).toBe(42.5);
    expect(s.questions).toHaveLength(1);
  });
  it("passes type filter", async () => {
    const db = makeDb([[]]);
    await new SaasSurveysService({ db }).listSurveys(TENANT, "nps");
    expect(String(db.query.mock.calls[0][0])).toContain("type=$2");
  });
});

describe("SaasSurveysService — getSurvey", () => {
  it("returns null when not found", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).getSurvey(TENANT, "x")).toBeNull();
  });
  it("returns survey", async () => {
    const s = await new SaasSurveysService({ db: makeDb([[baseSurvey]]) }).getSurvey(TENANT, "surv-1");
    expect(s?.type).toBe("nps");
  });
});

describe("SaasSurveysService — createSurvey", () => {
  it("throws VALIDATION when name empty", async () => {
    await expect(new SaasSurveysService({ db: makeDb() }).createSurvey(TENANT, { name: "" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("creates survey with default type=survey", async () => {
    const db = makeDb([[{ ...baseSurvey, type: "survey" }]]);
    const s = await new SaasSurveysService({ db }).createSurvey(TENANT, { name: "Feedback Q3" });
    expect(s.type).toBe("survey");
    expect(String(db.query.mock.calls[0][0])).toContain("INSERT INTO surveys");
  });
});

describe("SaasSurveysService — updateSurvey", () => {
  it("returns null when not found", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).updateSurvey(TENANT, "x", { active: false })).toBeNull();
  });
  it("deactivates survey", async () => {
    const db = makeDb([[{ ...baseSurvey, active: false }]]);
    const s = await new SaasSurveysService({ db }).updateSurvey(TENANT, "surv-1", { active: false });
    expect(s?.active).toBe(false);
  });
});

describe("SaasSurveysService — deleteSurvey", () => {
  it("returns false when not found", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).deleteSurvey(TENANT, "x")).toBe(false);
  });
  it("returns true", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[{ id: "surv-1" }]]) }).deleteSurvey(TENANT, "surv-1")).toBe(true);
  });
});

describe("SaasSurveysService — submitResponse", () => {
  it("inserts response and updates NPS score", async () => {
    const db = makeDb([[{ id: "resp-1", surveyId: "surv-1", contactId: null, answers: { q1: 9 }, score: 9, completedAt: "2026-06-24T00:00:00Z" }]]);
    const r = await new SaasSurveysService({ db }).submitResponse("surv-1", { answers: { q1: 9 }, score: 9 });
    expect(r.score).toBe(9);
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("INSERT INTO survey_responses");
    expect(sql).toContain("responses_count + 1");
  });
});

describe("SaasSurveysService — getSurveyStats", () => {
  it("returns null when survey not found", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).getSurveyStats(TENANT, "x")).toBeNull();
  });
  it("returns stats with avgScore", async () => {
    const db = makeDb([
      [baseSurvey],
      [{ avgScore: "8.5", count: "10" }],
    ]);
    const stats = await new SaasSurveysService({ db }).getSurveyStats(TENANT, "surv-1");
    expect(stats?.responsesCount).toBe(10);
    expect(stats?.avgScore).toBeCloseTo(8.5, 1);
    expect(stats?.npsScore).toBe(42.5);
  });
});

// ── QR Codes ──────────────────────────────────────────────────────────────

describe("SaasSurveysService — listQrCodes", () => {
  it("returns empty array", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).listQrCodes(TENANT)).toEqual([]);
  });
  it("maps QR row", async () => {
    const [q] = await new SaasSurveysService({ db: makeDb([[baseQr]]) }).listQrCodes(TENANT);
    expect(q.name).toBe("Landing Page QR");
    expect(q.scans).toBe(7);
    expect(q.destinationUrl).toBe("https://example.com");
  });
});

describe("SaasSurveysService — createQrCode", () => {
  it("throws VALIDATION when name empty", async () => {
    await expect(new SaasSurveysService({ db: makeDb() }).createQrCode(TENANT, { name: "", destinationUrl: "https://x.com" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("throws VALIDATION when URL invalid", async () => {
    await expect(new SaasSurveysService({ db: makeDb() }).createQrCode(TENANT, { name: "X", destinationUrl: "not-a-url" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("creates QR code", async () => {
    const db = makeDb([[baseQr]]);
    const q = await new SaasSurveysService({ db }).createQrCode(TENANT, { name: "Landing Page QR", destinationUrl: "https://example.com" });
    expect(q.color).toBe("#000000");
    expect(String(db.query.mock.calls[0][0])).toContain("INSERT INTO qr_codes");
  });
});

describe("SaasSurveysService — updateQrCode", () => {
  it("returns null when not found", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).updateQrCode(TENANT, "x", { color: "#ff0000" })).toBeNull();
  });
  it("updates color", async () => {
    const db = makeDb([[{ ...baseQr, color: "#ff0000" }]]);
    const q = await new SaasSurveysService({ db }).updateQrCode(TENANT, "qr-1", { color: "#ff0000" });
    expect(q?.color).toBe("#ff0000");
  });
});

describe("SaasSurveysService — deleteQrCode", () => {
  it("returns false when not found", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).deleteQrCode(TENANT, "x")).toBe(false);
  });
  it("returns true", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[{ id: "qr-1" }]]) }).deleteQrCode(TENANT, "qr-1")).toBe(true);
  });
});

describe("SaasSurveysService — trackQrScan", () => {
  it("increments scan count and returns url", async () => {
    const db = makeDb([[{ destinationUrl: "https://example.com" }]]);
    const url = await new SaasSurveysService({ db }).trackQrScan("qr-1");
    expect(url).toBe("https://example.com");
    expect(String(db.query.mock.calls[0][0])).toContain("scans=scans+1");
  });
  it("returns null when QR not found", async () => {
    expect(await new SaasSurveysService({ db: makeDb([[]]) }).trackQrScan("x")).toBeNull();
  });
});
