import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RulesFields } from "../rules-fields";
import { I18nProvider } from "@/lib/i18n/i18n";
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
  it("renders one labeled field per schema property, using the translated field labels", () => {
    render(
      <I18nProvider>
        <RulesFields schema={schema} value={{}} onChange={() => {}} />
      </I18nProvider>
    );
    // These come from the en.ts ruleFields dictionary (see lib/i18n/locales/en.ts), not a
    // mechanical humanization of the raw schema key.
    expect(screen.getByText("Rate type")).toBeInTheDocument();
    expect(screen.getByText("Minimum wage")).toBeInTheDocument();
    expect(screen.getByText("Paid meal")).toBeInTheDocument();
  });
});
