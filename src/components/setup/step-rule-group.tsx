"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { humanizeError } from "@/components/data-state";
import { humanizePolicyType, ruleGroupStatusTone } from "@/lib/format";
import { ruleGroupsApi } from "@/lib/resources";
import type { PolicyRef, RuleGroup } from "@/lib/types";
import type { CoverageReport } from "@/lib/rule-coverage";
import { useTranslation } from "@/lib/i18n/i18n";

/**
 * Bundles published policies into a rule group and publishes it in one action.
 *
 * Create-then-publish is deliberately not two steps here: a draft rule group resolves to nothing
 * at all, so leaving it unpublished produces a client who has apparently configured their rules
 * and still gets no rules applied. Unlike policies, rule groups have no maker-checker, so this is
 * something one admin can genuinely finish.
 */
export function StepRuleGroup({
  clientId,
  coverage,
  ruleGroups,
}: {
  clientId: string;
  coverage: CoverageReport;
  ruleGroups: RuleGroup[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selected, setSelected] = useState<string[]>([]);

  // Only published policies can be referenced, so only those are offered.
  const selectable = coverage.types.flatMap((tc) => tc.available.map((p) => ({ policy: p, necessity: tc.necessity })));
  const chosen = selectable.filter((s) => selected.includes(s.policy.policyId));
  const missingEssential = coverage.types
    .filter((tc) => tc.necessity === "essential" && !chosen.some((c) => c.policy.policyType === tc.policyType))
    .map((tc) => tc.policyType);

  const mutation = useMutation({
    mutationFn: async () => {
      const policyRefs: PolicyRef[] = chosen.map((c) => ({
        policyId: c.policy.policyId,
        policyType: c.policy.policyType,
        versionPin: "latest",
      }));
      const group = await ruleGroupsApi.create({ clientId, name: name.trim(), effectiveFrom, policyRefs });
      await ruleGroupsApi.publish(group.ruleGroupId);
      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rule-groups"] });
      setAdding(false);
      setName("");
      setSelected([]);
      toast.success(t("setup.ruleGroup.created"));
    },
    onError: (error) => toast.error(t("setup.ruleGroup.couldntCreate"), { description: humanizeError(error) }),
  });

  return (
    <div className="space-y-4">
      {ruleGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("setup.ruleGroup.none")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {ruleGroups.map((group) => (
            <li key={group._id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("setup.ruleGroup.policyCount", { count: String(group.policyRefs.length) })}
              </span>
              <StatusBadge tone={ruleGroupStatusTone(group.status)}>{group.status}</StatusBadge>
              <Link href={`/rule-groups/${group.ruleGroupId}`} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                {t("setup.ruleGroup.open")}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4 rounded-lg border p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rg-name">{t("setup.ruleGroup.name")}</Label>
              <Input id="rg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("setup.ruleGroup.namePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rg-eff">{t("setup.ruleGroup.effectiveFrom")}</Label>
              <Input id="rg-eff" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("setup.ruleGroup.pick")}</Label>
            {selectable.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("setup.ruleGroup.nothingPublished")}</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                {selectable.map(({ policy, necessity }) => (
                  <label key={policy.policyId} className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 rounded border-input accent-primary"
                      checked={selected.includes(policy.policyId)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(policy.policyId) ? prev.filter((p) => p !== policy.policyId) : [...prev, policy.policyId]
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{policy.name}</span>
                      <span className="ms-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                        {policy.policyType}
                      </span>
                      {policy.scope === "global" ? (
                        <span className="ms-1.5 text-xs text-muted-foreground">{t("setup.ruleGroup.template")}</span>
                      ) : null}
                      {necessity === "essential" ? (
                        <span className="ms-1.5 text-xs text-muted-foreground">{t("setup.necessity.essential")}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selected.length > 0 && missingEssential.length > 0 ? (
              // Named rather than blocked: a client with genuinely no overtime obligation is
              // entitled to omit it, but doing so by accident produces zero-value pay lines.
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t("setup.ruleGroup.missingEssential", {
                  types: missingEssential.map(humanizePolicyType).join(", "),
                })}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending || !name.trim() || selected.length === 0}>
              {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {t("setup.ruleGroup.create")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button type="button" variant="outline" onClick={() => setAdding(true)}>
            <PlusIcon className="size-4" />
            {t("setup.ruleGroup.add")}
          </Button>
          {coverage.types.some((tc) => tc.inRuleGroup) ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckIcon className="size-3.5" />
              {t("setup.ruleGroup.coveredHint")}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
