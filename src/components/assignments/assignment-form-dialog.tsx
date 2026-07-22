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
import { NativeSelect } from "@/components/ui/native-select";
import { assignmentsApi, ruleGroupsApi, type CreateAssignmentBody } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { humanizeError } from "@/components/data-state";
import { toDateInput } from "@/lib/format";
import { ASSIGNMENT_TARGET_TYPES, type AssignmentTargetType, type RuleGroup } from "@/lib/types";

const TARGET_HELP: Record<AssignmentTargetType, string> = {
  EMPLOYEE: "Employee IDs, comma-separated (e.g. emp-1001, emp-1002)",
  PAYGROUP: "Paygroup IDs, comma-separated",
  LOCATION: "Location IDs, comma-separated",
  DEPARTMENT: "Department IDs, comma-separated",
  STATE: "Two-letter state codes, comma-separated (e.g. CA, TX)",
};

function AssignmentForm({ onDone }: { onDone: () => void }) {
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
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
      toast.success("Assignment created");
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      onDone();
    },
    onError: (error) => toast.error("Couldn't create assignment", { description: humanizeError(error) }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId) return toast.error("Select a client");
    if (!ruleGroupId) return toast.error("Select a rule group");
    if (!targetIdsText.trim()) return toast.error("Add at least one target ID");
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isPlatformAdmin ? (
        <div className="space-y-1.5">
          <Label htmlFor="aClient">Client</Label>
          <NativeSelect
            id="aClient"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setRuleGroupId("");
            }}
          >
            <option value="" disabled>
              Select a client…
            </option>
            {clients.data?.items.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="aRuleGroup">Rule group</Label>
        <NativeSelect id="aRuleGroup" value={ruleGroupId} onChange={(e) => setRuleGroupId(e.target.value)}>
          <option value="" disabled>
            {availableGroups.length ? "Select a rule group…" : "No active rule groups for this client"}
          </option>
          {availableGroups.map((rg) => (
            <option key={rg.ruleGroupId} value={rg.ruleGroupId}>
              {rg.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="aTargetType">Target type</Label>
          <NativeSelect id="aTargetType" value={targetType} onChange={(e) => setTargetType(e.target.value as AssignmentTargetType)}>
            {ASSIGNMENT_TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aPriority">Priority</Label>
          <Input id="aPriority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aTargets">Targets</Label>
        <Input id="aTargets" value={targetIdsText} onChange={(e) => setTargetIdsText(e.target.value)} placeholder="CA, TX" />
        <p className="text-xs text-muted-foreground">{TARGET_HELP[targetType]}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="aFrom">Effective from</Label>
          <Input id="aFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aTo">Effective to (optional)</Label>
          <Input id="aTo" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Create assignment
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AssignmentFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New assignment</DialogTitle>
          <DialogDescription>Bind a rule group to a population. Specificity (employee &gt; paygroup &gt; … &gt; state) resolves overlaps.</DialogDescription>
        </DialogHeader>
        {open ? <AssignmentForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
