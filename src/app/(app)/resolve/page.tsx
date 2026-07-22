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
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status-badge";
import { RulesView } from "@/components/policies/rules-view";
import { assignmentsApi, type ResolveParams } from "@/lib/resources";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { formatDate, humanizePolicyType, toDateInput, US_STATES } from "@/lib/format";

export default function ResolvePage() {
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
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
      <PageHeader
        title="Resolve rules"
        description="Answer “which rules apply to this worker on this date?” — the core read the timesheet/pay engine consumes."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Query</CardTitle>
          <CardDescription>Specificity order: employee &gt; paygroup &gt; location &gt; department &gt; state, tie-broken by priority.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isPlatformAdmin ? (
              <div className="space-y-1.5">
                <Label htmlFor="rClient">Client</Label>
                <NativeSelect id="rClient" value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
              <Label htmlFor="rEmployee">Employee ID</Label>
              <Input id="rEmployee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="emp-1001" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rDate">Date</Label>
              <Input id="rDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rState">State</Label>
              <NativeSelect id="rState" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">— none —</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rPaygroup">Paygroup ID</Label>
              <Input id="rPaygroup" value={paygroupId} onChange={(e) => setPaygroupId(e.target.value)} placeholder="optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rLocation">Location ID</Label>
              <Input id="rLocation" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rDepartment">Department ID</Label>
              <Input id="rDepartment" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} placeholder="optional" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={resolve.isPending || !clientId || !employeeId}>
                {resolve.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                Resolve
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {notFound ? (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>No assignment resolves</AlertTitle>
          <AlertDescription>No active assignment matches that worker on that date. Try a different date or add an assignment.</AlertDescription>
        </Alert>
      ) : resolve.isError ? (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>Couldn&apos;t resolve</AlertTitle>
          <AlertDescription>{resolve.error instanceof ApiError ? resolve.error.message : "Something went wrong"}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheckIcon className="size-4 text-primary" />
                Resolved: {result.ruleGroup.name}
              </CardTitle>
              <CardDescription>
                Matched via {result.assignment.targetType.toLowerCase()} ({result.assignment.targetIds.join(", ")}) · priority{" "}
                {result.assignment.priority} · {result.consideredAssignments} candidate
                {result.consideredAssignments === 1 ? "" : "s"} considered
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/rule-groups/${result.ruleGroup.ruleGroupId}`} className="text-primary hover:underline">
                Rule group v{result.ruleGroup.version}
              </Link>
              <span className="text-muted-foreground">· effective {formatDate(result.ruleGroup.effectiveFrom)}</span>
            </CardContent>
          </Card>

          {result.unresolvedRefs.length > 0 ? (
            <Alert>
              <AlertTriangleIcon />
              <AlertTitle>Incomplete rule set</AlertTitle>
              <AlertDescription>
                {result.unresolvedRefs.length} policy reference{result.unresolvedRefs.length === 1 ? "" : "s"} could not be resolved for this
                date ({result.unresolvedRefs.map((r) => humanizePolicyType(r.policyType)).join(", ")}). A pay engine should treat this as an error.
              </AlertDescription>
            </Alert>
          ) : null}

          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Effective policies ({result.policies.length})
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
                      {humanizePolicyType(policy.policyType)} · {policy.scope === "global" ? "Global" : "Client"}
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
