import { POLICY_TYPES, type Policy, type PolicyType, type RuleGroup } from "./types";

/**
 * What "all the rules a client needs" actually means, grounded in what the engine does with each
 * policy type rather than in a wishlist.
 *
 * ESSENTIAL means payroll produces a wrong or empty answer without it:
 *  - RATE is what converts classified hours into money. With no RATE in the resolved set, every
 *    line still computes hours and then comes out at zero.
 *  - OVERTIME is the only processor that classifies hours into regular/OT/double-time buckets.
 *    Without it the engine falls back to treating the whole day as regular, which is right for a
 *    client with genuinely no overtime and wrong for everyone else — silently.
 *
 * COMPLIANCE means the rule exists to avoid a penalty rather than to compute base pay, so whether
 * it is needed depends on the jurisdiction. These are surfaced as recommendations against the
 * client's enabled states, never as blockers, because only the client knows their obligations.
 *
 * OPTIONAL means it changes pay only when the client has that arrangement at all (differentials,
 * paygroup overrides, shift constraints).
 */
export type Necessity = "essential" | "compliance" | "optional";

export const POLICY_NECESSITY: Record<PolicyType, Necessity> = {
  RATE: "essential",
  OVERTIME: "essential",
  MEAL_BREAK: "compliance",
  CA_MEAL_BREAK: "compliance",
  REST_BREAK: "compliance",
  SHIFT: "optional",
  SHIFT_DIFFERENTIAL: "optional",
  NIGHT_DIFFERENTIAL: "optional",
  PAY_DIFFERENTIAL: "optional",
  PAYGROUP: "optional",
};

/**
 * States whose break rules the platform ships a dedicated policy type for. CA_MEAL_BREAK exists
 * separately from MEAL_BREAK because California's premium/waiver rules genuinely differ, so a
 * client operating there needs the specific one rather than the generic.
 */
export const STATE_SPECIFIC_TYPES: Record<string, PolicyType[]> = {
  CA: ["CA_MEAL_BREAK", "REST_BREAK"],
};

export interface TypeCoverage {
  policyType: PolicyType;
  necessity: Necessity;
  /** Published policies this client could reference — global templates plus their own active ones. */
  available: Policy[];
  /** True when a published rule group already references this type. */
  inRuleGroup: boolean;
  /** This client's own drafts/submissions of this type, which are not usable until approved. */
  pending: Policy[];
}

export interface CoverageReport {
  types: TypeCoverage[];
  /** Essential types with nothing published to reference at all. */
  missingEssential: PolicyType[];
  /** Essential types that exist but no published rule group references them. */
  unusedEssential: PolicyType[];
  /** Break types recommended by the client's enabled states, not yet in any rule group. */
  recommendedForStates: { state: string; policyType: PolicyType }[];
}

/**
 * Builds the coverage picture from what the client can actually see.
 *
 * "Available" deliberately means published — a draft or a policy awaiting approval cannot be
 * referenced by a rule group, so counting it as coverage would tell the user they are done when
 * they are one approval away from being done.
 */
export function buildCoverage(
  policies: Policy[],
  ruleGroups: RuleGroup[],
  enabledStates: string[]
): CoverageReport {
  const activeGroups = ruleGroups.filter((g) => g.status === "active");
  const typesInGroups = new Set<PolicyType>(activeGroups.flatMap((g) => g.policyRefs.map((r) => r.policyType)));

  const types: TypeCoverage[] = POLICY_TYPES.map((policyType) => {
    const ofType = policies.filter((p) => p.policyType === policyType);
    return {
      policyType,
      necessity: POLICY_NECESSITY[policyType],
      available: ofType.filter((p) => p.status === "active"),
      pending: ofType.filter((p) => p.status === "draft" || p.status === "pending_approval"),
      inRuleGroup: typesInGroups.has(policyType),
    };
  });

  const byType = new Map(types.map((t) => [t.policyType, t]));

  const missingEssential = types
    .filter((t) => t.necessity === "essential" && t.available.length === 0)
    .map((t) => t.policyType);

  const unusedEssential = types
    .filter((t) => t.necessity === "essential" && t.available.length > 0 && !t.inRuleGroup)
    .map((t) => t.policyType);

  const recommendedForStates: { state: string; policyType: PolicyType }[] = [];
  for (const state of enabledStates) {
    for (const policyType of STATE_SPECIFIC_TYPES[state] ?? []) {
      if (!byType.get(policyType)?.inRuleGroup) recommendedForStates.push({ state, policyType });
    }
  }

  return { types, missingEssential, unusedEssential, recommendedForStates };
}
