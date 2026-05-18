// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const sendMock = vi.fn().mockResolvedValue({});

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query: queryMock }) },
}));

vi.mock("../../email/sesClient", () => ({
  getSesClient: () => ({ send: sendMock }),
}));

import { DunningService } from "../dunningService";
import {
  finalWarningEmail,
  paymentFailedEmail,
  reactivationEmail,
  suspensionEmail,
} from "../dunningEmailTemplates";

describe("DunningService", () => {
  let service: DunningService;

  beforeEach(() => {
    queryMock.mockReset();
    sendMock.mockClear();
    service = new DunningService({ query: queryMock } as never);
  });

  it("handlePaymentFailed attempt 1 guarda en log y envía email de pago fallido", async () => {
    queryMock
      .mockResolvedValueOnce([
        { user_id: "u-1", email: "a@test.com", full_name: "Ana", plan: "pro" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.handlePaymentFailed("tenant-1", "sub_paddle_1", 1, "evt_1");

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO dunning_log"),
      ["tenant-1", "sub_paddle_1", 1, "evt_1"],
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("'grace_period'"),
      ["tenant-1", "sub_paddle_1", "evt_1"],
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
    const expected = paymentFailedEmail("Ana", "pro", "https://customer.paddle.com");
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Message.Subject.Data).toBe(expected.subject);
  });

  it("handleSuspension marca plan suspended", async () => {
    queryMock
      .mockResolvedValueOnce([
        { user_id: "u-1", email: "a@test.com", full_name: "Ana", plan: "pro" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.handleSuspension("tenant-1", "sub_paddle_1");

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("plan = 'suspended'"),
      ["tenant-1"],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("status = 'suspended'"),
      expect.any(Array),
    );
    const expected = suspensionEmail("Ana", "https://customer.paddle.com");
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Message.Subject.Data).toBe(expected.subject);
  });

  it("handleReactivation restaura plan y envía email", async () => {
    queryMock
      .mockResolvedValueOnce([
        { user_id: "u-1", email: "a@test.com", full_name: "Ana", plan: "suspended" },
      ])
      .mockResolvedValueOnce([{ plan: "pro" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.handleReactivation("tenant-1", "sub_paddle_1");

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE nelvyon_users SET plan = $2"),
      ["tenant-1", "pro"],
    );
    const expected = reactivationEmail("Ana", "pro");
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Message.Subject.Data).toBe(expected.subject);
  });

  it("getGracePeriodStatus calcula daysLeft correctamente", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    queryMock
      .mockResolvedValueOnce([{ plan: "pro" }])
      .mockResolvedValueOnce([{ created_at: threeDaysAgo }]);

    const status = await service.getGracePeriodStatus("tenant-1");
    expect(status.inGrace).toBe(true);
    expect(status.daysLeft).toBe(4);
  });

  it("handlePaymentFailed attempt >= 3 envía aviso final", async () => {
    queryMock
      .mockResolvedValueOnce([
        { user_id: "u-1", email: "a@test.com", full_name: "Ana", plan: "pro" },
      ])
      .mockResolvedValueOnce([]);

    await service.handlePaymentFailed("tenant-1", "sub_paddle_1", 3, "evt_3");

    const expected = finalWarningEmail("Ana", "https://customer.paddle.com");
    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.Message.Subject.Data).toBe(expected.subject);
  });
});
