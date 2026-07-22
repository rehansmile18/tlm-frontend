"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState, humanizeError } from "@/components/data-state";
import { AssignmentEditDialog } from "@/components/assignments/assignment-edit-dialog";
import { assignmentsApi, ruleGroupsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useRole } from "@/lib/auth";
import { assignmentStatusTone, formatDate } from "@/lib/format";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const queryClient = useQueryClient();
  const { canWrite } = useRole();
  const [editOpen, setEditOpen] = useState(false);

  const query = useQuery({ queryKey: queryKeys.assignment(assignmentId), queryFn: () => assignmentsApi.get(assignmentId) });
  const ruleGroupsQuery = useQuery({
    queryKey: queryKeys.ruleGroups({ pageSize: 200, for: "assignment-detail" }),
    queryFn: () => ruleGroupsApi.list({ pageSize: 200 }),
  });

  const deactivate = useMutation({
    mutationFn: () => assignmentsApi.update(assignmentId, { status: "expired" }),
    onSuccess: () => {
      toast.success("Assignment deactivated");
      queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (error) => toast.error("Couldn't deactivate", { description: humanizeError(error) }),
  });

  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.isLoading || !query.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const a = query.data;
  const ruleGroupName = (ruleGroupsQuery.data?.items ?? []).find((rg) => rg.ruleGroupId === a.ruleGroupId)?.name;

  return (
    <>
      <Link href="/assignments" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        Back to assignments
      </Link>

      <PageHeader
        title={ruleGroupName ?? "Assignment"}
        description={`${a.targetType.toLowerCase()} · ${a.targetIds.length} target${a.targetIds.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={assignmentStatusTone(a.status)}>{a.status}</StatusBadge>
            {canWrite ? (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-3.5" />
                Edit
              </Button>
            ) : null}
            {canWrite && a.status !== "expired" ? (
              <Button size="sm" variant="outline" disabled={deactivate.isPending} onClick={() => deactivate.mutate()}>
                Deactivate
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <DetailRow label="Rule group">
              <Link href={`/rule-groups/${a.ruleGroupId}`} className="text-primary hover:underline">
                {ruleGroupName ?? <span className="font-mono text-xs">{a.ruleGroupId.slice(0, 8)}…</span>}
              </Link>
            </DetailRow>
            <DetailRow label="Target type">{a.targetType.charAt(0) + a.targetType.slice(1).toLowerCase()}</DetailRow>
            <DetailRow label="Priority">{a.priority}</DetailRow>
            <DetailRow label="Effective from">{formatDate(a.effectiveFrom)}</DetailRow>
            <DetailRow label="Effective to">{a.effectiveTo ? formatDate(a.effectiveTo) : "Open"}</DetailRow>
            <DetailRow label="Status">{a.status}</DetailRow>
            <div className="col-span-2 sm:col-span-3">
              <DetailRow label="Population">
                <div className="flex flex-wrap gap-1.5">
                  {a.targetIds.map((id) => (
                    <span key={id} className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                      {id}
                    </span>
                  ))}
                </div>
              </DetailRow>
            </div>
          </dl>
        </CardContent>
      </Card>

      <AssignmentEditDialog open={editOpen} onOpenChange={setEditOpen} assignment={a} />
    </>
  );
}
