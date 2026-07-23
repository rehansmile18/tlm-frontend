// Centralized TanStack Query keys so reads and cache invalidations after mutations stay in sync.
export const queryKeys = {
  policyTypes: ["policy-types"] as const,
  policies: (params?: unknown) => ["policies", params ?? {}] as const,
  policy: (id: string, version?: number) => ["policy", id, version ?? "latest"] as const,
  policyVersions: (id: string) => ["policy-versions", id] as const,
  ruleGroups: (params?: unknown) => ["rule-groups", params ?? {}] as const,
  ruleGroup: (id: string) => ["rule-group", id] as const,
  assignments: (params?: unknown) => ["assignments", params ?? {}] as const,
  assignment: (id: string) => ["assignment", id] as const,
  clients: ["clients"] as const,
  myClient: ["clients", "me"] as const,
  users: (params?: unknown) => ["users", params ?? {}] as const,
  auditLogs: (params?: unknown) => ["audit-logs", params ?? {}] as const,
  countries: ["geo", "countries"] as const,
  states: (countryCode: string) => ["geo", "states", countryCode] as const,
};
