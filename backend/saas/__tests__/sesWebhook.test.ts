/**
 * SES/SNS webhook tests — Bounce, Complaint, Delivery, SubscriptionConfirmation.
 * SKIP_SNS_VERIFY=true bypasses RSA signature check (set before import).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.SKIP_SNS_VERIFY = "true";

// ─── Mock DbClient ────────────────────────────────────────────────────────────
const dbUpdates: Array<{ sql: string; params: unknown[] }> = [];

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({
      query: async (sql: string, params: unknown[]) => {
        dbUpdates.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
        return [];
      },
    }),
  },
}));

import { POST } from "../../../apps/web/src/app/api/webhooks/ses/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSnsPost(sesNotification: object, overrides: Record<string, unknown> = {}): Request {
  const envelope = {
    Type: "Notification",
    MessageId: "msg-1",
    TopicArn: "arn:aws:sns:us-east-1:123:ses",
    Message: JSON.stringify(sesNotification),
    Timestamp: new Date().toISOString(),
    SignatureVersion: "1",
    Signature: "test-sig",
    SigningCertURL: "https://sns.us-east-1.amazonaws.com/cert.pem",
    ...overrides,
  };
  return new Request("https://nelvyon.com/api/webhooks/ses", {
    method: "POST",
    body: JSON.stringify(envelope),
    headers: { "Content-Type": "application/json" },
  });
}

function withHeaders(campaniaId: string, contactId: string, tenantId: string) {
  return {
    headers: [
      { name: "X-Tenant-Id", value: tenantId },
      { name: "X-Campania-Id", value: campaniaId },
      { name: "X-Recipient-Id", value: contactId },
    ],
  };
}

beforeEach(() => { dbUpdates.length = 0; });

// ─── Bounce ───────────────────────────────────────────────────────────────────

describe("Bounce", () => {
  it("actualiza recipient a 'bounced' usando ids de headers", async () => {
    const res = await POST(makeSnsPost({
      notificationType: "Bounce",
      bounce: { bouncedRecipients: [{ emailAddress: "bad@x.com" }], bounceType: "Permanent" },
      mail: withHeaders("camp-1", "contact-1", "tenant-1"),
    }) as never);

    const body = await res.json() as { ok: boolean; type: string };
    expect(res.status).toBe(200);
    expect(body.type).toBe("Bounce");

    const upd = dbUpdates.find((u) => u.sql.includes("status = 'bounced'") && u.params.includes("tenant-1"));
    expect(upd).toBeDefined();
    expect(upd?.params).toEqual(["tenant-1", "camp-1", "contact-1"]);
  });

  it("cae a email-match si no hay headers de correlación", async () => {
    await POST(makeSnsPost({
      notificationType: "Bounce",
      bounce: { bouncedRecipients: [{ emailAddress: "nohdr@x.com" }], bounceType: "Permanent" },
      mail: { headers: [] },
    }) as never);

    const upd = dbUpdates.find((u) => u.sql.includes("sc.email = $1"));
    expect(upd).toBeDefined();
    expect(upd?.params).toContain("nohdr@x.com");
  });
});

// ─── Complaint ────────────────────────────────────────────────────────────────

describe("Complaint", () => {
  it("marca recipient como 'unsubscribed' y añade tag al contacto", async () => {
    await POST(makeSnsPost({
      notificationType: "Complaint",
      complaint: { complainedRecipients: [{ emailAddress: "spam@x.com" }] },
      mail: { headers: [] },
    }) as never);

    const recipientUpd = dbUpdates.find((u) => u.sql.includes("'unsubscribed'") && u.params.includes("spam@x.com"));
    expect(recipientUpd).toBeDefined();

    const tagUpd = dbUpdates.find((u) => u.sql.includes("saas_contacts") && u.sql.includes("unsubscribed"));
    expect(tagUpd).toBeDefined();
  });
});

// ─── Delivery ─────────────────────────────────────────────────────────────────

describe("Delivery", () => {
  it("actualiza recipient de 'pending' a 'sent' con sent_at", async () => {
    await POST(makeSnsPost({
      notificationType: "Delivery",
      delivery: { recipients: ["ok@x.com"] },
      mail: withHeaders("camp-2", "contact-2", "tenant-2"),
    }) as never);

    const upd = dbUpdates.find((u) => u.sql.includes("THEN 'sent'") && u.params.includes("tenant-2"));
    expect(upd).toBeDefined();
    expect(upd?.params).toEqual(["tenant-2", "camp-2", "contact-2"]);
  });

  it("no hace nada si no hay ids de correlación", async () => {
    const before = dbUpdates.length;
    await POST(makeSnsPost({
      notificationType: "Delivery",
      delivery: { recipients: ["ok@x.com"] },
      mail: { headers: [] },
    }) as never);
    expect(dbUpdates.length).toBe(before); // no queries
  });
});

// ─── SubscriptionConfirmation ─────────────────────────────────────────────────

describe("SubscriptionConfirmation", () => {
  it("llama a SubscribeURL y responde confirmed:true", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const req = new Request("https://nelvyon.com/api/webhooks/ses", {
      method: "POST",
      body: JSON.stringify({
        Type: "SubscriptionConfirmation",
        MessageId: "sub-1",
        TopicArn: "arn:test",
        Message: "Subscribe",
        Timestamp: new Date().toISOString(),
        SignatureVersion: "1",
        Signature: "test",
        SigningCertURL: "https://sns.us-east-1.amazonaws.com/cert.pem",
        SubscribeURL: "https://sns.amazonaws.com/confirm?token=abc",
        Token: "abc",
      }),
    });

    const res = await POST(req as never);
    const body = await res.json() as { ok: boolean; confirmed: boolean };
    expect(body.confirmed).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sns.amazonaws.com/confirm?token=abc",
      expect.any(Object),
    );
    vi.unstubAllGlobals();
  });
});

// ─── Error cases ──────────────────────────────────────────────────────────────

describe("Error cases", () => {
  it("retorna 400 con body no-JSON", async () => {
    const req = new Request("https://nelvyon.com/api/webhooks/ses", {
      method: "POST", body: "not json",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("retorna 400 si Message no es JSON válido", async () => {
    // Construct envelope manually with an un-parseable Message field
    const envelope = {
      Type: "Notification",
      MessageId: "msg-bad",
      TopicArn: "arn:test",
      Message: "{ broken json {{{{",
      Timestamp: new Date().toISOString(),
      SignatureVersion: "1",
      Signature: "test",
      SigningCertURL: "https://sns.us-east-1.amazonaws.com/cert.pem",
    };
    const req = new Request("https://nelvyon.com/api/webhooks/ses", {
      method: "POST",
      body: JSON.stringify(envelope),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});
