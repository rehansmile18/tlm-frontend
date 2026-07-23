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
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { RulesFields, collectRuleErrors, defaultForSchema, sanitizeRules } from "./rules-fields";
import { policiesApi, type CreatePolicyBody, type UpdatePolicyBody } from "@/lib/resources";
import { useRole } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/i18n";
import { humanizeError } from "@/components/data-state";
import { toDateInput } from "@/lib/format";
import { POLICY_TYPES, type Policy, type PolicyScope, type PolicyType, type PolicyTypeSchema } from "@/lib/types";
import { useClients, useCountries, useStatesForCountry } from "@/lib/hooks";

type RulesValue = Record<string, unknown>;

function schemaFor(policyTypes: PolicyTypeSchema[], type: PolicyType) {
  return policyTypes.find((pt) => pt.policyType === type)?.rulesSchema ?? { type: "object", properties: {} };
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
  const { t } = useTranslation();
  const clients = useClients();
  const countries = useCountries();
  const queryClient = useQueryClient();

  const [policyType, setPolicyType] = useState<PolicyType>(policy?.policyType ?? "OVERTIME");
  const [scope, setScope] = useState<PolicyScope>(policy?.scope ?? (isPlatformAdmin ? "global" : "client"));
  const [clientId, setClientId] = useState<string>(policy?.clientId ?? ownClientId ?? "");
  const [name, setName] = useState(policy?.name ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  // A new version (edit) must take effect strictly after the current one, so default to today
  // rather than echoing the existing effective date (which the backend would reject as backdated).
  const [effectiveFrom, setEffectiveFrom] = useState(toDateInput(new Date().toISOString()));
  const [country, setCountry] = useState(policy?.jurisdiction?.country ?? "US");
  const [stateCode, setStateCode] = useState(policy?.jurisdiction?.state ?? "");
  const [rules, setRules] = useState<RulesValue>(
    () => policy?.rules ?? (defaultForSchema(schemaFor(policyTypes, policy?.policyType ?? "OVERTIME")) as RulesValue)
  );

  const states = useStatesForCountry(country || null);
  // Switching country invalidates any previously-picked state from the old country (same
  // adjust-during-render pattern as the client form — avoids an extra render vs. an effect).
  const [stateResetForCountry, setStateResetForCountry] = useState(country);
  if (country !== stateResetForCountry) {
    setStateResetForCountry(country);
    setStateCode("");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanRules = sanitizeRules(schemaFor(policyTypes, policyType), rules);
      if (isEdit && policy) {
        const body: UpdatePolicyBody = {
          name,
          description: description || undefined,
          effectiveFrom,
          jurisdiction: { country, state: stateCode || null },
          rules: cleanRules,
        };
        return policiesApi.update(policy.policyId, body);
      }
      const body: CreatePolicyBody = {
        scope,
        clientId: scope === "client" ? clientId : undefined,
        policyType,
        jurisdiction: { country, state: stateCode || null },
        name,
        description: description || undefined,
        effectiveFrom,
        rules: cleanRules,
      };
      return policiesApi.create(body);
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? t("policies.toastVersionCreated") : t("policies.toastPolicyCreated"));
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", saved.policyId] });
      queryClient.invalidateQueries({ queryKey: ["policy-versions", saved.policyId] });
      onDone();
    },
    onError: (error) =>
      toast.error(isEdit ? t("policies.couldntSaveVersion") : t("policies.couldntCreatePolicy"), { description: humanizeError(error) }),
  });

  const activeSchema = schemaFor(policyTypes, policyType);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return toast.error(t("common.nameRequired"));
    if (!effectiveFrom) return toast.error(t("common.effectiveFromRequired"));
    if (scope === "client" && !clientId) return toast.error(t("common.selectClient"));
    const ruleErrors = collectRuleErrors(activeSchema, sanitizeRules(activeSchema, rules));
    if (ruleErrors.length > 0) {
      return toast.error(t("common.missingRequiredFields"), { description: ruleErrors.slice(0, 4).join(", ") });
    }
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pe-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="policyType">{t("policies.policyType")}</Label>
            {isEdit ? (
              <Input id="policyType" value={t(`policyTypes.${policyType}`)} disabled />
            ) : (
              <Combobox
                id="policyType"
                value={policyType}
                onValueChange={(value) => {
                  const next = value as PolicyType;
                  setPolicyType(next);
                  setRules(defaultForSchema(schemaFor(policyTypes, next)) as RulesValue);
                }}
              >
                {POLICY_TYPES.map((pt) => (
                  <ComboboxItem key={pt} value={pt}>
                    {t(`policyTypes.${pt}`)}
                  </ComboboxItem>
                ))}
              </Combobox>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scope">{t("policies.scope")}</Label>
            {isEdit || !isPlatformAdmin ? (
              <Input id="scope" value={scope === "global" ? t("policies.globalStatutory") : t("policies.clientSpecific")} disabled />
            ) : (
              <Combobox id="scope" value={scope} onValueChange={(v) => setScope(v as PolicyScope)}>
                <ComboboxItem value="global">{t("policies.globalStatutory")}</ComboboxItem>
                <ComboboxItem value="client">{t("policies.clientSpecific")}</ComboboxItem>
              </Combobox>
            )}
          </div>
        </div>

        {scope === "client" && !isEdit && isPlatformAdmin ? (
          <div className="space-y-1.5">
            <Label htmlFor="clientId">{t("clients.title")}</Label>
            <Combobox id="clientId" value={clientId} onValueChange={setClientId} placeholder={t("policies.selectClient")}>
              {clients.data?.items.map((c) => (
                <ComboboxItem key={c._id} value={c._id}>
                  {c.name}
                </ComboboxItem>
              ))}
            </Combobox>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="name">{t("common.name")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Federal FLSA Overtime" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">{t("common.description")}</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="effectiveFrom">{t("common.effectiveFrom")}</Label>
          <Input id="effectiveFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          {isEdit ? <p className="text-xs text-muted-foreground">{t("policies.mustBeAfterCurrent")}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="country">{t("clients.country")}</Label>
            <Combobox id="country" value={country} onValueChange={setCountry}>
              {countries.data?.items.map((c) => (
                <ComboboxItem key={c.isoCode} value={c.isoCode}>
                  {c.name}
                </ComboboxItem>
              ))}
            </Combobox>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">{t("policies.jurisdiction")}</Label>
            <Combobox id="state" value={stateCode ?? ""} onValueChange={setStateCode} disabled={states.isLoading}>
              <ComboboxItem value="">{t("policies.federal")}</ComboboxItem>
              {(states.data?.items ?? []).map((s) => (
                <ComboboxItem key={s.isoCode} value={s.isoCode}>
                  {s.name} ({s.isoCode})
                </ComboboxItem>
              ))}
            </Combobox>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-medium">{t("policies.rulesSectionTitle")}</p>
          <RulesFields schema={activeSchema} value={rules} onChange={setRules} />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {isEdit ? t("ruleGroups.saveNewVersion") : t("policies.newPolicy")}
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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{policy ? t("policies.editPolicyTitle") : t("policies.newPolicyTitle")}</DialogTitle>
          <DialogDescription>{policy ? t("policies.editDescription") : t("policies.newDescription")}</DialogDescription>
        </DialogHeader>
        {open ? <PolicyForm key={policy?._id ?? "new"} policy={policy} policyTypes={policyTypes} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
