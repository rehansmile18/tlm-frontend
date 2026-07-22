"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { policiesApi, ruleGroupsApi, type CreateRuleGroupBody, type UpdateRuleGroupBody } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { humanizeError } from "@/components/data-state";
import { humanizePolicyType, toDateInput } from "@/lib/format";
import type { PolicyRef, RuleGroup } from "@/lib/types";

interface RefRow {
  policyId: string;
  policyType: PolicyRef["policyType"] | "";
  pinMode: "latest" | "specific";
  version: string;
}

function toRefRows(refs: PolicyRef[]): RefRow[] {
  return refs.map((ref) => ({
    policyId: ref.policyId,
    policyType: ref.policyType,
    pinMode: ref.versionPin === "latest" ? "latest" : "specific",
    version: ref.versionPin === "latest" ? "" : String(ref.versionPin),
  }));
}

function RuleGroupForm({ ruleGroup, onDone }: { ruleGroup?: RuleGroup; onDone: () => void }) {
  const isEdit = Boolean(ruleGroup);
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
  const clients = useClients();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState(ruleGroup?.clientId ?? ownClientId ?? "");
  const [name, setName] = useState(ruleGroup?.name ?? "");
  const [description, setDescription] = useState(ruleGroup?.description ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(toDateInput(ruleGroup?.effectiveFrom) || toDateInput(new Date().toISOString()));
  const [rows, setRows] = useState<RefRow[]>(ruleGroup ? toRefRows(ruleGroup.policyRefs) : [{ policyId: "", policyType: "", pinMode: "latest", version: "" }]);

  // Active policies available for this rule group: global + the selected client's own.
  const policiesQuery = useQuery({
    queryKey: queryKeys.policies({ status: "active", pageSize: 200, for: "rulegroup" }),
    queryFn: () => policiesApi.list({ status: "active", pageSize: 200 }),
  });
  const available = (policiesQuery.data?.items ?? []).filter((p) => p.scope === "global" || p.clientId === clientId);

  const mutation = useMutation({
    mutationFn: async () => {
      const policyRefs: PolicyRef[] = rows
        .filter((r) => r.policyId && r.policyType)
        .map((r) => ({
          policyId: r.policyId,
          policyType: r.policyType as PolicyRef["policyType"],
          versionPin: r.pinMode === "latest" ? "latest" : Math.max(1, Number(r.version) || 1),
        }));
      if (isEdit && ruleGroup) {
        const body: UpdateRuleGroupBody = { name, description: description || undefined, effectiveFrom, policyRefs };
        return ruleGroupsApi.update(ruleGroup.ruleGroupId, body);
      }
      const body: CreateRuleGroupBody = { clientId, name, description: description || undefined, effectiveFrom, policyRefs };
      return ruleGroupsApi.create(body);
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? "New rule group version created" : "Rule group created");
      queryClient.invalidateQueries({ queryKey: ["rule-groups"] });
      queryClient.invalidateQueries({ queryKey: ["rule-group", saved.ruleGroupId] });
      onDone();
    },
    onError: (error) => toast.error("Couldn't save rule group", { description: humanizeError(error) }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!clientId) return toast.error("Select a client");
    if (!rows.some((r) => r.policyId)) return toast.error("Add at least one policy");
    mutation.mutate();
  }

  function updateRow(index: number, patch: Partial<RefRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {isEdit ? null : isPlatformAdmin ? (
          <div className="space-y-1.5">
            <Label htmlFor="rgClient">Client</Label>
            <NativeSelect id="rgClient" value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
          <Label htmlFor="rgName">Name</Label>
          <Input id="rgName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CA Hourly Standard" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rgDesc">Description</Label>
          <Textarea id="rgDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rgEffective">Effective from</Label>
          <Input id="rgEffective" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Policies in this group</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { policyId: "", policyType: "", pinMode: "latest", version: "" }])}
            >
              <PlusIcon className="size-3.5" />
              Add policy
            </Button>
          </div>
          {policiesQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading policies…</p> : null}
          {!policiesQuery.isLoading && available.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active policies available. Publish a policy first.</p>
          ) : null}
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_auto_auto]">
                <NativeSelect
                  aria-label="Policy"
                  value={row.policyId}
                  onChange={(e) => {
                    const selected = available.find((p) => p.policyId === e.target.value);
                    updateRow(index, { policyId: e.target.value, policyType: selected?.policyType ?? "" });
                  }}
                >
                  <option value="" disabled>
                    Select a policy…
                  </option>
                  {available.map((p) => (
                    <option key={p.policyId} value={p.policyId}>
                      {p.name} · {humanizePolicyType(p.policyType)} {p.scope === "global" ? "(global)" : ""}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Version pin"
                  className="w-32"
                  value={row.pinMode}
                  onChange={(e) => updateRow(index, { pinMode: e.target.value as RefRow["pinMode"] })}
                >
                  <option value="latest">Latest</option>
                  <option value="specific">Pin version</option>
                </NativeSelect>
                <div className="flex items-center gap-2">
                  {row.pinMode === "specific" ? (
                    <Input
                      aria-label="Version number"
                      type="number"
                      min={1}
                      className="w-20"
                      value={row.version}
                      onChange={(e) => updateRow(index, { version: e.target.value })}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove policy"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {isEdit ? "Save new version" : "Create rule group"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RuleGroupFormDialog({
  open,
  onOpenChange,
  ruleGroup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleGroup?: RuleGroup;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{ruleGroup ? "Edit rule group (new version)" : "New rule group"}</DialogTitle>
          <DialogDescription>
            Bundle active policies into a named set. Pin a version to freeze it, or track the latest active version.
          </DialogDescription>
        </DialogHeader>
        {open ? <RuleGroupForm key={ruleGroup?._id ?? "new"} ruleGroup={ruleGroup} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
