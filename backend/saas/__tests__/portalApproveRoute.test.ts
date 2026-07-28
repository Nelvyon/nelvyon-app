import { afterEach, describe, expect, it, vi } from "vitest";

const approveMock = vi.fn();
const rejectMock = vi.fn();
const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

vi.mock("../../../apps/web/src/lib/portal/portalDeliverablesStore", () => ({
  approvePortalDeliverableBff: (...args: unknown[]) => approveMock(...args),
  rejectPortalDeliverableBff: (...args: unknown[]) => rejectMock(...args),
}));

import { signPortalApprovalToken } from "../PortalApprovalTokenService";
import { GET, POST } from "../../../apps/web/src/app/api/public/portal/approve/route";

const DID = "00000000-0000-4000-8000-000000000001";
const CID = "00000000-0000-4000-8000-000000000002";
const WID = 1;

function signToken(act: "approve" | "reject"): string {
  process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
  return signPortalApprovalToken({ did: DID, wid: WID, cid: CID, act });
}

describe("GET /api/public/portal/approve", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns preview for valid token", async () => {
    const token = signToken("approve");
    queryMock.mockResolvedValueOnce([
      { title: "Landing pack", status: "delivered", client_id: CID },
    ]);
    const res = await GET(
      new Request(`https://app.test/api/public/portal/approve?token=${encodeURIComponent(token)}`),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe("Landing pack");
    expect(json.action).toBe("approve");
  });

  it("returns 400 for malformed token", async () => {
    const res = await GET(new Request("https://app.test/api/public/portal/approve?token=bad"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/public/portal/approve", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("approves with optional feedback (token act fallback)", async () => {
    const token = signToken("approve");
    queryMock
      .mockResolvedValueOnce([{ id: "claim-1" }])
      .mockResolvedValueOnce([{ client_id: CID }]);
    approveMock.mockResolvedValueOnce({ id: DID, status: "approved_by_client" });

    const res = await POST(
      new Request("https://app.test/api/public/portal/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, feedback: "Looks great" }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.action).toBe("approve");
    expect(approveMock).toHaveBeenCalledWith(
      expect.objectContaining({ deliverableId: DID, feedback: "Looks great" }),
    );
  });

  it("rejects via body decision with required feedback", async () => {
    const token = signToken("reject");
    queryMock
      .mockResolvedValueOnce([{ id: "claim-1" }])
      .mockResolvedValueOnce([{ client_id: CID }]);
    rejectMock.mockResolvedValueOnce({ id: DID, status: "needs_revision" });

    const res = await POST(
      new Request("https://app.test/api/public/portal/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          decision: "reject",
          feedback: "Change headline copy",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("reject");
    expect(rejectMock).toHaveBeenCalledWith(
      expect.objectContaining({ feedback: "Change headline copy" }),
    );
  });

  it("returns 400 when rejecting without feedback", async () => {
    const token = signToken("reject");
    queryMock.mockResolvedValueOnce([{ id: "claim-1" }]).mockResolvedValueOnce([{ client_id: CID }]);

    const res = await POST(
      new Request("https://app.test/api/public/portal/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision: "reject" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(rejectMock).not.toHaveBeenCalled();
  });

  it("honors ?action=reject query when body decision omitted", async () => {
    const token = signToken("approve");
    queryMock
      .mockResolvedValueOnce([{ id: "claim-1" }])
      .mockResolvedValueOnce([{ client_id: CID }]);
    rejectMock.mockResolvedValueOnce({ id: DID, status: "needs_revision" });

    const res = await POST(
      new Request("https://app.test/api/public/portal/approve?action=reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, feedback: "Needs revision" }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("reject");
    expect(rejectMock).toHaveBeenCalled();
  });

  it("returns 410 when token already used", async () => {
    const token = signToken("approve");
    queryMock.mockResolvedValueOnce([]);

    const res = await POST(
      new Request("https://app.test/api/public/portal/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }),
    );
    expect(res.status).toBe(410);
  });
});
