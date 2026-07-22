"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { RulesFields, defaultForSchema } from "./rules-fields";
import { policiesApi, type CreatePolicyBody, type UpdatePolicyBody } from "@/lib/resources";
import { useRole } from "@/lib/auth";
import { humanizeError } from "@/components/data-state";
import { humanizePolicyType, toDateInput, US_STATES } from "@/lib/format";
import { POLICY_TYPES, type Policy, type PolicyScope, type PolicyType, type PolicyTypeSchema } from "@/lib/types";
import { useClients } from "@/lib/hooks";

type RulesValue = Record<string, unknown>;

function schemaFor(policyTypes: PolicyTypeSchema[], type: PolicyType) {
  return policyTypes.find((t) => t.policyType === type)?.rulesSchema ?? { type: "object", properties: {} };
}

function PolicyForm({
  policy,
  policyTypes,
  onDone,
}: {
  policy?: Policy;
  policyTypes: PolicyTypeSchema[];
  onDone: () => void;
}) {
  const isEdit = Boolean(policy);
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
  const clients = useClients();
  const queryClient = useQueryClient();

  const [policyType, setPolicyType] = useState<PolicyType>(policy?.policyType ?? "OVERTIME");
  const [scope, setScope] = useState<PolicyScope>(policy?.scope ?? (isPlatformAdmin ? "global" : "client"));
  const [clientId, setClientId] = useState<string>(policy?.clientId ?? ownClientId ?? "");
  const [name, setName] = useState(policy?.name ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(toDateInput(policy?.effectiveFrom) || toDateInput(new Date().toISOString()));
  const [stateCode, setStateCode] = useState(policy?.jurisdiction?.state ?? "");
  const [rules, setRules] = useState<RulesValue>(
    () => policy?.rules ?? (defaultForSchema(schemaFor(policyTypes, policy?.policyType ?? "OVERTIME")) as RulesValue)
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && policy) {
        const body: UpdatePolicyBody = {
          name,
          description: description || undefined,
          effectiveFrom,
          jurisdiction: { country: "US", state: stateCode || null },
          rules,
        };
        return policiesApi.update(policy.policyId, body);
      }
      const body: CreatePolicyBody = {
        scope,
        clientId: scope === "client" ? clientId : undefined,
        policyType,
        jurisdiction: { country: "US", state: stateCode || null },
        name,
        description: description || undefined,
        effectiveFrom,
        rules,
      };
      return policiesApi.create(body);
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? "New version created" : "Policy created");
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", saved.policyId] });
      queryClient.invalidateQueries({ queryKey: ["policy-versions", saved.policyId] });
      onDone();
    },
    onError: (error) => toast.error(isEdit ? "Couldn't save version" : "Couldn't create policy", { description: humanizeError(error) }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!effectiveFrom) return toast.error("Effective-from date is required");
    if (scope === "client" && !clientId) return toast.error("Select a client");
    mutation.mutate();
  }

  const activeSchema = schemaFor(policyTypes, policyType);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="policyType">Policy type</Label>
            {isEdit ? (
              <Input id="policyType" value={humanizePolicyType(policyType)} disabled />
            ) : (
              <NativeSelect
                id="policyType"
                value={policyType}
                onChange={(e) => {
                  const next = e.target.value as PolicyType;
                  setPolicyType(next);
                  setRules(defaultForSchema(schemaFor(policyTypes, next)) as RulesValue);
                }}
              >
                {POLICY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {humanizePolicyType(t)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scope">Scope</Label>
            {isEdit || !isPlatformAdmin ? (
              <Input id="scope" value={scope === "global" ? "Global (statutory)" : "Client-specific"} disabled />
            ) : (
              <NativeSelect id="scope" value={scope} onChange={(e) => setScope(e.target.value as PolicyScope)}>
                <option value="global">Global (statutory)</option>
                <option value="client">Client-specific</option>
              </NativeSelect>
            )}
          </div>
        </div>

        {scope === "client" && !isEdit && isPlatformAdmin ? (
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client</Label>
            <NativeSelect id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Federal FLSA Overtime" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="effectiveFrom">Effective from</Label>
            <Input id="effectiveFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">Jurisdiction (state)</Label>
            <NativeSelect id="state" value={stateCode ?? ""} onChange={(e) => setStateCode(e.target.value)}>
              <option value="">Federal / not state-specific</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-medium">Rules</p>
          <RulesFields schema={activeSchema} value={rules} onChange={setRules} />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {isEdit ? "Save new version" : "Create policy"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PolicyFormDialog({
  open,
  onOpenChange,
  policy,
  policyTypes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: Policy;
  policyTypes: PolicyTypeSchema[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit policy (new version)" : "New policy"}</DialogTitle>
          <DialogDescription>
            {policy
              ? "Editing creates a new immutable version with its own effective date."
              : "Create a draft policy. Global policies go through maker-checker approval; client policies you can publish directly."}
          </DialogDescription>
        </DialogHeader>
        {open ? <PolicyForm key={policy?._id ?? "new"} policy={policy} policyTypes={policyTypes} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
