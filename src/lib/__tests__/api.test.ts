import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../api";
import { getToken, setSession } from "../auth-store";

const demoUser = {
  userId: "u1",
  email: "a@b.c",
  role: "VIEWER" as const,
  clientId: null,
  preferredLanguage: null,
  preferredDateFormat: null,
};

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("returns parsed JSON and attaches the bearer token", async () => {
    setSession("tok123", demoUser);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiFetch<{ ok: boolean }>("/policies");
    expect(data).toEqual({ ok: true });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok123");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/policies");
  });

  it("normalizes the backend error envelope into an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "BadRequest", message: "nope" }), { status: 400 })));
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 400, message: "nope" });
  });

  it("clears the session on a 401", async () => {
    setSession("tok", demoUser);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(apiFetch("/x")).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBeNull();
  });
});
