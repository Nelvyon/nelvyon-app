import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createNelvyonClient } from "../src/index";

describe("@nelvyon/sdk", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listContacts calls /contacts with Bearer auth", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ contacts: [{ id: "1", name: "Ana" }] }), { status: 200 }),
    );
    const client = createNelvyonClient({
      baseUrl: "https://app.test/api/public/v2",
      apiKey: "nel_test",
    });
    const { contacts } = await client.listContacts();
    expect(contacts).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://app.test/api/public/v2/contacts",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer nel_test" }),
      }),
    );
  });

  it("throws on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const client = createNelvyonClient({ baseUrl: "https://app.test/api/public/v2", apiKey: "x" });
    await expect(client.getHealth()).rejects.toThrow("Unauthorized");
  });
});
