/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OsJobStore } from "../OsJobStore";
import { OsEventBus } from "../OsEventBus";
import { instantiateOsAgent, isSectorServiceId } from "../OsAgentRegistry";
import { SECTOR_ARTIFACT_PUBLISH_STEP } from "../SectorAgentBase";
import { SectorAgentWrapper, SECTOR_EXECUTE_STEP } from "../SectorAgentWrapper";
import * as sectorReportBuilder from "../artifacts/sectorReportBuilder";

describe("SectorAgentWrapper", () => {
  beforeEach(() => {
    vi.spyOn(sectorReportBuilder, "publishSectorReportZip").mockResolvedValue({
      assetId: "asset-sector-1",
      downloadUrl: "http://localhost:3000/api/os/sector-report/job-sector-1",
      fileCount: 2,
      sizeBytes: 1024,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ejecuta la función core y añade artifact_publish", async () => {
    const core = vi.fn().mockResolvedValue({
      result: "Análisis sectorial de prueba",
      insights: ["Insight A"],
      recommendedActions: ["Acción 1"],
    });

    const agent = new SectorAgentWrapper({
      serviceId: "test_sector",
      executor: core,
    });

    expect(agent.steps.map((s) => s.name)).toContain(SECTOR_EXECUTE_STEP);

    const store = new OsJobStore();
    const bus = new OsEventBus();
    const job = await store.createJob({
      serviceId: "test_sector",
      clientId: "client-1",
      steps: [
        { name: SECTOR_EXECUTE_STEP, description: "Ejecutar sector" },
        { name: SECTOR_ARTIFACT_PUBLISH_STEP, description: "Publicar informe" },
      ],
      payload: { brief: "Brief test", userId: "user-1" },
    });

    const ctx = {
      jobId: job.jobId,
      clientId: "client-1",
      serviceId: "test_sector",
      payload: { brief: "Brief test", userId: "user-1" },
      stepResults: {},
      jobStore: store,
      eventBus: bus,
    };

    const result = await agent.execute({ brief: "Brief test", userId: "user-1" }, ctx);

    expect(core).toHaveBeenCalledTimes(1);
    expect(result.steps.map((s) => s.name)).toContain(SECTOR_EXECUTE_STEP);
    expect(result.steps.map((s) => s.name)).toContain(SECTOR_ARTIFACT_PUBLISH_STEP);
    expect(sectorReportBuilder.publishSectorReportZip).toHaveBeenCalledTimes(1);
    const publishArg = vi.mocked(sectorReportBuilder.publishSectorReportZip).mock.calls[0]?.[0];
    expect(publishArg?.serviceId).toBe("test_sector");
    expect(publishArg?.files["report.html"]).toContain("<!DOCTYPE html>");
  });
});

describe("sector OS registry", () => {
  it("registra 193 sectores sin duplicar premium", async () => {
    const { OS_SECTOR_SERVICE_IDS } = await import("../sectorOsRegistry");
    const { OS_PREMIUM_SERVICE_IDS } = await import("../constants");

    expect(OS_SECTOR_SERVICE_IDS.length).toBe(193);
    for (const premium of OS_PREMIUM_SERVICE_IDS) {
      expect(OS_SECTOR_SERVICE_IDS as readonly string[]).not.toContain(premium);
    }
  });

  it("instantiateOsAgent resuelve sector ads con wrapper", () => {
    expect(isSectorServiceId("ads")).toBe(true);
    const agent = instantiateOsAgent("ads");
    expect(agent).toBeInstanceOf(SectorAgentWrapper);
    expect(agent?.serviceId).toBe("ads");
    expect(agent?.steps.some((s) => s.name === SECTOR_EXECUTE_STEP)).toBe(true);
  });

  it("sector legacy wellness también usa wrapper", () => {
    const agent = instantiateOsAgent("wellness");
    expect(agent).toBeInstanceOf(SectorAgentWrapper);
    expect(agent?.serviceId).toBe("wellness");
  });

  it("URL de artifact_publish apunta a /api/os/sector-report/[jobId]", async () => {
    const { buildArtifactDownloadUrl } = await import("../artifacts/artifactPublisher");
    const url = buildArtifactDownloadUrl("sector-report", "job-abc-123");
    expect(url).toMatch(/\/api\/os\/sector-report\/job-abc-123$/);
  });

  it("premium no está en el registry de sectores (sin duplicar)", async () => {
    const { OS_SECTOR_SERVICE_IDS } = await import("../sectorOsRegistry");
    const { OS_PREMIUM_SERVICE_IDS } = await import("../constants");
    for (const id of OS_PREMIUM_SERVICE_IDS) {
      expect(isSectorServiceId(id)).toBe(false);
      expect(OS_SECTOR_SERVICE_IDS as readonly string[]).not.toContain(id);
    }
  });
});
