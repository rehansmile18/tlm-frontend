"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { auditLogsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/types";

const PAGE_SIZE = 30;

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const params = { entityType: entityType || undefined, entityId: entityId || undefined, page, pageSize: PAGE_SIZE };
  const query = useQuery({
    queryKey: queryKeys.auditLogs(params),
    queryFn: () => auditLogsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Audit logs" description="Append-only trail of policy, rule-group, and assignment changes across all clients." />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <NativeSelect
            aria-label="Filter by entity type"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All entities</option>
            <option value="policy">Policy</option>
            <option value="ruleGroup">Rule group</option>
            <option value="assignment">Assignment</option>
          </NativeSelect>
          <Input
            placeholder="Filter by entity ID"
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No audit entries" description="Nothing matches these filters." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <TableRow key={log._id} className="cursor-pointer" onClick={() => setSelected(log)}>
                    <TableCell className="text-muted-foreground">{formatDateTime(log.timestamp)}</TableCell>
                    <TableCell className="capitalize">{log.entityType}</TableCell>
                    <TableCell>
                      <StatusBadge tone="info">{log.action}</StatusBadge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.entityId.slice(0, 12)}…</TableCell>
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

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selected?.action} · {selected?.entityType}
            </DialogTitle>
            <DialogDescription>{selected ? formatDateTime(selected.timestamp) : ""}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Before</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 text-xs">
                {selected?.before ? JSON.stringify(selected.before, null, 2) : "—"}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">After</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 text-xs">
                {selected?.after ? JSON.stringify(selected.after, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
