import { describe, expect, it, vi } from "vitest";

import type { DbClient } from "../../db/DbClient";
import { OS_JOB_REDIS_TTL_SECONDS } from "../../db/RedisClient";
import type { RedisClient } from "../../db/RedisClient";
import { OsJobStorePersistent } from "../OsJobStorePersistent";
import type { OsJob } from "../types";

function sampleJob(overrides: Partial<OsJob> = {}): OsJob {
  const base: OsJob = {
    jobId: "os_test_1",
    serviceId: "web_premium",
    clientId: "c1",
    status: "queued",
    progress: 0,
    steps: [{ name: "s1", description: "d1", status: "pending" }],
    payload: {},
    createdAt: "2026-05-03T10:00:00.000Z",
    updatedAt: "2026-05-03T10:00:00.000Z",
  };
  return { ...base, ...overrides, steps: overrides.steps ?? base.steps };
}

function pgRow(job: OsJob) {
  return {
    job_id: job.jobId,
    service_id: job.serviceId,
    client_id: job.clientId,
    status: job.status,
    progress: job.progress,
    steps: job.steps,
    payload: job.payload,
    intake: job.intake ?? null,
    result: job.result ?? null,
    error: job.error ? JSON.stringify(job.error) : null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

describe("OsJobStorePersistent", () => {
  it("createJob calls Postgres INSERT and Redis set", async () => {
    const dbQuery = vi.fn().mockResolvedValue([]);
    const redisSet = vi.fn().mockResolvedValue(undefined);
    const db = { query: dbQuery, end: vi.fn() } as unknown as DbClient;
    const redis = { set: redisSet, get: vi.fn(), del: vi.fn(), end: vi.fn() } as unknown as RedisClient;
    const store = new OsJobStorePersistent(db, redis);
    const job = sampleJob();

    await store.createJob(job);

    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(String(dbQuery.mock.calls[0]?.[0]).toUpperCase()).toContain("INSERT");
    expect(redisSet).toHaveBeenCalledWith(`os:job:${job.jobId}`, JSON.stringify(job), OS_JOB_REDIS_TTL_SECONDS);
  });

  it("getJob returns from Redis without querying Postgres on hit", async () => {
    const job = sampleJob({ status: "running" });
    const dbQuery = vi.fn();
    const redisGet = vi.fn().mockResolvedValue(JSON.stringify(job));
    const db = { query: dbQuery, end: vi.fn() } as unknown as DbClient;
    const redis = { set: vi.fn(), get: redisGet, del: vi.fn(), end: vi.fn() } as unknown as RedisClient;
    const store = new OsJobStorePersistent(db, redis);

    const out = await store.getJob(job.jobId);

    expect(out?.jobId).toBe(job.jobId);
    expect(redisGet).toHaveBeenCalledWith(`os:job:${job.jobId}`);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("getJob on Redis miss loads Postgres and recaches active jobs in Redis", async () => {
    const job = sampleJob({ status: "running" });
    const row = pgRow(job);
    const dbQuery = vi.fn().mockResolvedValueOnce([row]);
    const redisGet = vi.fn().mockResolvedValue(null);
    const redisSet = vi.fn().mockResolvedValue(undefined);
    const db = { query: dbQuery, end: vi.fn() } as unknown as DbClient;
    const redis = { set: redisSet, get: redisGet, del: vi.fn(), end: vi.fn() } as unknown as RedisClient;
    const store = new OsJobStorePersistent(db, redis);

    const out = await store.getJob(job.jobId);

    expect(out?.jobId).toBe(job.jobId);
    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(String(dbQuery.mock.calls[0]?.[0]).toUpperCase()).toContain("SELECT");
    expect(redisSet).toHaveBeenCalledWith(`os:job:${job.jobId}`, expect.any(String), OS_JOB_REDIS_TTL_SECONDS);
  });

  it("updateJobStatus writes Postgres and syncs Redis", async () => {
    const job = sampleJob({ status: "running", progress: 10 });
    const row = pgRow({ ...job, progress: 50, status: "running" });
    const dbQuery = vi
      .fn()
      .mockResolvedValueOnce([]) // UPDATE
      .mockResolvedValueOnce([row]); // SELECT after update
    const redisSet = vi.fn().mockResolvedValue(undefined);
    const db = { query: dbQuery, end: vi.fn() } as unknown as DbClient;
    const redis = { set: redisSet, get: vi.fn(), del: vi.fn(), end: vi.fn() } as unknown as RedisClient;
    const store = new OsJobStorePersistent(db, redis);

    const nextSteps = [{ name: "s1", description: "d1", status: "completed" as const }];
    await store.updateJobStatus(job.jobId, "running", 50, nextSteps, undefined, null, job.payload, undefined);

    expect(dbQuery).toHaveBeenCalledTimes(2);
    expect(String(dbQuery.mock.calls[0]?.[0]).toUpperCase()).toContain("UPDATE");
    expect(redisSet).toHaveBeenCalled();
  });

  it("createJob completes when Redis.set throws (Postgres already written)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dbQuery = vi.fn().mockResolvedValue([]);
    const redisSet = vi.fn().mockRejectedValue(new Error("redis down"));
    const db = { query: dbQuery, end: vi.fn() } as unknown as DbClient;
    const redis = { set: redisSet, get: vi.fn(), del: vi.fn(), end: vi.fn() } as unknown as RedisClient;
    const store = new OsJobStorePersistent(db, redis);
    const job = sampleJob();

    try {
      await expect(store.createJob(job)).resolves.toBeUndefined();
      expect(dbQuery).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("listJobs queries Postgres only (never Redis)", async () => {
    const job = sampleJob();
    const dbQuery = vi.fn().mockResolvedValue([pgRow(job)]);
    const redisGet = vi.fn();
    const redisSet = vi.fn();
    const db = { query: dbQuery, end: vi.fn() } as unknown as DbClient;
    const redis = { set: redisSet, get: redisGet, del: vi.fn(), end: vi.fn() } as unknown as RedisClient;
    const store = new OsJobStorePersistent(db, redis);

    const list = await store.listJobs();

    expect(list).toHaveLength(1);
    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(String(dbQuery.mock.calls[0]?.[0]).toUpperCase()).toContain("SELECT");
    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });
});
