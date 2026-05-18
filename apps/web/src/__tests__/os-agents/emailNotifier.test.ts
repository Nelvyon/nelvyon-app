import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailNotifier } from "@nelvyon/os-agents";
import type { OsJobResult, OsNotifierEvent } from "@nelvyon/os-agents";

describe("EmailNotifier", () => {
  const mkdirMock = vi.fn(async () => undefined);
  const writeFileMock = vi.fn(async () => undefined);

  beforeEach(() => {
    mkdirMock.mockClear();
    writeFileMock.mockClear();
  });

  const result: OsJobResult = {
    serviceId: "web_premium",
    steps: [{ name: "delivery", data: {} }],
  };

  const baseEvent = (type: OsNotifierEvent["type"], overrides: Partial<OsNotifierEvent> = {}): OsNotifierEvent => ({
    type,
    jobId: "os_mail_1",
    serviceId: "web_premium",
    clientId: "client@example.com",
    progress: type === "job:completed" ? 100 : 0,
    status: type === "job:completed" ? "completed" : "failed",
    timestamp: "2026-05-03T12:00:00.000Z",
    ...overrides,
  });

  it("job:completed → writeFile with expected subject and filename jobId.json", async () => {
    const n = new EmailNotifier({ mkdir: mkdirMock, writeFile: writeFileMock });
    const ev = baseEvent("job:completed", { result });
    await n.send(ev.clientId, ev);
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const first = writeFileMock.mock.calls[0];
    expect(first).toBeDefined();
    const [filePath, content] = first as unknown as [string, string, BufferEncoding?];
    expect(filePath.endsWith("os_mail_1.json")).toBe(true);
    const parsed = JSON.parse(content) as { subject: string };
    expect(parsed.subject).toContain("web_premium");
    expect(parsed.subject).toContain("✅");
  });

  it("job:failed → writeFile with error subject", async () => {
    const n = new EmailNotifier({ mkdir: mkdirMock, writeFile: writeFileMock });
    const ev = baseEvent("job:failed", { error: "timeout", progress: 20 });
    await n.send(ev.clientId, ev);
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const first = writeFileMock.mock.calls[0];
    expect(first).toBeDefined();
    const [, content] = first as unknown as [string, string];
    const parsed = JSON.parse(content) as { subject: string };
    expect(parsed.subject).toContain("❌");
    expect(parsed.subject).toContain("web_premium");
  });
});
