"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CopyIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState, humanizeError } from "@/components/data-state";
import { RulesView } from "@/components/policies/rules-view";
import { PolicyFormDialog } from "@/components/policies/policy-form-dialog";
import { policiesApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { usePolicyTypes, useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { formatDate, formatDateTime, humanizePolicyType, policyStatusTone } from "@/lib/format";
import type { Policy } from "@/lib/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default function PolicyDetailPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canWrite, isPlatformAdmin, clientId: ownClientId } = useRole();
  const policyTypes = usePolicyTypes();
  const clients = useClients();

  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneClientId, setCloneClientId] = useState(ownClientId ?? "");

  const policyQuery = useQuery({ queryKey: queryKeys.policy(policyId), queryFn: () => policiesApi.get(policyId) });
  const versionsQuery = useQuery({ queryKey: queryKeys.policyVersions(policyId), queryFn: () => policiesApi.versions(policyId) });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["policy", policyId] });
    queryClient.invalidateQueries({ queryKey: ["policy-versions", policyId] });
    queryClient.invalidateQueries({ queryKey: ["policies"] });
  }

  const action = useMutation({
    mutationFn: (v: { label: string; run: () => Promise<Policy> }) => v.run(),
    onSuccess: (_data, v) => {
      toast.success(v.label);
      invalidate();
    },
    onError: (error) => toast.error("Action failed", { description: humanizeError(error) }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => policiesApi.reject(policyId, rejectReason || undefined),
    onSuccess: () => {
      toast.success("Policy rejected");
      setRejectOpen(false);
      setRejectReason("");
      invalidate();
    },
    onError: (error) => toast.error("Couldn't reject", { description: humanizeError(error) }),
  });

  const cloneMutation = useMutation({
    mutationFn: () => policiesApi.clone(policyId, cloneClientId),
    onSuccess: (created) => {
      toast.success("Cloned into a client draft");
      setCloneOpen(false);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      router.push(`/policies/${created.policyId}`);
    },
    onError: (error) => toast.error("Couldn't clone", { description: humanizeError(error) }),
  });

  if (policyQuery.isError) return <ErrorState error={policyQuery.error} onRetry={() => policyQuery.refetch()} />;
  if (policyQuery.isLoading || !policyQuery.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const policy = policyQuery.data;
  const status = policy.status;
  const busy = action.isPending;
  const versions = versionsQuery.data?.items ?? [];

  return (
    <>
      <Link href="/policies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        Back to policies
      </Link>

      <PageHeader
        title={policy.name}
        description={`${humanizePolicyType(policy.policyType)} · ${policy.scope === "global" ? "Global" : "Client-specific"} · v${policy.version}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={policyStatusTone(status)}>{status.replace(/_/g, " ")}</StatusBadge>
            {canWrite && status === "draft" && policy.scope === "client" ? (
              <Button size="sm" disabled={busy} onClick={() => action.mutate({ label: "Policy published", run: () => policiesApi.publish(policyId) })}>
                Publish
              </Button>
            ) : null}
            {canWrite && status === "draft" && policy.scope === "global" ? (
              <Button size="sm" disabled={busy} onClick={() => action.mutate({ label: "Submitted for approval", run: () => policiesApi.submit(policyId) })}>
                Submit for approval
              </Button>
            ) : null}
            {isPlatformAdmin && status === "pending_approval" ? (
              <>
                <Button size="sm" disabled={busy} onClick={() => action.mutate({ label: "Policy approved", run: () => policiesApi.approve(policyId) })}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
              </>
            ) : null}
            {canWrite && (status === "draft" || status === "active") ? (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-3.5" />
                Edit
              </Button>
            ) : null}
            {canWrite && status === "active" ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => action.mutate({ label: "Policy archived", run: () => policiesApi.archive(policyId) })}>
                Archive
              </Button>
            ) : null}
            {canWrite ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCloneClientId(ownClientId ?? "");
                  setCloneOpen(true);
                }}
              >
                <CopyIcon className="size-3.5" />
                Clone
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <DetailRow label="Policy type">{humanizePolicyType(policy.policyType)}</DetailRow>
              <DetailRow label="Scope">{policy.scope === "global" ? "Global" : "Client"}</DetailRow>
              <DetailRow label="Jurisdiction">{policy.jurisdiction?.state ?? "Federal"}</DetailRow>
              <DetailRow label="Version">v{policy.version}</DetailRow>
              <DetailRow label="Effective from">{formatDate(policy.effectiveFrom)}</DetailRow>
              <DetailRow label="Effective to">{policy.effectiveTo ? formatDate(policy.effectiveTo) : "Open"}</DetailRow>
              <DetailRow label="Created">{formatDateTime(policy.metadata?.createdAt)}</DetailRow>
              <DetailRow label="Updated">{formatDateTime(policy.metadata?.updatedAt)}</DetailRow>
              {policy.metadata?.rejectionReason ? (
                <div className="col-span-2">
                  <DetailRow label="Rejection reason">
                    <span className="text-destructive">{policy.metadata.rejectionReason}</span>
                  </DetailRow>
                </div>
              ) : null}
            </dl>
            {policy.description ? <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{policy.description}</p> : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <RulesView value={policy.rules} />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="p-4">
          <CardTitle className="text-base">Version history</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead>Effective to</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {versionsQuery.isLoading ? "Loading…" : "No versions"}
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell className="text-right tabular-nums">v{v.version}</TableCell>
                    <TableCell>
                      <StatusBadge tone={policyStatusTone(v.status)}>{v.status.replace(/_/g, " ")}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(v.effectiveFrom)}</TableCell>
                    <TableCell className="text-muted-foreground">{v.effectiveTo ? formatDate(v.effectiveTo) : "Open"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(v.metadata?.updatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PolicyFormDialog open={editOpen} onOpenChange={setEditOpen} policy={policy} policyTypes={policyTypes.data?.policyTypes ?? []} />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject policy</DialogTitle>
            <DialogDescription>Send it back to draft. Add an optional reason for the author.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" rows={3} />
          <DialogFooter>
            <Button variant="destructive" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
              {rejectMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone into a client policy</DialogTitle>
            <DialogDescription>Creates a client-owned draft copy you can customize independently.</DialogDescription>
          </DialogHeader>
          {isPlatformAdmin ? (
            <div className="space-y-1.5">
              <Label htmlFor="cloneClient">Target client</Label>
              <NativeSelect id="cloneClient" value={cloneClientId} onChange={(e) => setCloneClientId(e.target.value)}>
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
          ) : (
            <p className="text-sm text-muted-foreground">This will be cloned into your client.</p>
          )}
          <DialogFooter>
            <Button disabled={cloneMutation.isPending || !cloneClientId} onClick={() => cloneMutation.mutate()}>
              {cloneMutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
