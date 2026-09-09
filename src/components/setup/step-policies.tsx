"use client";

import Link from "next/link";
import { ArrowUpRightIcon, ClockIcon, InfoIcon } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { humanizePolicyType } from "@/lib/format";
import type { CoverageReport, Necessity } from "@/lib/rule-coverage";
import { useTranslation } from "@/lib/i18n/i18n";

const NECESSITY_TONE: Record<Necessity, "danger" | "warning" | "muted"> = {
  essential: "danger",
  compliance: "warning",
  optional: "muted",
};

/**
 * The rule inventory: every policy type, whether this client has a published policy to reference,
 * and whether a rule group actually uses it.
 *
 * "Available" counts only PUBLISHED policies. A draft, or one awaiting approval, cannot be
 * referenced by a rule group — showing it as coverage would tell the user they are finished when
 * they are still one approval away.
 *
 * Authoring links out to the existing policy pages rather than embedding a form. Policy rules are
 * a different shape per type (the backend validates each against its own schema), so a generic
 * inline editor would either be wrong for most types or a second copy of the real one.
 */
export function StepPolicies({ coverage }: { coverage: CoverageReport }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>{t("setup.policies.makerCheckerNote")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-2 py-1.5 font-medium">{t("setup.policies.colType")}</th>
              <th className="px-2 py-1.5 font-medium">{t("setup.policies.colNeed")}</th>
              <th className="px-2 py-1.5 font-medium">{t("setup.policies.colAvailable")}</th>
              <th className="px-2 py-1.5 font-medium">{t("setup.policies.colInUse")}</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {coverage.types.map((row) => (
              <tr key={row.policyType} className="border-b last:border-0">
                <td className="px-2 py-2 font-medium">{humanizePolicyType(row.policyType)}</td>
                <td className="px-2 py-2">
                  <StatusBadge tone={NECESSITY_TONE[row.necessity]}>{t(`setup.necessity.${row.necessity}`)}</StatusBadge>
                </td>
                <td className="px-2 py-2 text-muted-foreground">
                  {row.available.length > 0 ? (
                    t("setup.policies.availableCount", { count: String(row.available.length) })
                  ) : (
                    <span className={row.necessity === "essential" ? "text-destructive" : undefined}>
                      {t("setup.policies.none")}
                    </span>
                  )}
                  {row.pending.length > 0 ? (
                    <span className="ms-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <ClockIcon className="size-3" />
                      {t("setup.policies.pendingCount", { count: String(row.pending.length) })}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  {row.inRuleGroup ? (
                    <StatusBadge tone="success">{t("setup.policies.inRuleGroup")}</StatusBadge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("setup.policies.notUsed")}</span>
                  )}
                </td>
                <td className="px-2 py-2 text-end">
                  <Link
                    href={`/policies?policyType=${row.policyType}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("setup.policies.view")}
                    <ArrowUpRightIcon className="size-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/policies/new"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          {t("setup.policies.authorNew")}
        </Link>
        <span className="text-xs text-muted-foreground">{t("setup.policies.authorHint")}</span>
      </div>
    </div>
  );
}
