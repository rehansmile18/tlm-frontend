import { describe, expect, it } from "vitest";
import { collectRuleErrors, defaultForSchema, sanitizeRules } from "../rules-fields";
import type { JsonSchema } from "@/lib/types";

const overtime: JsonSchema = {
  type: "object",
  required: ["workweekStartDay", "weeklyOTThresholdHours"],
  properties: {
    workweekStartDay: { type: "string", enum: ["Sunday", "Monday"] },
    weeklyOTThresholdHours: { type: "number" },
    dailyOTThresholdHours: { type: ["number", "null"] },
  },
};

describe("rules helpers", () => {
  it("flags missing required fields", () => {
    const errors = collectRuleErrors(overtime, { workweekStartDay: "", weeklyOTThresholdHours: "" });
    expect(errors).toContain("Workweek Start Day");
    expect(errors).toContain("Weekly O T Threshold Hours");
  });

  it("passes validation when required fields are present", () => {
    const errors = collectRuleErrors(overtime, { workweekStartDay: "Sunday", weeklyOTThresholdHours: 40 });
    expect(errors).toHaveLength(0);
  });

  it("sanitizes blank number fields to null", () => {
    const clean = sanitizeRules(overtime, {
      workweekStartDay: "Sunday",
      weeklyOTThresholdHours: 40,
      dailyOTThresholdHours: "",
    });
    expect(clean.dailyOTThresholdHours).toBeNull();
  });

  it("builds a default value from a schema", () => {
    const value = defaultForSchema(overtime) as Record<string, unknown>;
    expect(value).toHaveProperty("workweekStartDay");
    expect(value).toHaveProperty("weeklyOTThresholdHours");
  });
});
