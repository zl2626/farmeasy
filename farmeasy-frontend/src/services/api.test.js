import { beforeEach, describe, expect, it, vi } from "vitest";

import { api, mediaUrl } from "./api";


function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}


describe("api client", () => {
  beforeEach(() => {
    localStorage.setItem("token", "expired-access");
    localStorage.setItem("refresh", "valid-refresh");
  });

  it("refreshes once after a 401 and retries with the new access token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ access: "fresh-access" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get("/protected/")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1].headers.get("Authorization")).toBe(
      "Bearer fresh-access",
    );
  });

  it("clears only authentication state when token refresh fails", async () => {
    localStorage.setItem("unrelated-preference", "keep-me");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401))
        .mockResolvedValueOnce(jsonResponse({ detail: "invalid refresh" }, 401)),
    );

    await expect(api.get("/protected/")).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(localStorage.getItem("unrelated-preference")).toBe("keep-me");
  });

  it("leaves absolute media URLs unchanged and prefixes relative paths", () => {
    expect(mediaUrl("https://images.example.cn/crop.jpg")).toBe(
      "https://images.example.cn/crop.jpg",
    );
    expect(mediaUrl("/media/crops/rice.jpg")).toBe("/media/crops/rice.jpg");
  });
});
