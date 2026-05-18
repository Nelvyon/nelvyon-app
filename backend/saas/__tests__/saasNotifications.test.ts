import { describe, expect, it, vi } from "vitest";

import { SaasNotificationService, saasNotificationService, type SaasNotification } from "../SaasNotificationService";

const notif = (over: Partial<SaasNotification> = {}): SaasNotification => ({
  id: "00000000-0000-0000-0000-000000000001",
  userId: "u1",
  tenantId: "t1",
  type: "job_progress",
  title: "Progreso",
  message: "50%",
  metadata: { jobId: "j1" },
  read: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("SaasNotificationService", () => {
  it("createNotification crea y devuelve notificación con todos los campos", async () => {
    const created = notif();
    const query = vi.fn().mockResolvedValue([created]);
    const svc = new SaasNotificationService({ db: { query } });
    const out = await svc.createNotification({
      userId: "u1",
      tenantId: "t1",
      type: "job_progress",
      title: "Progreso",
      message: "50%",
      metadata: { jobId: "j1" },
    });
    expect(out).toEqual(created);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO saas_notifications"), expect.any(Array));
    expect((query.mock.calls[0]?.[1] as unknown[])[5]).toContain("jobId");
  });

  it("createNotification lanza si INSERT no devuelve fila", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasNotificationService({ db: { query } });
    await expect(
      svc.createNotification({ userId: "u1", tenantId: "t1", type: "upsell", title: "t", message: "m" }),
    ).rejects.toThrow("no row");
  });

  it("getNotifications devuelve lista ordenada DESC", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasNotificationService({ db: { query } });
    await svc.getNotifications("u1", "t1", 20);
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY created_at DESC");
  });

  it("getNotifications respeta el límite máximo de 100", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasNotificationService({ db: { query } });
    await svc.getNotifications("u1", "t1", 500);
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", "t1", 100]);
  });

  it("getRecentUnread filtra read = false", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasNotificationService({ db: { query } });
    await svc.getRecentUnread("u1", "t1", 10);
    expect(String(query.mock.calls[0]?.[0])).toContain("read = false");
  });

  it("markAllRead marca todas las no leídas y devuelve el count", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const svc = new SaasNotificationService({ db: { query } });
    expect(await svc.markAllRead("u1", "t1")).toBe(2);
  });

  it("markAllRead con ninguna no leída devuelve 0", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasNotificationService({ db: { query } });
    expect(await svc.markAllRead("u1", "t1")).toBe(0);
  });

  it("markRead con id válido devuelve true", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "x" }]);
    const svc = new SaasNotificationService({ db: { query } });
    expect(await svc.markRead("00000000-0000-0000-0000-000000000099", "u1")).toBe(true);
  });

  it("markRead con id de otro usuario devuelve false", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasNotificationService({ db: { query } });
    expect(await svc.markRead("00000000-0000-0000-0000-000000000099", "otro")).toBe(false);
  });

  it("getUnreadCount devuelve número correcto", async () => {
    const query = vi.fn().mockResolvedValue([{ count: "7" }]);
    const svc = new SaasNotificationService({ db: { query } });
    expect(await svc.getUnreadCount("u1", "t1")).toBe(7);
  });

  it("getUnreadCount con todas leídas devuelve 0", async () => {
    const query = vi.fn().mockResolvedValue([{ count: "0" }]);
    const svc = new SaasNotificationService({ db: { query } });
    expect(await svc.getUnreadCount("u1", "t1")).toBe(0);
  });

  it("saasNotificationService singleton es instancia de SaasNotificationService", () => {
    expect(saasNotificationService).toBeInstanceOf(SaasNotificationService);
  });

  it("getNotifications acota límite inferior a 1", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasNotificationService({ db: { query } });
    await svc.getNotifications("u1", "t1", 0);
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", "t1", 1]);
  });
});
