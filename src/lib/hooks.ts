"use client";

import { useQuery } from "@tanstack/react-query";
import { clientsApi, geoApi, policiesApi, usersApi } from "./resources";
import { queryKeys } from "./query-keys";
import { useAuth, useRole } from "./auth";

/** Policy-type registry + per-type JSON rules schema (drives the dynamic policy form). */
export function usePolicyTypes() {
  return useQuery({
    queryKey: queryKeys.policyTypes,
    queryFn: () => policiesApi.listTypes(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Client list — only platform admins may call GET /clients (others are hard-scoped to their own
 * client and don't need the picker), so the query is disabled for non-admins.
 */
export function useClients() {
  const { isPlatformAdmin } = useRole();
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => clientsApi.list(),
    enabled: isPlatformAdmin,
    staleTime: 60 * 1000,
  });
}

/** The caller's own client (null for PLATFORM_ADMIN, who spans all clients). Drives the app-wide date format. */
export function useMyClient() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.myClient,
    queryFn: () => clientsApi.getMine(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The caller's own full profile, including personal preferences (preferredLanguage,
 * preferredDateFormat) that aren't part of the login-time AuthUser snapshot once they're changed
 * mid-session — the profile page and DateFormatProvider both read this as the live source of truth.
 */
export function useMyProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.myProfile,
    queryFn: () => usersApi.me(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

/** Full country list for a client's country picker. */
export function useCountries() {
  return useQuery({
    queryKey: queryKeys.countries,
    queryFn: () => geoApi.listCountries(),
    staleTime: Infinity,
  });
}

/** States/provinces for a given ISO country code — disabled until a real country is selected. */
export function useStatesForCountry(countryCode: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.states(countryCode ?? ""),
    queryFn: () => geoApi.listStates(countryCode as string),
    enabled: Boolean(countryCode),
    staleTime: Infinity,
  });
}
