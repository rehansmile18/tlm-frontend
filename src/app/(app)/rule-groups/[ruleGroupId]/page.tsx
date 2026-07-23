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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ErrorState, humanizeError } from "@/components/data-state";
import { RuleGroupFormDialog } from "@/components/rule-groups/rule-group-form-dialog";
import { policiesApi, ruleGroupsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useRole } from "@/lib/auth";
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";
import { ruleGroupStatusTone } from "@/lib/format";
import type { RuleGroup } from "@/lib/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default function RuleGroupDetailPage() {
  const { ruleGroupId } = useParams<{ ruleGroupId: string }>();
  const queryClient = useQueryClient();
  const { canWrite } = useRole();
  const { formatDate, formatDateTime } = useDateFormat();
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);

  const rgQuery = useQuery({ queryKey: queryKeys.ruleGroup(ruleGroupId), queryFn: () => ruleGroupsApi.get(ruleGroupId) });
  const policiesQuery = useQuery({
    queryKey: queryKeys.policies({ status: "active", pageSize: 200, for: "rulegroup-detail" }),
    queryFn: () => policiesApi.list({ status: "active", pageSize: 200 }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["rule-group", ruleGroupId] });
    queryClient.invalidateQueries({ queryKey: ["rule-groups"] });
  }

  const action = useMutation({
    mutationFn: (v: { label: string; run: () => Promise<RuleGroup> }) => v.run(),
    onSuccess: (_data, v) => {
      toast.success(v.label);
      invalidate();
    },
    onError: (error) => toast.error(t("policies.actionFailed"), { description: humanizeError(error) }),
  });

  if (rgQuery.isError) return <ErrorState error={rgQuery.error} onRetry={() => rgQuery.refetch()} />;
  if (rgQuery.isLoading || !rgQuery.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const rg = rgQuery.data;
  const nameById = new Map((policiesQuery.data?.items ?? []).map((p) => [p.policyId, p.name] as const));
  const busy = action.isPending;

  return (
    <>
      <Link href="/rule-groups" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("ruleGroups.backToRuleGroups")}
      </Link>

      <PageHeader
        title={rg.name}
        description={`v${rg.version} · ${rg.policyRefs.length} ${t("ruleGroups.colPolicies").toLowerCase()}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={ruleGroupStatusTone(rg.status)}>{t(`ruleGroupStatus.${rg.status}`)}</StatusBadge>
            {canWrite && rg.status === "draft" ? (
              <Button size="sm" disabled={busy} onClick={() => action.mutate({ label: t("common.publish"), run: () => ruleGroupsApi.publish(ruleGroupId) })}>
                {t("common.publish")}
              </Button>
            ) : null}
            {canWrite && rg.status === "active" ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <PencilIcon className="size-3.5" />
                  {t("common.edit")}
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => action.mutate({ label: t("common.archive"), run: () => ruleGroupsApi.archive(ruleGroupId) })}>
                  {t("common.archive")}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ruleGroups.details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <DetailRow label={t("common.version")}>v{rg.version}</DetailRow>
            <DetailRow label={t("common.effectiveFrom")}>{formatDate(rg.effectiveFrom)}</DetailRow>
            <DetailRow label={t("common.effectiveTo")}>{rg.effectiveTo ? formatDate(rg.effectiveTo) : "—"}</DetailRow>
            <DetailRow label={t("common.updatedAt")}>{formatDateTime(rg.metadata?.updatedAt)}</DetailRow>
          </dl>
          {rg.description ? <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{rg.description}</p> : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="p-4">
          <CardTitle className="text-base">{t("ruleGroups.policiesInGroup")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("ruleGroups.appliedInOrderReadOnly")}</p>
        </CardHeader>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-end">{t("ruleGroups.colSequence")}</TableHead>
                <TableHead>{t("ruleGroups.colPolicy")}</TableHead>
                <TableHead>{t("ruleGroups.colType")}</TableHead>
                <TableHead>{t("ruleGroups.colVersionPin")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rg.policyRefs.map((ref, index) => (
                <TableRow key={`${ref.policyId}-${ref.policyType}`}>
                  <TableCell className="text-end tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/policies/${ref.policyId}`} className="hover:underline">
                      {nameById.get(ref.policyId) ?? <span className="font-mono text-xs">{ref.policyId.slice(0, 8)}…</span>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t(`policyTypes.${ref.policyType}`)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ref.versionPin === "latest" ? t("ruleGroups.latestActive") : t("ruleGroups.pinnedVersion", { version: ref.versionPin })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <RuleGroupFormDialog open={editOpen} onOpenChange={setEditOpen} ruleGroup={rg} />
    </>
  );
}
