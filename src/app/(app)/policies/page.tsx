"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PolicyFormDialog } from "@/components/policies/policy-form-dialog";
import { policiesApi, type PolicyListParams } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { usePolicyTypes } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { formatDate, humanizePolicyType, policyStatusTone, US_STATES } from "@/lib/format";
import { POLICY_STATUSES, POLICY_TYPES } from "@/lib/types";

const PAGE_SIZE = 25;

export default function PoliciesPage() {
  const router = useRouter();
  const { canWrite } = useRole();
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
        title="Policies"
        description="Global (statutory) and client-specific compliance policies, effective-dated and versioned."
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              New policy
            </Button>
          ) : null
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NativeSelect
            aria-label="Filter by type"
            value={filters.policyType ?? ""}
            onChange={(e) => updateFilter({ policyType: (e.target.value || undefined) as PolicyListParams["policyType"] })}
          >
            <option value="">All types</option>
            {POLICY_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanizePolicyType(t)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filter by scope"
            value={filters.scope ?? ""}
            onChange={(e) => updateFilter({ scope: (e.target.value || undefined) as PolicyListParams["scope"] })}
          >
            <option value="">All scopes</option>
            <option value="global">Global</option>
            <option value="client">Client</option>
          </NativeSelect>
          <NativeSelect
            aria-label="Filter by status"
            value={filters.status ?? ""}
            onChange={(e) => updateFilter({ status: (e.target.value || undefined) as PolicyListParams["status"] })}
          >
            <option value="">All statuses</option>
            {POLICY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filter by state"
            value={filters.state ?? ""}
            onChange={(e) => updateFilter({ state: e.target.value || undefined })}
          >
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code}
              </option>
            ))}
          </NativeSelect>
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
          title="No policies found"
          description={canWrite ? "Create your first policy to get started." : "Nothing matches these filters."}
          action={canWrite ? <Button onClick={() => setDialogOpen(true)}><PlusIcon className="size-4" />New policy</Button> : undefined}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective</TableHead>
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
                    <TableCell className="text-muted-foreground">{humanizePolicyType(policy.policyType)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{policy.scope}</TableCell>
                    <TableCell className="text-muted-foreground">{policy.jurisdiction?.state ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">v{policy.version}</TableCell>
                    <TableCell>
                      <StatusBadge tone={policyStatusTone(policy.status)}>{policy.status.replace(/_/g, " ")}</StatusBadge>
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
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <PolicyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} policyTypes={policyTypes.data?.policyTypes ?? []} />
    </>
  );
}
