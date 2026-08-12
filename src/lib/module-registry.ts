import type { TranslationKey } from "./i18n/i18n";

/**
 * Single source of truth for every "module" a client can rename. Drives both the module-names
 * customization page (row list) and the t() override overlay's key -> module lookup (i18n.tsx).
 * The `key` is the opaque string stored in Client.moduleLabels — TLM never inspects it.
 */
export interface ModuleDefinition {
  key: string;
  /** Translation key resolving this module's built-in singular default name (see locale files' `moduleName`). */
  singularKey: TranslationKey;
  /** Translation key resolving this module's built-in plural default name (reuses each namespace's existing `title`). */
  pluralKey: TranslationKey;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  { key: "dashboard", singularKey: "dashboard.moduleName", pluralKey: "nav.dashboard" },
  { key: "policies", singularKey: "policies.moduleName", pluralKey: "policies.title" },
  { key: "ruleGroups", singularKey: "ruleGroups.moduleName", pluralKey: "ruleGroups.title" },
  { key: "assignments", singularKey: "assignments.moduleName", pluralKey: "assignments.title" },
  { key: "resolve", singularKey: "resolve.moduleName", pluralKey: "resolve.title" },
  { key: "clients", singularKey: "clients.moduleName", pluralKey: "clients.title" },
  { key: "users", singularKey: "users.moduleName", pluralKey: "users.title" },
  { key: "profile", singularKey: "profile.moduleName", pluralKey: "profile.title" },
  { key: "auditLogs", singularKey: "auditLogs.moduleName", pluralKey: "auditLogs.title" },
];

/**
 * Maps a translation key's own namespace prefix to the module it's about. Longest/most-specific
 * prefix wins (checked in order), so a cross-reference living in another module's own namespace —
 * e.g. Dashboard's own stat tiles/quick-actions mentioning Policies/Rule Groups/Assignments/
 * Clients/Resolve by name, or the Resolve page's "Effective policies" summary — correctly resolves
 * to the module it's actually about, not to "dashboard"/"resolve".
 */
const MODULE_KEY_PREFIXES: { prefix: string; moduleKey: string }[] = [
  { prefix: "dashboard.policiesLabel", moduleKey: "policies" },
  { prefix: "dashboard.authorTitle", moduleKey: "policies" },
  { prefix: "dashboard.authorDescription", moduleKey: "policies" },
  { prefix: "dashboard.goToPolicies", moduleKey: "policies" },
  { prefix: "dashboard.ruleGroupsLabel", moduleKey: "ruleGroups" },
  { prefix: "dashboard.assignmentsLabel", moduleKey: "assignments" },
  { prefix: "dashboard.clientsLabel", moduleKey: "clients" },
  { prefix: "dashboard.resolveTitle", moduleKey: "resolve" },
  { prefix: "dashboard.resolveDescription", moduleKey: "resolve" },
  { prefix: "dashboard.openResolver", moduleKey: "resolve" },
  { prefix: "nav.dashboard", moduleKey: "dashboard" },
  { prefix: "dashboard.", moduleKey: "dashboard" },
  { prefix: "nav.policies", moduleKey: "policies" },
  { prefix: "policies.", moduleKey: "policies" },
  { prefix: "nav.ruleGroups", moduleKey: "ruleGroups" },
  { prefix: "ruleGroups.", moduleKey: "ruleGroups" },
  { prefix: "nav.assignments", moduleKey: "assignments" },
  { prefix: "assignments.", moduleKey: "assignments" },
  { prefix: "resolve.effectivePolicies", moduleKey: "policies" },
  { prefix: "resolve.unresolvedDescription", moduleKey: "policies" },
  { prefix: "nav.resolve", moduleKey: "resolve" },
  { prefix: "resolve.", moduleKey: "resolve" },
  { prefix: "nav.clients", moduleKey: "clients" },
  { prefix: "clients.", moduleKey: "clients" },
  { prefix: "nav.users", moduleKey: "users" },
  { prefix: "users.", moduleKey: "users" },
  { prefix: "nav.profile", moduleKey: "profile" },
  { prefix: "profile.", moduleKey: "profile" },
  { prefix: "nav.auditLogs", moduleKey: "auditLogs" },
  { prefix: "auditLogs.", moduleKey: "auditLogs" },
];

export function moduleKeyOf(translationKey: string): string | undefined {
  return MODULE_KEY_PREFIXES.find((entry) => translationKey.startsWith(entry.prefix))?.moduleKey;
}
