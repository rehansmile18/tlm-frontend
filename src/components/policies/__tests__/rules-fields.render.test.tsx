import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RulesFields } from "../rules-fields";
import type { JsonSchema } from "@/lib/types";

const schema: JsonSchema = {
  type: "object",
  required: ["rateType"],
  properties: {
    rateType: { type: "string", enum: ["hourly", "salary"] },
    minimumWage: { type: "number" },
    paidMeal: { type: "boolean" },
  },
};

describe("<RulesFields />", () => {
  it("renders one labeled field per schema property", () => {
    render(<RulesFields schema={schema} value={{}} onChange={() => {}} />);
    expect(screen.getByText("Rate Type")).toBeInTheDocument();
    expect(screen.getByText("Minimum Wage")).toBeInTheDocument();
    expect(screen.getByText("Paid Meal")).toBeInTheDocument();
  });
});
