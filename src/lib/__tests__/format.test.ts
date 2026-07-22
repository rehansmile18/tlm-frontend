import { describe, expect, it } from "vitest";
import { assignmentStatusTone, formatDate, humanizePolicyType, humanizeRole, policyStatusTone, toDateInput } from "../format";

describe("format helpers", () => {
  it("formats an ISO date and returns a dash for empty", () => {
    expect(formatDate("2024-06-01T00:00:00.000Z")).toContain("2024");
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("converts an ISO date to a yyyy-MM-dd input value", () => {
    expect(toDateInput("2024-06-01")).toBe("2024-06-01");
    expect(toDateInput(null)).toBe("");
  });

  it("humanizes policy types and roles", () => {
    expect(humanizePolicyType("CA_MEAL_BREAK")).toBe("Ca Meal Break");
    expect(humanizePolicyType("OVERTIME")).toBe("Overtime");
    expect(humanizeRole("PLATFORM_ADMIN")).toBe("Platform Admin");
  });

  it("maps statuses to badge tones", () => {
    expect(policyStatusTone("active")).toBe("success");
    expect(policyStatusTone("pending_approval")).toBe("warning");
    expect(policyStatusTone("draft")).toBe("info");
    expect(assignmentStatusTone("expired")).toBe("muted");
  });
});
