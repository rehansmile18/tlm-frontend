"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { humanizeError } from "@/components/data-state";
import { assignmentStatusTone } from "@/lib/format";
import { assignmentsApi } from "@/lib/resources";
import type { Assignment, AssignmentTargetType, RuleGroup } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/i18n";

const TARGET_TYPES: AssignmentTargetType[] = ["STATE", "LOCATION", "PAYGROUP", "DEPARTMENT", "EMPLOYEE"];

/**
 * Points a published rule group at something. Until this exists the group applies to nobody, so a
 * client can have every policy in place and still resolve no rules at all.
 *
 * Targets are entered as free text because the ids they hold are external references owned by the
 * other side of the platform — a LOCATION target is a Site's own siteId, an EMPLOYEE target is the
 * HR system's employee id. This app has no view of either, and inventing a picker over data it
 * cannot see would be worse than an honest text field with the expected shape shown.
 */
export function StepAssignments({
  clientId,
  ruleGroups,
  assignments,
  enabledStates,
}: {
  clientId: string;
  ruleGroups: RuleGroup[];
  assignments: Assignment[];
  enabledStates: string[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);

  const publishedGroups = ruleGroups.filter((g) => g.status === "active");
  const [ruleGroupId, setRuleGroupId] = useState("");
  const [targetType, setTargetType] = useState<AssignmentTargetType>("STATE");
  const [targetIds, setTargetIds] = useState("");
  const [priority, setPriority] = useState("0");
  const [effectiveFrom, setEffectiveFrom] = useState(format(new Date(), "yyyy-MM-dd"));

  const mutation = useMutation({
    mutationFn: () =>
      assignmentsApi.create({
        clientId,
        ruleGroupId,
        targetType,
        // Comma or whitespace separated, since pasting a list is the common case.
        targetIds: targetIds
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        priority: Number(priority) || 0,
        effectiveFrom,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setAdding(false);
      setTargetIds("");
      toast.success(t("setup.assignments.created"));
    },
    onError: (error) => toast.error(t("setup.assignments.couldntCreate"), { description: humanizeError(error) }),
  });

  const groupName = (id: string) => publishedGroups.find((g) => g.ruleGroupId === id)?.name ?? id;
  const canSubmit = Boolean(ruleGroupId && targetIds.trim() && effectiveFrom);

  return (
    <div className="space-y-4">
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("setup.assignments.none")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {assignments.map((a) => (
            <li key={a._id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{groupName(a.ruleGroupId)}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {a.targetType} · {a.targetIds.join(", ")}
              </span>
              <StatusBadge tone={assignmentStatusTone(a.status)}>{a.status}</StatusBadge>
              <Link href={`/assignments/${a._id}`} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                {t("setup.assignments.open")}
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
              <Label htmlFor="asg-group">{t("setup.assignments.ruleGroup")}</Label>
              <Combobox id="asg-group" value={ruleGroupId} onValueChange={setRuleGroupId} disabled={publishedGroups.length === 0}>
                {publishedGroups.map((g) => (
                  <ComboboxItem key={g.ruleGroupId} value={g.ruleGroupId}>
                    {g.name}
                  </ComboboxItem>
                ))}
              </Combobox>
              {publishedGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("setup.assignments.needGroup")}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asg-type">{t("setup.assignments.targetType")}</Label>
              <Combobox id="asg-type" value={targetType} onValueChange={(v) => setTargetType(v as AssignmentTargetType)}>
                {TARGET_TYPES.map((tt) => (
                  <ComboboxItem key={tt} value={tt}>
                    {t(`setup.targetType.${tt}`)}
                  </ComboboxItem>
                ))}
              </Combobox>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="asg-targets">{t("setup.assignments.targets")}</Label>
              <Input
                id="asg-targets"
                value={targetIds}
                onChange={(e) => setTargetIds(e.target.value)}
                placeholder={
                  targetType === "STATE"
                    ? enabledStates.join(", ") || "CA, NV"
                    : t(`setup.assignments.placeholder.${targetType}`)
                }
              />
              <p className="text-xs text-muted-foreground">{t(`setup.assignments.hint.${targetType}`)}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asg-priority">{t("setup.assignments.priority")}</Label>
              <Input id="asg-priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("setup.assignments.priorityHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asg-eff">{t("setup.assignments.effectiveFrom")}</Label>
              <Input id="asg-eff" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {t("setup.assignments.create")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} disabled={publishedGroups.length === 0}>
          <PlusIcon className="size-4" />
          {t("setup.assignments.add")}
        </Button>
      )}
    </div>
  );
}
