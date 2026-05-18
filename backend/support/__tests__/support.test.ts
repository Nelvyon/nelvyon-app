import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { SupportService } from "../SupportService";

describe("SupportService", () => {
  beforeEach(() => {
    SupportService.reset();
    queryMock.mockReset();
  });

  it("createTicket sin template devuelve ticketId y autoResponse null", async () => {
    queryMock.mockResolvedValueOnce([{ id: "550e8400-e29b-41d4-a716-446655440000" }]);
    const svc = SupportService.instance();
    const out = await svc.createTicket("user-1", {
      subject: "Hola",
      body: "Cuerpo",
      category: "other",
    });
    expect(out.ticketId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(out.autoResponse).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql] = queryMock.mock.calls[0]!;
    expect(String(sql)).toContain("INSERT INTO support_tickets");
  });

  it("createTicket con templateId billing_invoice incluye autoResponse con factura", async () => {
    queryMock
      .mockResolvedValueOnce([{ auto_response: "Tus facturas están disponibles en Dashboard" }])
      .mockResolvedValueOnce([{ id: "tid-2" }]);
    const svc = SupportService.instance();
    const out = await svc.createTicket("user-1", {
      subject: "Factura",
      body: "No la encuentro",
      category: "billing",
      templateId: "billing_invoice",
    });
    expect(out.autoResponse).toContain("factura");
    expect(out.ticketId).toBe("tid-2");
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("getTemplates sin filtro devuelve lista", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "a",
        category: "billing",
        title: "A",
        description: "d",
        auto_response: "ar",
      },
      {
        id: "b",
        category: "technical",
        title: "B",
        description: "d2",
        auto_response: "ar2",
      },
    ]);
    const svc = SupportService.instance();
    const list = await svc.getTemplates();
    expect(list).toHaveLength(2);
    expect(list[0]!.autoResponse).toBe("ar");
    const [sql] = queryMock.mock.calls[0]!;
    expect(String(sql)).toContain("ORDER BY category, title");
  });

  it("getTemplates con category billing solo billing", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "billing_invoice",
        category: "billing",
        title: "Inv",
        description: "d",
        auto_response: "x",
      },
    ]);
    const svc = SupportService.instance();
    const list = await svc.getTemplates("billing");
    expect(list).toHaveLength(1);
    expect(list[0]!.category).toBe("billing");
    const [, params] = queryMock.mock.calls[0]!;
    expect(params).toEqual(["billing"]);
  });

  it("closeTicket ejecuta UPDATE con status closed", async () => {
    queryMock.mockResolvedValueOnce([]);
    const svc = SupportService.instance();
    await svc.closeTicket("user-1", "tid-9");
    const [sql, params] = queryMock.mock.calls[0]!;
    expect(String(sql)).toMatch(/UPDATE\s+support_tickets/i);
    expect(String(sql)).toContain("status = 'closed'");
    expect(params).toEqual(["tid-9", "user-1"]);
  });
});
