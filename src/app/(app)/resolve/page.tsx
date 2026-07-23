"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangleIcon, Loader2Icon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status-badge";
import { RulesView } from "@/components/policies/rules-view";
import { assignmentsApi, type ResolveParams } from "@/lib/resources";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";
import { ApiError } from "@/lib/api";
import { toDateInput, US_STATES } from "@/lib/format";

export default function ResolvePage() {
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
  const { formatDate } = useDateFormat();
  const { t } = useTranslation();
  const clients = useClients();

  const [clientId, setClientId] = useState(ownClientId ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [state, setState] = useState("");
  const [paygroupId, setPaygroupId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const resolve = useMutation({
    mutationFn: () => {
      const params: ResolveParams = {
        clientId,
        employeeId,
        date,
        state: state || undefined,
        paygroupId: paygroupId || undefined,
        locationId: locationId || undefined,
        departmentId: departmentId || undefined,
      };
      return assignmentsApi.resolve(params);
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    resolve.mutate();
  }

  const notFound = resolve.error instanceof ApiError && resolve.error.status === 404;
  const result = resolve.data;

  return (
    <>
      <PageHeader title={t("resolve.title")} description={t("resolve.description")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("resolve.queryTitle")}</CardTitle>
          <CardDescription>{t("resolve.queryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isPlatformAdmin ? (
              <div className="space-y-1.5">
                <Label htmlFor="rClient">{t("resolve.client")}</Label>
                <Combobox id="rClient" value={clientId} onValueChange={setClientId} placeholder={t("resolve.selectClient")}>
                  {clients.data?.items.map((c) => (
                    <ComboboxItem key={c._id} value={c._id}>
                      {c.name}
                    </ComboboxItem>
                  ))}
                </Combobox>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="rEmployee">{t("resolve.employeeId")}</Label>
              <Input id="rEmployee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="emp-1001" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rDate">{t("resolve.date")}</Label>
              <Input id="rDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rState">{t("resolve.state")}</Label>
              <Combobox id="rState" value={state} onValueChange={setState}>
                <ComboboxItem value="">{t("resolve.noneOption")}</ComboboxItem>
                {US_STATES.map((s) => (
                  <ComboboxItem key={s.code} value={s.code}>
                    {s.code}
                  </ComboboxItem>
                ))}
              </Combobox>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rPaygroup">{t("resolve.paygroupId")}</Label>
              <Input id="rPaygroup" value={paygroupId} onChange={(e) => setPaygroupId(e.target.value)} placeholder={t("common.optional")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rLocation">{t("resolve.locationId")}</Label>
              <Input id="rLocation" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder={t("common.optional")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rDepartment">{t("resolve.departmentId")}</Label>
              <Input id="rDepartment" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} placeholder={t("common.optional")} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={resolve.isPending || !clientId || !employeeId}>
                {resolve.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                {t("resolve.resolveButton")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {notFound ? (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>{t("resolve.noneResolves")}</AlertTitle>
          <AlertDescription>{t("resolve.noneResolvesDescription")}</AlertDescription>
        </Alert>
      ) : resolve.isError ? (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>{t("resolve.couldntResolve")}</AlertTitle>
          <AlertDescription>{resolve.error instanceof ApiError ? resolve.error.message : t("common.somethingWentWrong")}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheckIcon className="size-4 text-primary" />
                {t("resolve.resolvedPrefix")} {result.ruleGroup.name}
              </CardTitle>
              <CardDescription>
                {t("resolve.matchedVia")} {t(`targetTypes.${result.assignment.targetType}`)} ({result.assignment.targetIds.join(", ")}) ·{" "}
                {t("resolve.priority")} {result.assignment.priority} · {result.consideredAssignments}{" "}
                {result.consideredAssignments === 1 ? t("resolve.candidatesConsidered") : t("resolve.candidatesConsideredPlural")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/rule-groups/${result.ruleGroup.ruleGroupId}`} className="text-primary hover:underline">
                {t("ruleGroups.title")} v{result.ruleGroup.version}
              </Link>
              <span className="text-muted-foreground">
                · {t("common.effectiveFrom").toLowerCase()} {formatDate(result.ruleGroup.effectiveFrom)}
              </span>
            </CardContent>
          </Card>

          {result.unresolvedRefs.length > 0 ? (
            <Alert>
              <AlertTriangleIcon />
              <AlertTitle>{t("resolve.incompleteRuleSet")}</AlertTitle>
              <AlertDescription>
                {t("resolve.unresolvedDescription", {
                  count: result.unresolvedRefs.length,
                  list: result.unresolvedRefs.map((r) => t(`policyTypes.${r.policyType}`)).join(", "),
                })}
              </AlertDescription>
            </Alert>
          ) : null}

          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              {t("resolve.effectivePolicies")} ({result.policies.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {result.policies.map((policy) => (
                <Card key={policy._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{policy.name}</CardTitle>
                      <StatusBadge tone="muted">v{policy.version}</StatusBadge>
                    </div>
                    <CardDescription>
                      {t(`policyTypes.${policy.policyType}`)} · {policy.scope === "global" ? t("policies.global") : t("policies.client")}
                      {policy.jurisdiction?.state ? ` · ${policy.jurisdiction.state}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RulesView value={policy.rules} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
