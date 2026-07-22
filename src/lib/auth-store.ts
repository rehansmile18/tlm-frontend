import type { AuthUser } from "./types";

// Session persistence. The JWT is a bearer token; we keep it in localStorage so a page reload
// stays logged in, and mirror the user record decoded from the login response. This is a
// client-only module — every accessor guards against server-side rendering.

const TOKEN_KEY = "tlm.token";
const USER_KEY = "tlm.user";

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const l of listeners) l();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function safeParse(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(USER_KEY));
}

// Cached snapshot for useSyncExternalStore: it requires a stable reference between calls when the
// underlying value hasn't changed, so we only re-parse when the raw stored string actually differs.
let cachedRaw: string | null = null;
let cachedUser: AuthUser | null = null;

export function getUserSnapshot(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = safeParse(raw);
  }
  return cachedUser;
}

export function getServerUserSnapshot(): AuthUser | null {
  return null;
}

export function setSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  emit();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  emit();
}
