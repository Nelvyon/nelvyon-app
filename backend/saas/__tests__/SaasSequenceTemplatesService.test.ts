import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasSequenceTemplatesService } from "../SaasSequenceTemplatesService";
import { SaasSequencesService } from "../SaasSequencesService";

const TENANT = "tenant-seq-tpl";

function makeSequencesMock() {
  const steps: unknown[] = [];
  return {
    create: vi.fn(async (_tenantId: string, input: { name: string }) => ({
      id: "seq-1",
      tenantId: TENANT,
      name: input.name,
      description: null,
      triggerType: "manual",
      triggerConfig: {},
      status: "active",
      enrollmentsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    addStep: vi.fn(async (_t: string, _s: string, input: unknown) => {
      steps.push(input);
      return { id: `step-${steps.length}` };
    }),
    _steps: steps,
  };
}

describe("SaasSequenceTemplatesService", () => {
  let seqMock: ReturnType<typeof makeSequencesMock>;
  let svc: SaasSequenceTemplatesService;

  beforeEach(() => {
    seqMock = makeSequencesMock();
    svc = new SaasSequenceTemplatesService(seqMock as unknown as SaasSequencesService);
  });

  it("lists 10 official templates", () => {
    expect(svc.list().length).toBeGreaterThanOrEqual(10);
  });

  it("filters by category", () => {
    const nurture = svc.list("nurture");
    expect(nurture.every((t) => t.category === "nurture")).toBe(true);
    expect(nurture.length).toBeGreaterThan(0);
  });

  it("imports welcome template with steps", async () => {
    const result = await svc.importTemplate(TENANT, "welcome-3-email");
    expect(result.sequenceId).toBe("seq-1");
    expect(result.stepsCreated).toBe(5);
    expect(seqMock.create).toHaveBeenCalled();
    expect(seqMock.addStep).toHaveBeenCalledTimes(5);
  });

  it("imports multichannel template with sms step", async () => {
    await svc.importTemplate(TENANT, "sales-multichannel");
    const types = seqMock._steps.map((s) => (s as { stepType: string }).stepType);
    expect(types).toContain("sms");
    expect(types).toContain("whatsapp");
  });

  it("throws NOT_FOUND for unknown template", () => {
    expect(() => svc.get("nope")).toThrowError(expect.objectContaining({ code: "NOT_FOUND" }));
  });
});
