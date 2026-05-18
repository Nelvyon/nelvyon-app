import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import {
  BackupDisasterRecoveryAlertAgent,
  BackupDisasterRecoveryReplicationAgent,
  BackupDisasterRecoveryReportAgent,
  BackupDisasterRecoveryRestoreAgent,
  BackupDisasterRecoveryRPOAgent,
  BackupDisasterRecoverySchedulerAgent,
  BackupDisasterRecoveryStorageAgent,
  BackupDisasterRecoveryValidatorAgent,
  resetAllBackupDisasterRecoveryAgentsForTests,
} from "../sectors/backupdisasterrecovery";

const BDR_JSON = JSON.stringify({
  content:
    "BackupDisasterRecovery: RPO <1h, RTO <4h, AES-256, test restore semanal, retención 30d/12m, multi-región 2+.",
  score: 96,
  highlights: ["RPO <1h", "RTO <4h", "AES-256"],
  metrics: ["DR SLA"],
});

const backupDisasterRecoveryInput = {
  userId: "00000000-0000-0000-0000-00000000bdr1",
  sector: "saas",
  brand: "SaaS demo",
  backupBrief: "RPO <1h · RTO <4h · AES-256",
  metricsBrief: "Cumplimiento SLA · test restore",
};

type BackupDisasterRecoveryOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("BackupDisasterRecovery agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(BDR_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllBackupDisasterRecoveryAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as BackupDisasterRecoveryOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("BackupDisasterRecoverySchedulerAgent", async () => {
    await assertOutput("backupdisasterrecovery-scheduler", () =>
      BackupDisasterRecoverySchedulerAgent.instance.run(backupDisasterRecoveryInput),
    );
  });

  it("BackupDisasterRecoveryStorageAgent", async () => {
    await assertOutput("backupdisasterrecovery-storage", () =>
      BackupDisasterRecoveryStorageAgent.instance.run(backupDisasterRecoveryInput),
    );
  });

  it("BackupDisasterRecoveryValidatorAgent", async () => {
    await assertOutput("backupdisasterrecovery-validator", () =>
      BackupDisasterRecoveryValidatorAgent.instance.run(backupDisasterRecoveryInput),
    );
  });

  it("BackupDisasterRecoveryRestoreAgent", async () => {
    await assertOutput("backupdisasterrecovery-restore", () =>
      BackupDisasterRecoveryRestoreAgent.instance.run(backupDisasterRecoveryInput),
    );
  });

  it("BackupDisasterRecoveryAlertAgent", async () => {
    await assertOutput("backupdisasterrecovery-alert", () =>
      BackupDisasterRecoveryAlertAgent.instance.run(backupDisasterRecoveryInput),
    );
  });

  it("BackupDisasterRecoveryRPOAgent", async () => {
    await assertOutput("backupdisasterrecovery-rpo", () =>
      BackupDisasterRecoveryRPOAgent.instance.run(backupDisasterRecoveryInput),
    );
  });

  it("BackupDisasterRecoveryReplicationAgent", async () => {
    await assertOutput("backupdisasterrecovery-replication", () =>
      BackupDisasterRecoveryReplicationAgent.instance.run(backupDisasterRecoveryInput),
    );
  });

  it("BackupDisasterRecoveryReportAgent", async () => {
    await assertOutput("backupdisasterrecovery-report", () =>
      BackupDisasterRecoveryReportAgent.instance.run(backupDisasterRecoveryInput),
    );
  });
});
