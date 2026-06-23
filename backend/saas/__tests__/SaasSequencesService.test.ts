import { describe, it, expect, vi } from "vitest";
import { SaasSequencesService } from "../SaasSequencesService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-seq";
const now = new Date();

const seqRow = {
  id: "seq1", tenant_id: TENANT, name: "Welcome", description: null,
  trigger_type: "contact_created", trigger_config: {}, status: "active",
  enrollments_count: 0, created_at: now, updated_at: now,
};

describe("SaasSequencesService", () => {
  it("list returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSequencesService(db);
    expect(await svc.list(TENANT)).toEqual([]);
  });

  it("create validates empty name", async () => {
    const db = makeDb();
    const svc = new SaasSequencesService(db);
    await expect(svc.create(TENANT, { name: "" })).rejects.toThrow("name");
  });

  it("create validates invalid trigger", async () => {
    const db = makeDb();
    const svc = new SaasSequencesService(db);
    await expect(svc.create(TENANT, { name: "Test", triggerType: "bad" as "manual" })).rejects.toThrow("triggerType");
  });

  it("create returns sequence", async () => {
    const db = makeDb([[seqRow]]);
    const svc = new SaasSequencesService(db);
    const seq = await svc.create(TENANT, { name: "Welcome", triggerType: "contact_created" });
    expect(seq.id).toBe("seq1");
    expect(seq.triggerType).toBe("contact_created");
    expect(seq.status).toBe("active");
  });

  it("addStep requires sequence to exist", async () => {
    const db = makeDb([[], []]); // get returns null
    const svc = new SaasSequencesService(db);
    await expect(svc.addStep(TENANT, "bad-id", { subject: "Hi", bodyHtml: "<p>Hello</p>" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("addStep validates empty subject", async () => {
    const db = makeDb([[seqRow]]);
    const svc = new SaasSequencesService(db);
    await expect(svc.addStep(TENANT, "seq1", { subject: "", bodyHtml: "<p>x</p>" })).rejects.toThrow("subject");
  });

  it("delete throws NOT_FOUND for missing", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSequencesService(db);
    await expect(svc.delete(TENANT, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("enroll throws NOT_FOUND if sequence missing", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSequencesService(db);
    await expect(svc.enroll(TENANT, "bad", "contact-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("enroll rejects paused sequence", async () => {
    const paused = { ...seqRow, status: "paused" };
    const db = makeDb([[paused]]);
    const svc = new SaasSequencesService(db);
    await expect(svc.enroll(TENANT, "seq1", "contact-1")).rejects.toThrow("not active");
  });

  it("form_submitted is valid trigger", async () => {
    const row = { ...seqRow, trigger_type: "form_submitted" };
    const db = makeDb([[row]]);
    const svc = new SaasSequencesService(db);
    const seq = await svc.create(TENANT, { name: "Form", triggerType: "form_submitted" });
    expect(seq.triggerType).toBe("form_submitted");
  });
});
