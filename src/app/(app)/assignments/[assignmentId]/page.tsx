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
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";
import { assignmentStatusTone } from "@/lib/format";

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
  const { formatDate } = useDateFormat();
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);

  const query = useQuery({ queryKey: queryKeys.assignment(assignmentId), queryFn: () => assignmentsApi.get(assignmentId) });
  const ruleGroupsQuery = useQuery({
    queryKey: queryKeys.ruleGroups({ pageSize: 200, for: "assignment-detail" }),
    queryFn: () => ruleGroupsApi.list({ pageSize: 200 }),
  });

  const deactivate = useMutation({
    mutationFn: () => assignmentsApi.update(assignmentId, { status: "expired" }),
    onSuccess: () => {
      toast.success(t("assignments.toastDeactivated"));
      queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (error) => toast.error(t("assignments.couldntDeactivate"), { description: humanizeError(error) }),
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
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("assignments.backToAssignments")}
      </Link>

      <PageHeader
        title={ruleGroupName ?? t("assignments.unnamed")}
        description={`${t(`targetTypes.${a.targetType}`)} · ${a.targetIds.length} ${t("assignments.targetsInline")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={assignmentStatusTone(a.status)}>{t(`assignmentStatus.${a.status}`)}</StatusBadge>
            {canWrite ? (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-3.5" />
                {t("common.edit")}
              </Button>
            ) : null}
            {canWrite && a.status !== "expired" ? (
              <Button size="sm" variant="outline" disabled={deactivate.isPending} onClick={() => deactivate.mutate()}>
                {t("assignments.deactivate")}
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("assignments.details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <DetailRow label={t("assignments.ruleGroup")}>
              <Link href={`/rule-groups/${a.ruleGroupId}`} className="text-primary hover:underline">
                {ruleGroupName ?? <span className="font-mono text-xs">{a.ruleGroupId.slice(0, 8)}…</span>}
              </Link>
            </DetailRow>
            <DetailRow label={t("assignments.targetType")}>{t(`targetTypes.${a.targetType}`)}</DetailRow>
            <DetailRow label={t("assignments.priority")}>{a.priority}</DetailRow>
            <DetailRow label={t("common.effectiveFrom")}>{formatDate(a.effectiveFrom)}</DetailRow>
            <DetailRow label={t("common.effectiveTo")}>{a.effectiveTo ? formatDate(a.effectiveTo) : t("assignments.open")}</DetailRow>
            <DetailRow label={t("assignments.status")}>{t(`assignmentStatus.${a.status}`)}</DetailRow>
            <div className="col-span-2 sm:col-span-3">
              <DetailRow label={t("assignments.population")}>
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
