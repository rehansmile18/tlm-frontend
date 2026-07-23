"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { policiesApi, ruleGroupsApi, type CreateRuleGroupBody, type UpdateRuleGroupBody } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/i18n";
import { humanizeError } from "@/components/data-state";
import { toDateInput } from "@/lib/format";
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
  const { t } = useTranslation();
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
      toast.success(isEdit ? t("ruleGroups.toastVersionCreated") : t("ruleGroups.toastCreated"));
      queryClient.invalidateQueries({ queryKey: ["rule-groups"] });
      queryClient.invalidateQueries({ queryKey: ["rule-group", saved.ruleGroupId] });
      onDone();
    },
    onError: (error) => toast.error(t("ruleGroups.couldntSave"), { description: humanizeError(error) }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return toast.error(t("common.nameRequired"));
    if (!clientId) return toast.error(t("common.selectClient"));
    if (!rows.some((r) => r.policyId)) return toast.error(t("ruleGroups.addAtLeastOnePolicy"));
    mutation.mutate();
  }

  function updateRow(index: number, patch: Partial<RefRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  // Row order IS the execution/application sequence — the backend stores and resolves policies
  // in exactly this array order, so moving a row here is how a client controls that sequence.
  function moveRow(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pe-1">
        {isEdit ? null : isPlatformAdmin ? (
          <div className="space-y-1.5">
            <Label htmlFor="rgClient">{t("ruleGroups.client")}</Label>
            <Combobox id="rgClient" value={clientId} onValueChange={setClientId} placeholder={t("ruleGroups.selectClient")}>
              {clients.data?.items.map((c) => (
                <ComboboxItem key={c._id} value={c._id}>
                  {c.name}
                </ComboboxItem>
              ))}
            </Combobox>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="rgName">{t("ruleGroups.name")}</Label>
          <Input id="rgName" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ruleGroups.namePlaceholder")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rgDesc">{t("common.description")}</Label>
          <Textarea id="rgDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rgEffective">{t("ruleGroups.effectiveFrom")}</Label>
          <Input id="rgEffective" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("ruleGroups.policiesInGroup")}</Label>
              <p className="text-xs text-muted-foreground">{t("ruleGroups.appliedInOrder")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, { policyId: "", policyType: "", pinMode: "latest", version: "" }])}
            >
              <PlusIcon className="size-3.5" />
              {t("ruleGroups.addPolicy")}
            </Button>
          </div>
          {policiesQuery.isLoading ? <p className="text-xs text-muted-foreground">{t("ruleGroups.loadingPolicies")}</p> : null}
          {!policiesQuery.isLoading && available.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("ruleGroups.noActivePolicies")}</p>
          ) : null}
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-lg border p-2.5 sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-2 sm:border-e sm:border-border sm:pe-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("ruleGroups.moveUp")}
                      disabled={index === 0}
                      onClick={() => moveRow(index, -1)}
                    >
                      <ArrowUpIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("ruleGroups.moveDown")}
                      disabled={index === rows.length - 1}
                      onClick={() => moveRow(index, 1)}
                    >
                      <ArrowDownIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <Combobox
                  aria-label={t("ruleGroups.colPolicy")}
                  wrapperClassName="min-w-0 sm:flex-1"
                  value={row.policyId}
                  placeholder={t("ruleGroups.selectPolicy")}
                  onValueChange={(value) => {
                    const selected = available.find((p) => p.policyId === value);
                    updateRow(index, { policyId: value, policyType: selected?.policyType ?? "" });
                  }}
                >
                  {available.map((p) => (
                    <ComboboxItem key={p.policyId} value={p.policyId}>
                      {p.name} · {t(`policyTypes.${p.policyType}`)} {p.scope === "global" ? "(global)" : ""}
                    </ComboboxItem>
                  ))}
                </Combobox>
                <Combobox
                  aria-label={t("ruleGroups.colVersionPin")}
                  wrapperClassName="shrink-0 sm:w-32"
                  value={row.pinMode}
                  onValueChange={(value) => updateRow(index, { pinMode: value as RefRow["pinMode"] })}
                >
                  <ComboboxItem value="latest">{t("ruleGroups.latest")}</ComboboxItem>
                  <ComboboxItem value="specific">{t("ruleGroups.pinVersion")}</ComboboxItem>
                </Combobox>
                <div className="flex shrink-0 items-center gap-2">
                  {row.pinMode === "specific" ? (
                    <Input
                      aria-label={t("ruleGroups.versionNumber")}
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
                    aria-label={t("ruleGroups.removePolicy")}
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
          {isEdit ? t("ruleGroups.saveNewVersion") : t("ruleGroups.createRuleGroup")}
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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ruleGroup ? t("ruleGroups.editDialogTitle") : t("ruleGroups.newDialogTitle")}</DialogTitle>
          <DialogDescription>{t("ruleGroups.dialogDescription")}</DialogDescription>
        </DialogHeader>
        {open ? <RuleGroupForm key={ruleGroup?._id ?? "new"} ruleGroup={ruleGroup} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
