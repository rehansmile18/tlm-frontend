"use client";

import { useState } from "react";
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
import { PolicyFormDialog } from "@/components/policies/policy-form-dialog";
import { policiesApi, type PolicyListParams } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { usePolicyTypes } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";
import { policyStatusTone, US_STATES } from "@/lib/format";
import { POLICY_STATUSES, POLICY_TYPES } from "@/lib/types";

const PAGE_SIZE = 25;

export default function PoliciesPage() {
  const router = useRouter();
  const { canWrite } = useRole();
  const { formatDate } = useDateFormat();
  const { t } = useTranslation();
  const policyTypes = usePolicyTypes();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [filters, setFilters] = useState<PolicyListParams>({});
  const [page, setPage] = useState(1);

  const params: PolicyListParams = { ...filters, page, pageSize: PAGE_SIZE };
  const query = useQuery({
    queryKey: queryKeys.policies(params),
    queryFn: () => policiesApi.list(params),
    placeholderData: keepPreviousData,
  });

  function updateFilter(patch: Partial<PolicyListParams>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title={t("policies.title")}
        description={t("policies.description")}
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              {t("policies.newPolicy")}
            </Button>
          ) : null
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Combobox
            aria-label={t("policies.filterByType")}
            value={filters.policyType ?? ""}
            onValueChange={(value) => updateFilter({ policyType: (value || undefined) as PolicyListParams["policyType"] })}
          >
            <ComboboxItem value="">{t("policies.allTypes")}</ComboboxItem>
            {POLICY_TYPES.map((policyType) => (
              <ComboboxItem key={policyType} value={policyType}>
                {t(`policyTypes.${policyType}`)}
              </ComboboxItem>
            ))}
          </Combobox>
          <Combobox
            aria-label={t("policies.filterByScope")}
            value={filters.scope ?? ""}
            onValueChange={(value) => updateFilter({ scope: (value || undefined) as PolicyListParams["scope"] })}
          >
            <ComboboxItem value="">{t("policies.allScopes")}</ComboboxItem>
            <ComboboxItem value="global">{t("policies.global")}</ComboboxItem>
            <ComboboxItem value="client">{t("policies.client")}</ComboboxItem>
          </Combobox>
          <Combobox
            aria-label={t("policies.filterByStatus")}
            value={filters.status ?? ""}
            onValueChange={(value) => updateFilter({ status: (value || undefined) as PolicyListParams["status"] })}
          >
            <ComboboxItem value="">{t("policies.allStatuses")}</ComboboxItem>
            {POLICY_STATUSES.map((status) => (
              <ComboboxItem key={status} value={status}>
                {t(`policyStatus.${status}`)}
              </ComboboxItem>
            ))}
          </Combobox>
          <Combobox
            aria-label={t("policies.filterByState")}
            value={filters.state ?? ""}
            onValueChange={(value) => updateFilter({ state: value || undefined })}
          >
            <ComboboxItem value="">{t("policies.allStates")}</ComboboxItem>
            {US_STATES.map((s) => (
              <ComboboxItem key={s.code} value={s.code}>
                {s.code}
              </ComboboxItem>
            ))}
          </Combobox>
        </div>
      </Card>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("policies.noneFound")}
          description={canWrite ? t("policies.noneFoundHint") : t("policies.noneMatch")}
          action={
            canWrite ? (
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4" />
                {t("policies.newPolicy")}
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
                  <TableHead>{t("policies.colName")}</TableHead>
                  <TableHead>{t("policies.colType")}</TableHead>
                  <TableHead>{t("policies.colScope")}</TableHead>
                  <TableHead>{t("policies.colState")}</TableHead>
                  <TableHead className="text-end">{t("policies.colVersion")}</TableHead>
                  <TableHead>{t("policies.colStatus")}</TableHead>
                  <TableHead>{t("policies.colEffective")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((policy) => (
                  <TableRow
                    key={policy._id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/policies/${policy.policyId}`)}
                  >
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t(`policyTypes.${policy.policyType}`)}</TableCell>
                    <TableCell className="text-muted-foreground">{t(`policies.${policy.scope}`)}</TableCell>
                    <TableCell className="text-muted-foreground">{policy.jurisdiction?.state ?? "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">v{policy.version}</TableCell>
                    <TableCell>
                      <StatusBadge tone={policyStatusTone(policy.status)}>{t(`policyStatus.${policy.status}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(policy.effectiveFrom)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("common.pageOfTotal", { page, totalPages, total })}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("common.previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {t("common.next")}
            </Button>
          </div>
        </div>
      ) : null}

      <PolicyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} policyTypes={policyTypes.data?.policyTypes ?? []} />
    </>
  );
}
