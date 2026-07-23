import { format, isValid, parseISO } from "date-fns";
import type { AssignmentStatus, CalendarFormat, PolicyStatus, PolicyType, RuleGroupStatus, UserRole } from "./types";

// date-fns pattern for each per-client CalendarFormat setting (see useDateFormat/DateFormatProvider
// in date-format.tsx, which is the format-aware entry point most UI should use instead of these).
export const CALENDAR_FORMAT_PATTERNS: Record<CalendarFormat, string> = {
  "MM/DD/YYYY": "MM/dd/yyyy",
  "DD/MM/YYYY": "dd/MM/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

/** Locale-agnostic fallback (no client format available yet, e.g. before login resolves). */
export function formatDate(iso?: string | null, pattern: string = "MM/dd/yyyy"): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, pattern) : "—";
}

/** Locale-agnostic fallback (no client format available yet, e.g. before login resolves). */
export function formatDateTime(iso?: string | null, pattern: string = "MM/dd/yyyy"): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, `${pattern} · HH:mm`) : "—";
}

/** ISO string -> "yyyy-MM-dd" for <input type="date">. */
export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

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

// Maps a status to a shadcn Badge variant + tailwind accent, so status reads at a glance.
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "muted";

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

export const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-transparent bg-secondary text-secondary-foreground",
  info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  muted: "border-transparent bg-muted text-muted-foreground",
};

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
