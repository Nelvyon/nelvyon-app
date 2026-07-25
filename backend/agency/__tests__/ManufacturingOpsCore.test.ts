import { beforeEach, describe, expect, it } from "vitest";
import {
  IoTAdapter,
  MANUFACTURING_OPS_ROLLBACK_PLAN,
  ManufacturingOpsCore,
  ManufacturingOpsError,
  assertManufacturingCoreIntegrity,
  getManufacturingOpsCore,
  resetManufacturingOpsCoreForTests,
} from "../ManufacturingOpsCore";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

describe("ManufacturingOpsCore", () => {
  let core: ManufacturingOpsCore;

  beforeEach(() => {
    resetManufacturingOpsCoreForTests();
    core = getManufacturingOpsCore();
  });

  it("critical QA path: BOM approve → MO release → consume → produce with scrap → complete + integrity", () => {
    const integrity = assertManufacturingCoreIntegrity();
    expect(integrity.ok).toBe(true);
    expect(integrity.violations).toEqual([]);

    const bom = core.createBom({
      tenantId: TENANT_A,
      productSku: "WIDGET-100",
      lines: [
        { componentSku: "STEEL-BAR", qty: 2, uom: "ea" },
        { componentSku: "BOLT-M6", qty: 4, uom: "ea" },
      ],
    });
    expect(bom.status).toBe("draft");
    expect(bom.version).toBe(1);

    const approved = core.approveBom(TENANT_A, bom.id);
    expect(approved.status).toBe("approved");
    expect(approved.approvedAt).toBeTruthy();

    const wc = core.createWorkCenter({ tenantId: TENANT_A, code: "WC-ASM", name: "Assembly" });
    const routing = core.createRouting({
      tenantId: TENANT_A,
      productSku: "WIDGET-100",
      version: 1,
      operations: [{ seq: 10, workCenterId: wc.id, name: "Assemble", stdMinutes: 15 }],
    });
    expect(routing.operations).toHaveLength(1);

    const mo = core.createManufacturingOrder({ tenantId: TENANT_A, bomId: bom.id, qty: 10 });
    expect(mo.status).toBe("draft");
    expect(mo.bomVersion).toBe(1);

    const released = core.releaseManufacturingOrder(TENANT_A, mo.id);
    expect(released.status).toBe("released");

    const consumed = core.consumeComponents(TENANT_A, mo.id);
    expect(consumed.status).toBe("in_progress");
    expect(consumed.consumptions).toHaveLength(2);
    expect(consumed.consumptions[0]?.qty).toBe(20);

    const produced = core.reportProduction(TENANT_A, mo.id, 8, 2);
    expect(produced.qtyGood).toBe(8);
    expect(produced.qtyScrap).toBe(2);

    const completed = core.completeManufacturingOrder(TENANT_A, mo.id);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();

    const audit = core.listAudit(TENANT_A);
    expect(audit.some((a) => a.action === "bom_approved")).toBe(true);
    expect(audit.some((a) => a.action === "mo_completed")).toBe(true);
  });

  it("cannot consume without released MO", () => {
    const bom = core.createBom({
      tenantId: TENANT_A,
      productSku: "P1",
      lines: [{ componentSku: "C1", qty: 1, uom: "ea" }],
    });
    core.approveBom(TENANT_A, bom.id);
    const mo = core.createManufacturingOrder({ tenantId: TENANT_A, bomId: bom.id, qty: 5 });
    expect(() => core.consumeComponents(TENANT_A, mo.id)).toThrow(ManufacturingOpsError);
    try {
      core.consumeComponents(TENANT_A, mo.id);
    } catch (err) {
      expect((err as ManufacturingOpsError).code).toBe("INVALID_STATE");
    }
  });

  it("scrap cannot exceed produced good", () => {
    const bom = core.createBom({
      tenantId: TENANT_A,
      productSku: "P1",
      lines: [{ componentSku: "C1", qty: 1, uom: "ea" }],
    });
    core.approveBom(TENANT_A, bom.id);
    const mo = core.createManufacturingOrder({ tenantId: TENANT_A, bomId: bom.id, qty: 20 });
    core.releaseManufacturingOrder(TENANT_A, mo.id);
    core.reportProduction(TENANT_A, mo.id, 3, 1);
    expect(() => core.reportProduction(TENANT_A, mo.id, 0, 5)).toThrow(ManufacturingOpsError);
    try {
      core.reportProduction(TENANT_A, mo.id, 0, 5);
    } catch (err) {
      expect((err as ManufacturingOpsError).code).toBe("SCRAP_EXCEEDS_PRODUCED");
    }
  });

  it("quality inspection fail → NC → CAPA", () => {
    const plan = core.createQualityPlan({
      tenantId: TENANT_A,
      productSku: "WIDGET-100",
      name: "Incoming dimensional",
      checkpoints: ["length", "diameter"],
    });
    const inspection = core.recordInspection({
      tenantId: TENANT_A,
      qualityPlanId: plan.id,
      result: "fail",
      evidenceRefs: ["https://evidence.example/photo-1", "ticket:QC-42"],
      notes: "out of tolerance",
    });
    expect(inspection.result).toBe("fail");
    expect(inspection.evidenceRefs).toHaveLength(2);

    const nc = core.openNonConformance({
      tenantId: TENANT_A,
      inspectionId: inspection.id,
      description: "Diameter over max",
    });
    expect(nc.status).toBe("open");

    const capa = core.createCorrectiveAction({
      tenantId: TENANT_A,
      nonConformanceId: nc.id,
      title: "Recalibrate gauge + retrain operator",
    });
    expect(capa.status).toBe("open");

    const advanced = core.advanceCorrectiveAction(TENANT_A, capa.id, "in_progress");
    expect(advanced.status).toBe("in_progress");
    expect(core.listNonConformances(TENANT_A)).toHaveLength(1);
    expect(core.listCorrectiveActions(TENANT_A)).toHaveLength(1);
  });

  it("cannot open NC from a passing inspection", () => {
    const plan = core.createQualityPlan({
      tenantId: TENANT_A,
      productSku: "P1",
      name: "Plan",
      checkpoints: ["visual"],
    });
    const pass = core.recordInspection({
      tenantId: TENANT_A,
      qualityPlanId: plan.id,
      result: "pass",
      evidenceRefs: ["ref:ok"],
    });
    expect(() =>
      core.openNonConformance({
        tenantId: TENANT_A,
        inspectionId: pass.id,
        description: "should fail",
      }),
    ).toThrow(ManufacturingOpsError);
  });

  it("maintenance preventive schedule appears on calendar", () => {
    const asset = core.createAsset({
      tenantId: TENANT_A,
      code: "CNC-01",
      name: "CNC Mill",
    });
    const later = "2026-08-15T09:00:00.000Z";
    const earlier = "2026-08-01T09:00:00.000Z";
    core.createMaintenanceOrder({
      tenantId: TENANT_A,
      assetId: asset.id,
      kind: "preventive",
      scheduleAt: later,
      title: "Quarterly lubrication",
    });
    core.createMaintenanceOrder({
      tenantId: TENANT_A,
      assetId: asset.id,
      kind: "corrective",
      scheduleAt: earlier,
      title: "Replace spindle belt",
    });
    const calendar = core.listMaintenanceCalendar(TENANT_A);
    expect(calendar).toHaveLength(2);
    expect(calendar[0]?.scheduleAt).toBe(earlier);
    expect(calendar[0]?.kind).toBe("corrective");
    expect(calendar[1]?.kind).toBe("preventive");
  });

  it("PLM change approve bumps version", () => {
    const doc = core.createPlmDocument({
      tenantId: TENANT_A,
      productSku: "WIDGET-100",
      title: "Assembly drawing",
      version: 1,
      traceabilityLinks: ["bom:abc", "routing:xyz"],
    });
    expect(doc.version).toBe(1);

    core.submitChangeRequest({
      tenantId: TENANT_A,
      documentId: doc.id,
      reason: "Add grounding hole",
    });
    const approved = core.approveChangeRequest(TENANT_A, doc.id);
    expect(approved.changeRequest?.status).toBe("approved");
    expect(approved.version).toBe(2);

    const rejectedDoc = core.createPlmDocument({
      tenantId: TENANT_A,
      productSku: "WIDGET-200",
      title: "Spec",
    });
    core.submitChangeRequest({
      tenantId: TENANT_A,
      documentId: rejectedDoc.id,
      reason: "Bad change",
    });
    const rejected = core.rejectChangeRequest(TENANT_A, rejectedDoc.id);
    expect(rejected.changeRequest?.status).toBe("rejected");
    expect(rejected.version).toBe(1);
  });

  it("IoTAdapter.connect always throws BLOCKED_EXTERNAL", () => {
    const iot = new IoTAdapter();
    expect(iot.status).toBe("PREPARED_OFF");
    expect(() => iot.connect()).toThrow(ManufacturingOpsError);
    try {
      iot.connect({ tenantId: TENANT_A });
    } catch (err) {
      expect((err as ManufacturingOpsError).code).toBe("BLOCKED_EXTERNAL");
    }
  });

  it("tenant A/B isolation", () => {
    const bomA = core.createBom({
      tenantId: TENANT_A,
      productSku: "A-SKU",
      lines: [{ componentSku: "CA", qty: 1, uom: "ea" }],
    });
    const bomB = core.createBom({
      tenantId: TENANT_B,
      productSku: "B-SKU",
      lines: [{ componentSku: "CB", qty: 1, uom: "ea" }],
    });
    core.approveBom(TENANT_A, bomA.id);
    core.approveBom(TENANT_B, bomB.id);

    expect(core.listBoms(TENANT_A)).toHaveLength(1);
    expect(core.listBoms(TENANT_B)).toHaveLength(1);
    expect(core.getBom(TENANT_B, bomA.id)).toBeNull();
    expect(core.getBom(TENANT_A, bomB.id)).toBeNull();

    const moA = core.createManufacturingOrder({ tenantId: TENANT_A, bomId: bomA.id, qty: 3 });
    expect(core.listManufacturingOrders(TENANT_B)).toHaveLength(0);
    expect(core.getManufacturingOrder(TENANT_B, moA.id)).toBeNull();
    expect(core.listAudit(TENANT_B).every((e) => e.tenantId === TENANT_B)).toBe(true);
  });

  it("rollback plan documents IoT block and rollback stays non-empty", () => {
    expect(MANUFACTURING_OPS_ROLLBACK_PLAN.length).toBeGreaterThan(0);
    expect(MANUFACTURING_OPS_ROLLBACK_PLAN.some((s) => s.includes("BLOCKED_EXTERNAL"))).toBe(true);
  });

  it("assertManufacturingCoreIntegrity passes with no violations", () => {
    expect(assertManufacturingCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
