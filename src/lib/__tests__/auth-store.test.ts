import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, getStoredUser, getUserSnapshot, setSession, subscribeSession } from "../auth-store";

const user = { userId: "u1", email: "a@b.c", role: "CLIENT_ADMIN" as const, clientId: "c1" };

describe("auth-store", () => {
  afterEach(() => {
    clearSession();
    localStorage.clear();
  });

  it("persists and reads the session", () => {
    setSession("t", user);
    expect(getStoredUser()).toEqual(user);
  });

  it("returns a stable snapshot reference until the value changes", () => {
    setSession("t", user);
    expect(getUserSnapshot()).toBe(getUserSnapshot());
  });

  it("notifies subscribers on change and clears the session", () => {
    const cb = vi.fn();
    const unsubscribe = subscribeSession(cb);
    setSession("t", user);
    expect(cb).toHaveBeenCalled();
    clearSession();
    expect(getStoredUser()).toBeNull();
    unsubscribe();
  });
});
