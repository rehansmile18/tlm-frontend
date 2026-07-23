"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "./resources";
import {
  clearSession,
  getServerUserSnapshot,
  getUserSnapshot,
  setSession,
  subscribeSession,
} from "./auth-store";
import { useTranslation } from "./i18n/i18n";
import type { AuthUser, UserRole } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setLocale } = useTranslation();

  // Session lives in localStorage; subscribe to it as an external store so reads are consistent
  // across tabs and hydration-safe (server snapshot is always null).
  const user = useSyncExternalStore(subscribeSession, getUserSnapshot, getServerUserSnapshot);

  // Gate route guards until after mount so an authenticated user isn't bounced to /login during
  // the initial (server-snapshot) render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-hydration flag
    setMounted(true);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      setSession(res.token, res.user);
      // Honor the account's saved language on sign-in, so it follows the user to a new browser
      // or device — a mid-session switch via the topbar stays local until they save it here.
      if (res.user.preferredLanguage) setLocale(res.user.preferredLanguage);
    },
    [setLocale]
  );

  const logout = useCallback(() => {
    clearSession();
    // Drop every cached query so no previous session's data (policies, rule groups, users, …)
    // can flash or linger into whichever session logs in next.
    queryClient.clear();
    // A hard redirect, not router.replace: it guarantees a full reset (no reliance on every
    // consumer correctly reacting to the store change) and can't be raced by in-flight requests
    // or lingering component state from the authenticated app shell.
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      router.replace("/login");
    }
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), isReady: mounted, login, logout }),
    [user, mounted, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export interface RoleInfo {
  role: UserRole | undefined;
  isPlatformAdmin: boolean;
  isClientAdmin: boolean;
  isViewer: boolean;
  canWrite: boolean;
  clientId: string | null;
}

export function useRole(): RoleInfo {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    isPlatformAdmin: role === "PLATFORM_ADMIN",
    isClientAdmin: role === "CLIENT_ADMIN",
    isViewer: role === "VIEWER",
    canWrite: role === "PLATFORM_ADMIN" || role === "CLIENT_ADMIN",
    clientId: user?.clientId ?? null,
  };
}
