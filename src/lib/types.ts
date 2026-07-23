// Mirrors the backend domain model (TLM/src/types/domain.ts) and API response shapes.

export const POLICY_TYPES = [
  "OVERTIME",
  "MEAL_BREAK",
  "REST_BREAK",
  "SHIFT",
  "SHIFT_DIFFERENTIAL",
  "PAY_DIFFERENTIAL",
  "NIGHT_DIFFERENTIAL",
  "PAYGROUP",
  "RATE",
  "CA_MEAL_BREAK",
] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_STATUSES = ["draft", "pending_approval", "active", "superseded", "archived"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const POLICY_SCOPES = ["global", "client"] as const;
export type PolicyScope = (typeof POLICY_SCOPES)[number];

export const ASSIGNMENT_TARGET_TYPES = ["EMPLOYEE", "PAYGROUP", "LOCATION", "DEPARTMENT", "STATE"] as const;
export type AssignmentTargetType = (typeof ASSIGNMENT_TARGET_TYPES)[number];

export const ASSIGNMENT_STATUSES = ["active", "scheduled", "expired"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const RULE_GROUP_STATUSES = ["draft", "active", "superseded", "archived"] as const;
export type RuleGroupStatus = (typeof RULE_GROUP_STATUSES)[number];

export const USER_ROLES = ["PLATFORM_ADMIN", "CLIENT_ADMIN", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Per-client date DISPLAY format (day/month/year order) shown to every user under that client,
// everywhere in the app. Calendar math stays Gregorian — this only controls rendering.
export const CALENDAR_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;
export type CalendarFormat = (typeof CALENDAR_FORMATS)[number];

// Specificity used by resolve when target populations overlap (higher wins).
export const TARGET_TYPE_SPECIFICITY: Record<AssignmentTargetType, number> = {
  EMPLOYEE: 50,
  PAYGROUP: 40,
  LOCATION: 30,
  DEPARTMENT: 20,
  STATE: 10,
};

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  clientId: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Jurisdiction {
  country: string;
  state: string | null;
  county?: string | null;
  city?: string | null;
}

export interface PolicyMetadata {
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  tags?: string[];
  rejectionReason?: string | null;
  submittedBy?: string | null;
}

export interface Policy {
  _id: string;
  policyId: string;
  version: number;
  status: PolicyStatus;
  scope: PolicyScope;
  clientId: string | null;
  clonedFromPolicyId: string | null;
  policyType: PolicyType;
  jurisdiction: Jurisdiction;
  name: string;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  rules: Record<string, unknown>;
  metadata: PolicyMetadata;
}

// JSON-Schema subset returned by GET /policy-types for each policy type's `rules` payload.
export interface JsonSchema {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: (string | number)[];
  minimum?: number;
  default?: unknown;
  pattern?: string;
}

export interface PolicyTypeSchema {
  policyType: PolicyType;
  description: string;
  rulesSchema: JsonSchema;
}

export interface PolicyRef {
  policyId: string;
  policyType: PolicyType;
  versionPin: "latest" | number;
}

export interface RuleGroup {
  _id: string;
  ruleGroupId: string;
  clientId: string;
  name: string;
  description: string | null;
  version: number;
  status: RuleGroupStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  policyRefs: PolicyRef[];
  metadata: { createdBy: string; createdAt: string; updatedBy: string; updatedAt: string };
}

export interface Assignment {
  _id: string;
  clientId: string;
  ruleGroupId: string;
  targetType: AssignmentTargetType;
  targetIds: string[];
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: AssignmentStatus;
}

export interface ResolveResult {
  assignment: Assignment;
  ruleGroup: RuleGroup;
  policies: Policy[];
  unresolvedRefs: PolicyRef[];
  consideredAssignments: number;
}

export interface Client {
  _id: string;
  name: string;
  status: string;
  country: string | null;
  enabledStates: string[];
  calendarFormat: CalendarFormat;
  createdAt: string;
}

export interface GeoCountry {
  isoCode: string;
  name: string;
}

export interface GeoState {
  isoCode: string;
  name: string;
}

export interface UserRecord {
  _id?: string;
  userId?: string;
  email: string;
  role: UserRole;
  clientId: string | null;
  status?: string;
  createdAt?: string;
}

export interface AuditLog {
  _id: string;
  entityType: "policy" | "ruleGroup" | "assignment";
  entityId: string;
  action: string;
  actorId: string;
  before: unknown;
  after: unknown;
  timestamp: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
