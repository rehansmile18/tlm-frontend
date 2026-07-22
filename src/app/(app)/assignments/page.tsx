"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PlusIcon, ShieldCheckIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignmentFormDialog } from "@/components/assignments/assignment-form-dialog";
import { assignmentsApi, ruleGroupsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useRole } from "@/lib/auth";
import { assignmentStatusTone, formatDate } from "@/lib/format";

export default function AssignmentsPage() {
  const router = useRouter();
  const { canWrite } = useRole();
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.assignments({ pageSize: 200 }),
    queryFn: () => assignmentsApi.list({ pageSize: 200 }),
    placeholderData: keepPreviousData,
  });
  const ruleGroupsQuery = useQuery({
    queryKey: queryKeys.ruleGroups({ pageSize: 200, for: "assignment-names" }),
    queryFn: () => ruleGroupsApi.list({ pageSize: 200 }),
  });

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const rg of ruleGroupsQuery.data?.items ?? []) map.set(rg.ruleGroupId, rg.name);
    return map;
  }, [ruleGroupsQuery.data]);

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Bindings of rule groups to employee, paygroup, location, department, or state populations."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/resolve" />}>
              <ShieldCheckIcon className="size-4" />
              Resolve
            </Button>
            {canWrite ? (
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4" />
                New assignment
              </Button>
            ) : null}
          </div>
        }
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description={canWrite ? "Assign a rule group to a population to make it resolvable." : "Nothing to show."}
          action={canWrite ? <Button onClick={() => setDialogOpen(true)}><PlusIcon className="size-4" />New assignment</Button> : undefined}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule group</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Population</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a._id} className="cursor-pointer" onClick={() => router.push(`/assignments/${a._id}`)}>
                    <TableCell className="font-medium">
                      {nameById.get(a.ruleGroupId) ?? <span className="font-mono text-xs">{a.ruleGroupId.slice(0, 8)}…</span>}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{a.targetType.toLowerCase()}</TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">{a.targetIds.join(", ")}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.priority}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(a.effectiveFrom)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={assignmentStatusTone(a.status)}>{a.status}</StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AssignmentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
