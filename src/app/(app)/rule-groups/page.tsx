"use client";

import { useMemo, useState } from "react";
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
import { RuleGroupFormDialog } from "@/components/rule-groups/rule-group-form-dialog";
import { ruleGroupsApi, type RuleGroupListParams } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useRole } from "@/lib/auth";
import { formatDate, ruleGroupStatusTone } from "@/lib/format";
import { RULE_GROUP_STATUSES, type RuleGroup } from "@/lib/types";

export default function RuleGroupsPage() {
  const router = useRouter();
  const { canWrite } = useRole();
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
        title="Rule Groups"
        description="Named bundles of policies a client assigns to a workforce population."
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              New rule group
            </Button>
          ) : null
        }
      />

      <Card className="p-4">
        <NativeSelect
          aria-label="Filter by status"
          className="sm:max-w-48"
          value={status ?? ""}
          onChange={(e) => setStatus((e.target.value || "") as RuleGroupListParams["status"] | "")}
        >
          <option value="">All statuses</option>
          {RULE_GROUP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
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
          title="No rule groups yet"
          description={canWrite ? "Bundle a few policies into a reusable group." : "Nothing to show."}
          action={canWrite ? <Button onClick={() => setDialogOpen(true)}><PlusIcon className="size-4" />New rule group</Button> : undefined}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Policies</TableHead>
                  <TableHead>Effective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest.map((rg) => (
                  <TableRow key={rg._id} className="cursor-pointer" onClick={() => router.push(`/rule-groups/${rg.ruleGroupId}`)}>
                    <TableCell className="font-medium">{rg.name}</TableCell>
                    <TableCell className="text-right tabular-nums">v{rg.version}</TableCell>
                    <TableCell>
                      <StatusBadge tone={ruleGroupStatusTone(rg.status)}>{rg.status}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{rg.policyRefs.length}</TableCell>
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
