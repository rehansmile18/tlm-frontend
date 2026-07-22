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
import { authApi } from "./resources";
import {
  clearSession,
  getServerUserSnapshot,
  getUserSnapshot,
  setSession,
  subscribeSession,
} from "./auth-store";
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setSession(res.token, res.user);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

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
