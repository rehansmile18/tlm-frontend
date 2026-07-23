import { apiFetch } from "./api";
import type {
  Assignment,
  AssignmentStatus,
  AssignmentTargetType,
  AuditLog,
  CalendarFormat,
  Client,
  GeoCountry,
  GeoState,
  LoginResponse,
  Paginated,
  Policy,
  PolicyRef,
  PolicyScope,
  PolicyStatus,
  PolicyType,
  PolicyTypeSchema,
  PreferredLanguage,
  ResolveResult,
  RuleGroup,
  RuleGroupStatus,
  UserProfile,
  UserRecord,
  UserRole,
} from "./types";

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>("/auth/login", { method: "POST", body: { email, password } }),
};

// ---- Policies ----
export interface PolicyListParams {
  policyType?: PolicyType;
  clientId?: string;
  scope?: PolicyScope;
  state?: string;
  status?: PolicyStatus;
  effectiveOn?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePolicyBody {
  scope: PolicyScope;
  clientId?: string;
  policyType: PolicyType;
  jurisdiction?: { country: string; state: string | null };
  name: string;
  description?: string;
  effectiveFrom: string;
  rules: Record<string, unknown>;
}

export interface UpdatePolicyBody {
  name?: string;
  description?: string;
  effectiveFrom: string;
  jurisdiction?: { country: string; state: string | null };
  rules?: Record<string, unknown>;
}

export const policiesApi = {
  listTypes: () => apiFetch<{ policyTypes: PolicyTypeSchema[] }>("/policy-types"),
  list: (params: PolicyListParams = {}) => apiFetch<Paginated<Policy>>("/policies", { query: { ...params } }),
  get: (policyId: string, version?: number) => apiFetch<Policy>(`/policies/${policyId}`, { query: { version } }),
  versions: (policyId: string) => apiFetch<{ items: Policy[] }>(`/policies/${policyId}/versions`),
  create: (body: CreatePolicyBody) => apiFetch<Policy>("/policies", { method: "POST", body }),
  update: (policyId: string, body: UpdatePolicyBody) => apiFetch<Policy>(`/policies/${policyId}`, { method: "PATCH", body }),
  publish: (policyId: string) => apiFetch<Policy>(`/policies/${policyId}/publish`, { method: "POST" }),
  submit: (policyId: string) => apiFetch<Policy>(`/policies/${policyId}/submit-for-approval`, { method: "POST" }),
  approve: (policyId: string) => apiFetch<Policy>(`/policies/${policyId}/approve`, { method: "POST" }),
  reject: (policyId: string, reason?: string) =>
    apiFetch<Policy>(`/policies/${policyId}/reject`, { method: "POST", body: { reason } }),
  archive: (policyId: string) => apiFetch<Policy>(`/policies/${policyId}/archive`, { method: "POST" }),
  clone: (policyId: string, clientId: string, effectiveFrom?: string) =>
    apiFetch<Policy>(`/policies/${policyId}/clone`, { method: "POST", body: { clientId, effectiveFrom } }),
};

// ---- Rule Groups ----
export interface RuleGroupListParams {
  clientId?: string;
  status?: RuleGroupStatus;
  page?: number;
  pageSize?: number;
}

export interface CreateRuleGroupBody {
  clientId: string;
  name: string;
  description?: string;
  effectiveFrom: string;
  policyRefs: PolicyRef[];
}

export interface UpdateRuleGroupBody {
  name?: string;
  description?: string;
  effectiveFrom: string;
  policyRefs?: PolicyRef[];
}

export const ruleGroupsApi = {
  list: (params: RuleGroupListParams = {}) => apiFetch<Paginated<RuleGroup>>("/rule-groups", { query: { ...params } }),
  get: (ruleGroupId: string) => apiFetch<RuleGroup>(`/rule-groups/${ruleGroupId}`),
  create: (body: CreateRuleGroupBody) => apiFetch<RuleGroup>("/rule-groups", { method: "POST", body }),
  update: (ruleGroupId: string, body: UpdateRuleGroupBody) =>
    apiFetch<RuleGroup>(`/rule-groups/${ruleGroupId}`, { method: "PATCH", body }),
  publish: (ruleGroupId: string) => apiFetch<RuleGroup>(`/rule-groups/${ruleGroupId}/publish`, { method: "POST" }),
  archive: (ruleGroupId: string) => apiFetch<RuleGroup>(`/rule-groups/${ruleGroupId}/archive`, { method: "POST" }),
};

// ---- Assignments ----
export interface AssignmentListParams {
  clientId?: string;
  ruleGroupId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateAssignmentBody {
  clientId: string;
  ruleGroupId: string;
  targetType: AssignmentTargetType;
  targetIds: string[];
  priority?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface UpdateAssignmentBody {
  targetIds?: string[];
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  status?: AssignmentStatus;
}

export interface ResolveParams {
  clientId: string;
  employeeId: string;
  date: string;
  paygroupId?: string;
  locationId?: string;
  departmentId?: string;
  state?: string;
}

export const assignmentsApi = {
  list: (params: AssignmentListParams = {}) => apiFetch<Paginated<Assignment>>("/assignments", { query: { ...params } }),
  get: (assignmentId: string) => apiFetch<Assignment>(`/assignments/${assignmentId}`),
  create: (body: CreateAssignmentBody) => apiFetch<Assignment>("/assignments", { method: "POST", body }),
  update: (assignmentId: string, body: UpdateAssignmentBody) =>
    apiFetch<Assignment>(`/assignments/${assignmentId}`, { method: "PATCH", body }),
  resolve: (params: ResolveParams) => apiFetch<ResolveResult>("/assignments/resolve", { query: { ...params } }),
};

// ---- Clients ----
export interface CreateClientBody {
  name: string;
  country?: string | null;
  enabledStates: string[];
  calendarFormat: CalendarFormat;
}

export const clientsApi = {
  list: () => apiFetch<{ items: Client[] }>("/clients"),
  create: (body: CreateClientBody) => apiFetch<Client>("/clients", { method: "POST", body }),
  getMine: () => apiFetch<{ client: Client | null }>("/clients/me"),
};

// ---- Geo (countries / states reference data) ----
export const geoApi = {
  listCountries: () => apiFetch<{ items: GeoCountry[] }>("/geo/countries"),
  listStates: (countryCode: string) => apiFetch<{ items: GeoState[] }>(`/geo/countries/${countryCode}/states`),
};

// ---- Users ----
export interface CreateUserBody {
  email: string;
  password: string;
  role: UserRole;
  clientId?: string;
}

export interface UpdateProfileBody {
  preferredLanguage?: PreferredLanguage | null;
  preferredDateFormat?: CalendarFormat | null;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export const usersApi = {
  list: (params: { clientId?: string; page?: number; pageSize?: number } = {}) =>
    apiFetch<Paginated<UserRecord>>("/users", { query: { ...params } }),
  create: (body: CreateUserBody) => apiFetch<UserRecord>("/users", { method: "POST", body }),
  me: () => apiFetch<UserProfile>("/users/me"),
  updateMe: (body: UpdateProfileBody) => apiFetch<UserProfile>("/users/me", { method: "PATCH", body }),
  changePassword: (body: ChangePasswordBody) => apiFetch<void>("/users/me/change-password", { method: "POST", body }),
  updateAvatar: (avatarUrl: string | null) =>
    apiFetch<UserProfile>("/users/me/avatar", { method: "PATCH", body: { avatarUrl } }),
};

// ---- Audit logs ----
export const auditLogsApi = {
  list: (params: { entityType?: string; entityId?: string; page?: number; pageSize?: number } = {}) =>
    apiFetch<Paginated<AuditLog>>("/audit-logs", { query: { ...params } }),
};
