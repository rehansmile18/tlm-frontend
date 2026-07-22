"use client";

import { useQuery } from "@tanstack/react-query";
import { clientsApi, policiesApi } from "./resources";
import { queryKeys } from "./query-keys";
import { useRole } from "./auth";

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
