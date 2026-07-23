"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RuleGroupFormDialog } from "@/components/rule-groups/rule-group-form-dialog";
import { ruleGroupsApi, type RuleGroupListParams } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useRole } from "@/lib/auth";
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";
import { ruleGroupStatusTone } from "@/lib/format";
import { RULE_GROUP_STATUSES, type RuleGroup } from "@/lib/types";

export default function RuleGroupsPage() {
  const router = useRouter();
  const { canWrite } = useRole();
  const { formatDate } = useDateFormat();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<RuleGroupListParams["status"] | "">("");

  const params: RuleGroupListParams = { status: status || undefined, pageSize: 200 };
  const query = useQuery({
    queryKey: queryKeys.ruleGroups(params),
    queryFn: () => ruleGroupsApi.list(params),
    placeholderData: keepPreviousData,
  });

  // The API returns every version; collapse to the latest version per logical rule group.
  const latest = useMemo(() => {
    const byId = new Map<string, RuleGroup>();
    for (const rg of query.data?.items ?? []) {
      const existing = byId.get(rg.ruleGroupId);
      if (!existing || rg.version > existing.version) byId.set(rg.ruleGroupId, rg);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [query.data]);

  return (
    <>
      <PageHeader
        title={t("ruleGroups.title")}
        description={t("ruleGroups.description")}
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              {t("ruleGroups.newRuleGroup")}
            </Button>
          ) : null
        }
      />

      <Card className="p-4">
        <Combobox
          aria-label={t("ruleGroups.filterByStatus")}
          wrapperClassName="sm:max-w-48"
          value={status ?? ""}
          onValueChange={(value) => setStatus((value || "") as RuleGroupListParams["status"] | "")}
        >
          <ComboboxItem value="">{t("ruleGroups.allStatuses")}</ComboboxItem>
          {RULE_GROUP_STATUSES.map((s) => (
            <ComboboxItem key={s} value={s}>
              {t(`ruleGroupStatus.${s}`)}
            </ComboboxItem>
          ))}
        </Combobox>
      </Card>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <EmptyState
          title={t("ruleGroups.noneFound")}
          description={canWrite ? t("ruleGroups.noneFoundHint") : t("common.nothingToShow")}
          action={
            canWrite ? (
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4" />
                {t("ruleGroups.newRuleGroup")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ruleGroups.colName")}</TableHead>
                  <TableHead className="text-end">{t("ruleGroups.colVersion")}</TableHead>
                  <TableHead>{t("ruleGroups.colStatus")}</TableHead>
                  <TableHead className="text-end">{t("ruleGroups.colPolicies")}</TableHead>
                  <TableHead>{t("ruleGroups.colEffective")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest.map((rg) => (
                  <TableRow key={rg._id} className="cursor-pointer" onClick={() => router.push(`/rule-groups/${rg.ruleGroupId}`)}>
                    <TableCell className="font-medium">{rg.name}</TableCell>
                    <TableCell className="text-end tabular-nums">v{rg.version}</TableCell>
                    <TableCell>
                      <StatusBadge tone={ruleGroupStatusTone(rg.status)}>{t(`ruleGroupStatus.${rg.status}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{rg.policyRefs.length}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(rg.effectiveFrom)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <RuleGroupFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
