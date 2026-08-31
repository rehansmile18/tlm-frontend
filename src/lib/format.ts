import type { AssignmentStatus, PolicyStatus, PolicyType, RuleGroupStatus, UserRole } from "./types";
import type { BadgeTone } from "./format-core";

// Everything generic lives in format-core.ts, which is byte-identical across both frontends (see
// shared-files.json). This module adds only what is specific to the rule repository's domain.
export * from "./format-core";

export function humanizePolicyType(type: PolicyType): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function humanizeRole(role: UserRole): string {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function policyStatusTone(status: PolicyStatus): BadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "pending_approval":
      return "warning";
    case "draft":
      return "info";
    case "superseded":
      return "muted";
    case "archived":
      return "muted";
    default:
      return "neutral";
  }
}

export function ruleGroupStatusTone(status: RuleGroupStatus): BadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "draft":
      return "info";
    case "superseded":
    case "archived":
      return "muted";
    default:
      return "neutral";
  }
}

export function assignmentStatusTone(status: AssignmentStatus): BadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "scheduled":
      return "info";
    case "expired":
      return "muted";
    default:
      return "neutral";
  }
}

// US states + DC, for jurisdiction and assignment target pickers.
export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];
