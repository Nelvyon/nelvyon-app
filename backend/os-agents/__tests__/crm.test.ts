import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

import { CrmService } from "../crm/CrmService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const CONTACT_ID = "11111111-1111-1111-1111-111111111111";

describe("CrmService", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("upsertContact insert devuelve contacto", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: CONTACT_ID,
        user_id: USER_ID,
        name: "Ana",
        email: "a@b.com",
        phone: null,
        company: "Acme",
        industry: "saas",
        stage: "lead",
        score: 0,
        tags: null,
        notes: null,
        metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const c = await CrmService.upsertContact(USER_ID, { name: "Ana", email: "a@b.com", company: "Acme", industry: "saas" });
    expect(c.name).toBe("Ana");
    expect(c.userId).toBe(USER_ID);
    expect(queryMock).toHaveBeenCalled();
  });

  it("getContacts filtra por stage", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: CONTACT_ID,
        user_id: USER_ID,
        name: "Bob",
        email: null,
        phone: null,
        company: null,
        industry: null,
        stage: "prospect",
        score: 5,
        tags: null,
        notes: null,
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const list = await CrmService.getContacts(USER_ID, { stage: "prospect" });
    expect(list).toHaveLength(1);
    expect(list[0].stage).toBe("prospect");
    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).toContain("stage = ");
  });

  it("updateStage actualiza etapa", async () => {
    queryMock.mockResolvedValueOnce([
      {
        id: CONTACT_ID,
        user_id: USER_ID,
        name: "C",
        email: null,
        phone: null,
        company: null,
        industry: null,
        stage: "won",
        score: 0,
        tags: null,
        notes: null,
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
    ]);
    const c = await CrmService.updateStage(CONTACT_ID, USER_ID, "won");
    expect(c.stage).toBe("won");
  });

  it("logActivity registra actividad y refresca score", async () => {
    queryMock
      .mockResolvedValueOnce([{ id: CONTACT_ID }])
      .mockResolvedValueOnce([
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          contact_id: CONTACT_ID,
          user_id: USER_ID,
          type: "email",
          summary: "hola",
          agent_id: null,
          metadata: {},
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const a = await CrmService.logActivity(CONTACT_ID, USER_ID, "email", "hola");
    expect(a.type).toBe("email");
    expect(a.summary).toBe("hola");
    expect(queryMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("scoreContact calcula score correcto", async () => {
    queryMock
      .mockResolvedValueOnce([
        { type: "agent_output", c: "2" },
        { type: "email", c: "1" },
        { type: "call", c: "1" },
      ])
      .mockResolvedValueOnce([]);
    const score = await CrmService.scoreContact(CONTACT_ID);
    expect(score).toBe(2 * 10 + 5 + 5);
  });
});
