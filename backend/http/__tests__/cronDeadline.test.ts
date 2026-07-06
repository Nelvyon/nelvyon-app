import { describe, it, expect, vi } from "vitest";
import { runWithCronDeadline, CRON_ROUTE_DEADLINE_MS } from "../cronDeadline";

describe("runWithCronDeadline", () => {
  it("returns result when fn completes in time", async () => {
    await expect(runWithCronDeadline("test", async () => 42, 1000)).resolves.toBe(42);
  });

  it("rejects when fn exceeds deadline", async () => {
    vi.useFakeTimers();
    const pending = runWithCronDeadline(
      "slow",
      () => new Promise<number>((resolve) => setTimeout(() => resolve(1), CRON_ROUTE_DEADLINE_MS)),
      50,
    );
    await vi.advanceTimersByTimeAsync(60);
    await expect(pending).rejects.toThrow(/deadline exceeded/);
    vi.useRealTimers();
  });
});
