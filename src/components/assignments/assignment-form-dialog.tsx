"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { assignmentsApi, ruleGroupsApi, type CreateAssignmentBody } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { useTranslation, type TranslationKey } from "@/lib/i18n/i18n";
import { humanizeError } from "@/components/data-state";
import { toDateInput } from "@/lib/format";
import { ASSIGNMENT_TARGET_TYPES, type AssignmentTargetType, type RuleGroup } from "@/lib/types";

const TARGET_HELP_KEY: Record<AssignmentTargetType, TranslationKey> = {
  EMPLOYEE: "assignments.targetHelpEmployee",
  PAYGROUP: "assignments.targetHelpPaygroup",
  LOCATION: "assignments.targetHelpLocation",
  DEPARTMENT: "assignments.targetHelpDepartment",
  STATE: "assignments.targetHelpState",
};

function AssignmentForm({ onDone }: { onDone: () => void }) {
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
  const { t } = useTranslation();
  const clients = useClients();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState(ownClientId ?? "");
  const [ruleGroupId, setRuleGroupId] = useState("");
  const [targetType, setTargetType] = useState<AssignmentTargetType>("STATE");
  const [targetIdsText, setTargetIdsText] = useState("");
  const [priority, setPriority] = useState("0");
  const [effectiveFrom, setEffectiveFrom] = useState(toDateInput(new Date().toISOString()));
  const [effectiveTo, setEffectiveTo] = useState("");

  const ruleGroupsQuery = useQuery({
    queryKey: queryKeys.ruleGroups({ status: "active", pageSize: 200, for: "assignment" }),
    queryFn: () => ruleGroupsApi.list({ status: "active", pageSize: 200 }),
  });

  const availableGroups = useMemo(() => {
    const byId = new Map<string, RuleGroup>();
    for (const rg of ruleGroupsQuery.data?.items ?? []) {
      if (clientId && rg.clientId !== clientId) continue;
      const existing = byId.get(rg.ruleGroupId);
      if (!existing || rg.version > existing.version) byId.set(rg.ruleGroupId, rg);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [ruleGroupsQuery.data, clientId]);

  const mutation = useMutation({
    mutationFn: () => {
      const targetIds = targetIdsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const body: CreateAssignmentBody = {
        clientId,
        ruleGroupId,
        targetType,
        targetIds: targetType === "STATE" ? targetIds.map((s) => s.toUpperCase()) : targetIds,
        priority: Number(priority) || 0,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
      };
      return assignmentsApi.create(body);
    },
    onSuccess: () => {
      toast.success(t("assignments.toastCreated"));
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      onDone();
    },
    onError: (error) => toast.error(t("assignments.couldntCreate"), { description: humanizeError(error) }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId) return toast.error(t("common.selectClient"));
    if (!ruleGroupId) return toast.error(t("assignments.selectRuleGroup"));
    if (!targetIdsText.trim()) return toast.error(t("assignments.addAtLeastOneTargetId"));
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isPlatformAdmin ? (
        <div className="space-y-1.5">
          <Label htmlFor="aClient">{t("assignments.client")}</Label>
          <Combobox
            id="aClient"
            value={clientId}
            placeholder={t("assignments.selectClient")}
            onValueChange={(value) => {
              setClientId(value);
              setRuleGroupId("");
            }}
          >
            {clients.data?.items.map((c) => (
              <ComboboxItem key={c._id} value={c._id}>
                {c.name}
              </ComboboxItem>
            ))}
          </Combobox>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="aRuleGroup">{t("assignments.ruleGroup")}</Label>
        <Combobox
          id="aRuleGroup"
          value={ruleGroupId}
          onValueChange={setRuleGroupId}
          placeholder={availableGroups.length ? t("assignments.selectRuleGroup") : t("assignments.noActiveRuleGroups")}
        >
          {availableGroups.map((rg) => (
            <ComboboxItem key={rg.ruleGroupId} value={rg.ruleGroupId}>
              {rg.name}
            </ComboboxItem>
          ))}
        </Combobox>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="aTargetType">{t("assignments.targetType")}</Label>
          <Combobox id="aTargetType" value={targetType} onValueChange={(v) => setTargetType(v as AssignmentTargetType)}>
            {ASSIGNMENT_TARGET_TYPES.map((tt) => (
              <ComboboxItem key={tt} value={tt}>
                {t(`targetTypes.${tt}`)}
              </ComboboxItem>
            ))}
          </Combobox>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aPriority">{t("assignments.priority")}</Label>
          <Input id="aPriority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aTargets">{t("assignments.targets")}</Label>
        <Input id="aTargets" value={targetIdsText} onChange={(e) => setTargetIdsText(e.target.value)} placeholder={t("assignments.targetsPlaceholder")} />
        <p className="text-xs text-muted-foreground">{t(TARGET_HELP_KEY[targetType])}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="aFrom">{t("assignments.effectiveFrom")}</Label>
          <Input id="aFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aTo">{t("assignments.effectiveTo")}</Label>
          <Input id="aTo" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("assignments.createAssignment")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AssignmentFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("assignments.newDialogTitle")}</DialogTitle>
          <DialogDescription>{t("assignments.newDialogDescription")}</DialogDescription>
        </DialogHeader>
        {open ? <AssignmentForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
