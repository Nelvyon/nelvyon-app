import { ApiClient } from "@/core/api/apiClient";
import { ApiError } from "@/core/api/types";

describe("ApiClient", () => {
  it("throws ApiError on 403", async () => {
    const client = new ApiClient({ baseUrl: "http://localhost:8000" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(client.get("/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("retries once on 503 and then succeeds", async () => {
    const client = new ApiClient({ baseUrl: "http://localhost:8000", maxRetries: 1, retryDelayMs: 1 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await client.get<{ ok: boolean }>("/health");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
