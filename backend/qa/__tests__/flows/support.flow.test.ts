import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { SupportService } from "../../../support/SupportService";

describe("flow: soporte — ticket → auto-respuesta → resolución", () => {
  beforeEach(() => {
    SupportService.reset();
    queryMock.mockReset();
  });

  it("createTicket con template devuelve auto-respuesta", async () => {
    queryMock
      .mockResolvedValueOnce([{ auto_response: "Tus facturas están en Dashboard > Facturación" }])
      .mockResolvedValueOnce([{ id: "tid-1" }]);

    const out = await SupportService.instance().createTicket("user-1", {
      subject: "Factura",
      body: "No la encuentro",
      category: "billing",
      templateId: "billing_invoice",
    });

    expect(out.autoResponse).toContain("factura");
    expect(out.ticketId).toBe("tid-1");
  });

  it("createTicket sin template → autoResponse null", async () => {
    queryMock.mockResolvedValueOnce([{ id: "tid-2" }]);

    const out = await SupportService.instance().createTicket("user-1", {
      subject: "Ayuda",
      body: "Detalle",
      category: "other",
    });

    expect(out.autoResponse).toBeNull();
  });

  it("getTickets filtra por user_id", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "t1",
        user_id: "user-1",
        subject: "S",
        body: "B",
        category: "other",
        status: "open",
        priority: "normal",
        template_used: null,
        auto_response: null,
        resolved_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const tickets = await SupportService.instance().getTickets("user-1");
    expect(tickets).toHaveLength(1);
    expect(queryMock.mock.calls[0]![1]).toEqual(["user-1"]);
  });

  it("closeTicket marca status closed", async () => {
    queryMock.mockResolvedValueOnce([]);
    await SupportService.instance().closeTicket("user-1", "tid-9");
    expect(String(queryMock.mock.calls[0]![0])).toContain("status = 'closed'");
  });

  it("getTemplates filtra por category", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: "billing_invoice",
        category: "billing",
        title: "Inv",
        description: "d",
        auto_response: "x",
      },
    ]);

    const list = await SupportService.instance().getTemplates("billing");
    expect(list[0]!.category).toBe("billing");
    expect(queryMock.mock.calls[0]![1]).toEqual(["billing"]);
  });
});
